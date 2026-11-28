const { test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { createTestApp, csrfAgent, withCsrf } = require("./helpers");

const GENERIC =
  /If an account exists for that email, a password reset link has been created/i;

async function register(agent, csrfToken, user) {
  const response = await withCsrf(agent, csrfToken).post("/api/auth/register").send(user);
  assert.equal(response.status, 201);
}

test("stores a hashed reset token and keeps it out of the API response", async () => {
  let delivered = null;
  const { app, db } = createTestApp(undefined, {
    deliverReset(details) {
      delivered = details;
    },
  });
  const { agent, csrfToken } = await csrfAgent(app);
  await register(agent, csrfToken, {
    username: "Reset User",
    email: "reset@example.com",
    password: "Secure123",
  });

  const response = await agent
    .post("/api/auth/forgot-password")
    .set("x-csrf-token", csrfToken)
    .send({ email: "reset@example.com" });

  assert.equal(response.status, 200);
  assert.match(response.body.message, GENERIC);
  assert.equal(response.body.token, undefined);
  assert.equal(JSON.stringify(response.body).includes(delivered.token), false);
  assert.match(delivered.resetUrl, /reset-password\?token=/);

  const row = db.prepare("SELECT token_hash, used_at FROM password_resets").get();
  assert.notEqual(row.token_hash, delivered.token);
  assert.equal(row.token_hash.length, 64);
  assert.equal(row.used_at, null);

  const user = db.prepare("SELECT password_hash FROM users WHERE email = ?").get("reset@example.com");
  assert.notEqual(user.password_hash, "Secure123");
  assert.equal(bcrypt.compareSync("Secure123", user.password_hash), true);
});

test("uses the same response when the email is not registered", async () => {
  let deliveries = 0;
  const { app } = createTestApp(undefined, {
    deliverReset() {
      deliveries += 1;
    },
  });
  const { agent, csrfToken } = await csrfAgent(app);
  const response = await agent
    .post("/api/auth/forgot-password")
    .set("x-csrf-token", csrfToken)
    .send({ email: "missing@example.com" });

  assert.equal(response.status, 200);
  assert.match(response.body.message, GENERIC);
  assert.equal(deliveries, 0);
  assert.equal(response.body.token, undefined);
});

test("resets the password, rejects reuse, and invalidates the old session", async () => {
  let delivered = null;
  const { app } = createTestApp(undefined, {
    deliverReset(details) {
      delivered = details;
    },
  });
  const first = await csrfAgent(app);
  await register(first.agent, first.csrfToken, {
    username: "Session User",
    email: "session@example.com",
    password: "Secure123",
  });

  const requester = await csrfAgent(app);
  const forgot = await requester.agent
    .post("/api/auth/forgot-password")
    .set("x-csrf-token", requester.csrfToken)
    .send({ email: "session@example.com" });
  assert.equal(forgot.status, 200);

  const reset = await requester.agent
    .post("/api/auth/reset-password")
    .set("x-csrf-token", requester.csrfToken)
    .send({ token: delivered.token, password: "NewPass123" });
  assert.equal(reset.status, 200);
  assert.match(reset.body.message, /password has been reset/i);
  assert.equal(reset.body.token, undefined);

  const reused = await requester.agent
    .post("/api/auth/reset-password")
    .set("x-csrf-token", requester.csrfToken)
    .send({ token: delivered.token, password: "OtherPass1" });
  assert.equal(reused.status, 400);

  const oldSession = await first.agent.get("/api/auth/me");
  assert.equal(oldSession.status, 401);

  const login = await requester.agent
    .post("/api/auth/login")
    .set("x-csrf-token", requester.csrfToken)
    .send({ email: "session@example.com", password: "NewPass123" });
  assert.equal(login.status, 200);

  const oldPassword = await requester.agent
    .post("/api/auth/logout")
    .set("x-csrf-token", requester.csrfToken);
  assert.equal(oldPassword.status, 200);
  const csrf = await requester.agent.get("/api/auth/csrf-token");
  const rejected = await requester.agent
    .post("/api/auth/login")
    .set("x-csrf-token", csrf.body.csrfToken)
    .send({ email: "session@example.com", password: "Secure123" });
  assert.equal(rejected.status, 401);
});

test("rejects an expired reset token", async () => {
  let currentTime = Date.parse("2026-06-01T12:00:00.000Z");
  let delivered = null;
  const { app } = createTestApp(undefined, {
    now: () => currentTime,
    deliverReset(details) {
      delivered = details;
    },
  });
  const { agent, csrfToken } = await csrfAgent(app);
  await register(agent, csrfToken, {
    username: "Expiry User",
    email: "expiry@example.com",
    password: "Secure123",
  });
  await agent
    .post("/api/auth/forgot-password")
    .set("x-csrf-token", csrfToken)
    .send({ email: "expiry@example.com" });

  currentTime += 16 * 60 * 1000;
  const response = await agent
    .post("/api/auth/reset-password")
    .set("x-csrf-token", csrfToken)
    .send({ token: delivered.token, password: "NewPass123" });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /invalid or has expired/i);

  const login = await agent
    .post("/api/auth/logout")
    .set("x-csrf-token", csrfToken);
  assert.equal(login.status, 200);
  const next = await agent.get("/api/auth/csrf-token");
  const stillOld = await agent
    .post("/api/auth/login")
    .set("x-csrf-token", next.body.csrfToken)
    .send({ email: "expiry@example.com", password: "Secure123" });
  assert.equal(stillOld.status, 200);
});

test("limits repeated password reset requests", async () => {
  const { app } = createTestApp();
  const { agent, csrfToken } = await csrfAgent(app);
  let last;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    last = await agent
      .post("/api/auth/forgot-password")
      .set("x-csrf-token", csrfToken)
      .send({ email: "nobody@example.com" });
  }
  assert.equal(last.status, 429);
});
