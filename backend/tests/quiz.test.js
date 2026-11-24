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

function assertNoSolution(body) {
  const json = JSON.stringify(body);
  assert.equal(body.puzzle?.solution, undefined);
  assert.doesNotMatch(json, /"solution"\s*:/);
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
    .set("x-csrf-token", csrfToken)
    .send({ difficulty: "easy" });
  assert.equal(started.status, 200);
  assert.equal(started.body.puzzle.question, "https://example.com/puzzle.png");
  assert.equal(started.body.puzzle.difficulty, "easy");
  assert.equal(started.body.puzzle.pointsPerCorrectAnswer, 10);
  assert.equal(started.body.puzzle.timeLimit, null);
  assertNoSolution(started.body);

  const first = await agent
    .post("/api/quiz/answer")
    .set("x-csrf-token", csrfToken)
    .send({ answer: 7 });
  assert.equal(first.status, 200);
  assert.equal(first.body.correct, true);
  assert.equal(first.body.completed, false);
  assert.equal(first.body.score, 10);
  assertNoSolution(first.body);

  const second = await agent
    .post("/api/quiz/answer")
    .set("x-csrf-token", csrfToken)
    .send({ answer: 1 });
  assert.equal(second.status, 200);
  assert.equal(second.body.correct, false);
  assert.equal(second.body.completed, true);
  assert.equal(second.body.score, 10);
  assert.equal(second.body.answered, 2);
  assert.equal(second.body.difficulty, "easy");
  assert.equal(second.body.correctCount, 1);
  assert.equal(second.body.incorrectCount, 1);

  const results = await agent.get("/api/quiz/results");
  assert.equal(results.status, 200);
  assert.equal(results.body.results.length, 1);
  assert.equal(results.body.results[0].score, 10);
  assert.equal(results.body.results[0].difficulty, "easy");
  assert.equal(results.body.results[0].maxScore, 20);
  assert.equal(results.body.stats.totalQuizzes, 1);
  assert.equal(results.body.stats.bestScore, 10);
});

test("rejects an arbitrary client-supplied score", async () => {
  const { app } = createTestApp();
  const { agent, csrfToken } = await csrfAgent(app);
  await register(agent, csrfToken, {
    username: "Score User",
    email: "score@example.com",
    password: "Secure123",
  });

  await agent
    .post("/api/quiz/start")
    .set("x-csrf-token", csrfToken)
    .send({ difficulty: "medium" });
  const response = await agent
    .post("/api/quiz/answer")
    .set("x-csrf-token", csrfToken)
    .send({ answer: 4, score: 99 });

  assert.equal(response.status, 200);
  assert.equal(response.body.score, 20);
  assert.notEqual(response.body.score, 99);
});

test("rejects an unknown difficulty value", async () => {
  const { app } = createTestApp();
  const { agent, csrfToken } = await csrfAgent(app);
  await register(agent, csrfToken, {
    username: "Mode User",
    email: "mode@example.com",
    password: "Secure123",
  });

  const response = await agent
    .post("/api/quiz/start")
    .set("x-csrf-token", csrfToken)
    .send({ difficulty: "extreme" });
  assert.equal(response.status, 400);
});

test("a user cannot read another user's quiz result by changing the id", async () => {
  const { app } = createTestApp();

  const first = await csrfAgent(app);
  await register(first.agent, first.csrfToken, {
    username: "Owner",
    email: "owner@example.com",
    password: "Secure123",
  });
  await first.agent
    .post("/api/quiz/start")
    .set("x-csrf-token", first.csrfToken)
    .send({ difficulty: "easy" });
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
  assert.equal(ownList.body.stats.totalQuizzes, 0);
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
    .set("x-csrf-token", csrfToken)
    .send({ difficulty: "easy" });

  assert.equal(response.status, 503);
  assert.match(response.body.error, /Banana API/i);
  assert.equal(response.body.stack, undefined);
});

test("rejects late medium-mode answers using the server deadline", async () => {
  let currentTime = 1_000_000;
  const { app } = createTestApp(undefined, { now: () => currentTime });
  const { agent, csrfToken } = await csrfAgent(app);
  await register(agent, csrfToken, {
    username: "Timer User",
    email: "timer@example.com",
    password: "Secure123",
  });

  const started = await agent
    .post("/api/quiz/start")
    .set("x-csrf-token", csrfToken)
    .send({ difficulty: "medium" });
  assert.equal(started.status, 200);
  assert.equal(started.body.puzzle.timeLimit, 30);
  assert.equal(started.body.puzzle.remainingMs, 30000);

  const earlyTimeout = await agent
    .post("/api/quiz/timeout")
    .set("x-csrf-token", csrfToken);
  assert.equal(earlyTimeout.status, 400);

  currentTime += 30001;
  const late = await agent
    .post("/api/quiz/answer")
    .set("x-csrf-token", csrfToken)
    .send({ answer: 4 });
  assert.equal(late.status, 200);
  assert.equal(late.body.timedOut, true);
  assert.equal(late.body.correct, false);
  assert.equal(late.body.score, 0);
  assert.equal(late.body.unansweredCount, 1);
});

test("difficult mode uses a 15 second server deadline and 30 points", async () => {
  let currentTime = 5_000_000;
  const { app } = createTestApp(undefined, { now: () => currentTime });
  const { agent, csrfToken } = await csrfAgent(app);
  await register(agent, csrfToken, {
    username: "Hard User",
    email: "hard@example.com",
    password: "Secure123",
  });

  const started = await agent
    .post("/api/quiz/start")
    .set("x-csrf-token", csrfToken)
    .send({ difficulty: "difficult" });
  assert.equal(started.body.puzzle.timeLimit, 15);
  assert.equal(started.body.puzzle.pointsPerCorrectAnswer, 30);
  assert.equal(started.body.puzzle.hintsEnabled, false);

  const hint = await agent.post("/api/quiz/hint").set("x-csrf-token", csrfToken);
  assert.equal(hint.status, 403);

  const onTime = await agent
    .post("/api/quiz/answer")
    .set("x-csrf-token", csrfToken)
    .send({ answer: 4 });
  assert.equal(onTime.status, 200);
  assert.equal(onTime.body.score, 30);

  currentTime += 15001;
  const timedOut = await agent
    .post("/api/quiz/timeout")
    .set("x-csrf-token", csrfToken);
  assert.equal(timedOut.status, 200);
  assert.equal(timedOut.body.timedOut, true);
  assert.equal(timedOut.body.completed, true);
  assert.equal(timedOut.body.score, 30);
  assert.equal(timedOut.body.unansweredCount, 1);
  assert.equal(timedOut.body.correctCount, 1);
});

test("easy mode has no timer and can return an even/odd hint", async () => {
  const bananaService = {
    fetchPuzzle: async () => ({
      question: "https://example.com/puzzle.png",
      solution: 6,
    }),
  };
  const { app } = createTestApp(bananaService);
  const { agent, csrfToken } = await csrfAgent(app);
  await register(agent, csrfToken, {
    username: "Hint User",
    email: "hint@example.com",
    password: "Secure123",
  });

  await agent
    .post("/api/quiz/start")
    .set("x-csrf-token", csrfToken)
    .send({ difficulty: "easy" });

  const hint = await agent.post("/api/quiz/hint").set("x-csrf-token", csrfToken);
  assert.equal(hint.status, 200);
  assert.match(hint.body.hint, /even/i);
  assert.doesNotMatch(JSON.stringify(hint.body), /"solution"\s*:/);
  assert.doesNotMatch(hint.body.hint, /6/);
});

test("repeated submissions do not increase the score", async () => {
  const { app } = createTestApp();
  const { agent, csrfToken } = await csrfAgent(app);
  await register(agent, csrfToken, {
    username: "Repeat User",
    email: "repeat@example.com",
    password: "Secure123",
  });

  await agent
    .post("/api/quiz/start")
    .set("x-csrf-token", csrfToken)
    .send({ difficulty: "easy" });
  const first = await agent
    .post("/api/quiz/answer")
    .set("x-csrf-token", csrfToken)
    .send({ answer: 4 });
  assert.equal(first.body.score, 10);

  const second = await agent
    .post("/api/quiz/answer")
    .set("x-csrf-token", csrfToken)
    .send({ answer: 4 });
  assert.equal(second.status, 200);
  assert.equal(second.body.score, 20);
  assert.equal(second.body.completed, true);

  const third = await agent
    .post("/api/quiz/answer")
    .set("x-csrf-token", csrfToken)
    .send({ answer: 4 });
  assert.equal(third.status, 404);
});

test("a five-question quiz finishes after five answers", async () => {
  const { app } = createTestApp(undefined, { questionsPerQuiz: 5 });
  const { agent, csrfToken } = await csrfAgent(app);
  await register(agent, csrfToken, {
    username: "Five User",
    email: "five@example.com",
    password: "Secure123",
  });

  await agent
    .post("/api/quiz/start")
    .set("x-csrf-token", csrfToken)
    .send({ difficulty: "easy" });

  let last;
  for (let i = 0; i < 5; i += 1) {
    last = await agent
      .post("/api/quiz/answer")
      .set("x-csrf-token", csrfToken)
      .send({ answer: 4 });
    assert.equal(last.status, 200);
  }
  assert.equal(last.body.completed, true);
  assert.equal(last.body.answered, 5);
  assert.equal(last.body.maxScore, 50);
  assert.equal(last.body.score, 50);
});

test("lists public difficulty rules without exposing solutions", async () => {
  const { app } = createTestApp(undefined, { questionsPerQuiz: 5 });
  const { agent } = await csrfAgent(app);
  const response = await agent.get("/api/quiz/difficulties");
  assert.equal(response.status, 200);
  assert.equal(response.body.difficulties.length, 3);
  assert.equal(response.body.difficulties[0].maxScore, 50);
});
