const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createTestApp, csrfAgent, withCsrf } = require("./helpers");

async function register(agent, csrfToken, user) {
  const response = await withCsrf(agent, csrfToken)
    .post("/api/auth/register")
    .send(user);
  assert.equal(response.status, 201);
  return response.body.user;
}

test("scores answers on the server and saves the result", async () => {
  const bananaService = {
    fetchPuzzle: async () => ({
      question: "https://example.com/puzzle.png",
      solution: 7,
    }),
  };
  const { app } = createTestApp(bananaService);
  const { agent, csrfToken } = await csrfAgent(app);
  await register(agent, csrfToken, {
    username: "Quiz User",
    email: "quiz@example.com",
    password: "Secure123",
  });

  const started = await agent
    .post("/api/quiz/start")
    .set("x-csrf-token", csrfToken);
  assert.equal(started.status, 200);
  assert.equal(started.body.puzzle.question, "https://example.com/puzzle.png");
  assert.equal(started.body.puzzle.solution, undefined);

  const first = await agent
    .post("/api/quiz/answer")
    .set("x-csrf-token", csrfToken)
    .send({ answer: 7 });
  assert.equal(first.status, 200);
  assert.equal(first.body.correct, true);
  assert.equal(first.body.completed, false);

  const second = await agent
    .post("/api/quiz/answer")
    .set("x-csrf-token", csrfToken)
    .send({ answer: 1 });
  assert.equal(second.status, 200);
  assert.equal(second.body.correct, false);
  assert.equal(second.body.completed, true);
  assert.equal(second.body.score, 1);
  assert.equal(second.body.answered, 2);

  const results = await agent.get("/api/quiz/results");
  assert.equal(results.status, 200);
  assert.equal(results.body.results.length, 1);
  assert.equal(results.body.results[0].score, 1);
});

test("rejects an arbitrary client-supplied score", async () => {
  const { app } = createTestApp();
  const { agent, csrfToken } = await csrfAgent(app);
  await register(agent, csrfToken, {
    username: "Score User",
    email: "score@example.com",
    password: "Secure123",
  });

  await agent.post("/api/quiz/start").set("x-csrf-token", csrfToken);
  const response = await agent
    .post("/api/quiz/answer")
    .set("x-csrf-token", csrfToken)
    .send({ answer: 4, score: 99 });

  assert.equal(response.status, 200);
  assert.equal(response.body.score, 1);
  assert.notEqual(response.body.score, 99);
});

test("a user cannot read another user's quiz result by changing the id", async () => {
  const { app } = createTestApp();

  const first = await csrfAgent(app);
  await register(first.agent, first.csrfToken, {
    username: "Owner",
    email: "owner@example.com",
    password: "Secure123",
  });
  await first.agent.post("/api/quiz/start").set("x-csrf-token", first.csrfToken);
  await first.agent
    .post("/api/quiz/answer")
    .set("x-csrf-token", first.csrfToken)
    .send({ answer: 4 });
  const completed = await first.agent
    .post("/api/quiz/answer")
    .set("x-csrf-token", first.csrfToken)
    .send({ answer: 4 });
  const resultId = completed.body.resultId;
  assert.ok(resultId);

  const second = await csrfAgent(app);
  await register(second.agent, second.csrfToken, {
    username: "Other",
    email: "other@example.com",
    password: "Secure123",
  });
  const stolen = await second.agent.get(`/api/quiz/results/${resultId}`);
  assert.equal(stolen.status, 404);

  const ownList = await second.agent.get("/api/quiz/results");
  assert.equal(ownList.body.results.length, 0);
});

test("returns a Banana API failure without exposing internals", async () => {
  const bananaService = {
    fetchPuzzle: async () => {
      const error = new Error("Banana API network failure");
      error.code = "BANANA_NETWORK";
      throw error;
    },
  };
  const { app } = createTestApp(bananaService);
  const { agent, csrfToken } = await csrfAgent(app);
  await register(agent, csrfToken, {
    username: "Api User",
    email: "api@example.com",
    password: "Secure123",
  });

  const response = await agent
    .post("/api/quiz/start")
    .set("x-csrf-token", csrfToken);

  assert.equal(response.status, 503);
  assert.match(response.body.error, /Banana API/i);
  assert.equal(response.body.stack, undefined);
});
