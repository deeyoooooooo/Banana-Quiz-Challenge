const { test, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { createTestApp, csrfAgent, withCsrf } = require("./helpers");

let app;

beforeEach(() => {
  ({ app } = createTestApp());
});

test("registers a user and creates a session", async () => {
  const { agent, csrfToken } = await csrfAgent(app);
  const response = await withCsrf(agent, csrfToken)
    .post("/api/auth/register")
    .send({
      username: "Ada Lovelace",
      email: "ada@example.com",
      password: "Secure123",
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.user.email, "ada@example.com");

  const me = await agent.get("/api/auth/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.user.username, "Ada Lovelace");
});

test("rejects duplicate email registration", async () => {
  const { agent, csrfToken } = await csrfAgent(app);
  const payload = {
    username: "First User",
    email: "dup@example.com",
    password: "Secure123",
  };
  await withCsrf(agent, csrfToken).post("/api/auth/register").send(payload);
  await agent.post("/api/auth/logout").set("x-csrf-token", csrfToken);
  const nextCsrf = await agent.get("/api/auth/csrf-token");

  const second = await withCsrf(agent, nextCsrf.body.csrfToken)
    .post("/api/auth/register")
    .send({ ...payload, username: "Second User" });

  assert.equal(second.status, 409);
  assert.match(second.body.error, /already exists/i);
});

test("rejects invalid registration input", async () => {
  const { agent, csrfToken } = await csrfAgent(app);
  const response = await withCsrf(agent, csrfToken)
    .post("/api/auth/register")
    .send({ username: "ab", email: "not-an-email", password: "short" });

  assert.equal(response.status, 400);
});

test("logs in with valid credentials and rejects invalid credentials", async () => {
  const { agent, csrfToken } = await csrfAgent(app);
  await withCsrf(agent, csrfToken).post("/api/auth/register").send({
    username: "Login User",
    email: "login@example.com",
    password: "Secure123",
  });
  await agent.post("/api/auth/logout").set("x-csrf-token", csrfToken);
  const nextCsrf = await agent.get("/api/auth/csrf-token");

  const bad = await withCsrf(agent, nextCsrf.body.csrfToken).post("/api/auth/login").send({
    email: "login@example.com",
    password: "WrongPass1",
  });
  assert.equal(bad.status, 401);

  const good = await withCsrf(agent, nextCsrf.body.csrfToken).post("/api/auth/login").send({
    email: "login@example.com",
    password: "Secure123",
  });
  assert.equal(good.status, 200);
  assert.equal(good.body.user.email, "login@example.com");
});

test("blocks unauthorized access to protected routes", async () => {
  const { agent, csrfToken } = await csrfAgent(app);

  const me = await agent.get("/api/auth/me");
  assert.equal(me.status, 401);

  const start = await agent
    .post("/api/quiz/start")
    .set("x-csrf-token", csrfToken);
  assert.equal(start.status, 401);

  const results = await agent.get("/api/quiz/results");
  assert.equal(results.status, 401);
});

test("logout destroys the session", async () => {
  const { agent, csrfToken } = await csrfAgent(app);
  await withCsrf(agent, csrfToken).post("/api/auth/register").send({
    username: "Logout User",
    email: "logout@example.com",
    password: "Secure123",
  });

  const logout = await agent
    .post("/api/auth/logout")
    .set("x-csrf-token", csrfToken);
  assert.equal(logout.status, 200);

  const me = await agent.get("/api/auth/me");
  assert.equal(me.status, 401);
});
