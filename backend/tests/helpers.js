const request = require("supertest");
const { loadConfig } = require("../src/config");
const { initDb } = require("../src/db");
const { createApp } = require("../src/app");

function createTestApp(bananaService) {
  const config = loadConfig({
    NODE_ENV: "test",
    SESSION_SECRET: "test-session-secret-value",
    FRONTEND_ORIGIN: "http://localhost:5173",
    BANANA_API_URL: "http://marcconrad.com/uob/banana/api.php?out=json",
  });
  config.questionsPerQuiz = 2;
  const db = initDb(":memory:");
  const app = createApp({
    config,
    db,
    bananaService: bananaService || {
      fetchPuzzle: async () => ({
        question: "https://example.com/mock-banana.png",
        solution: 4,
      }),
    },
  });
  return { app, db };
}

async function csrfAgent(app) {
  const agent = request.agent(app);
  const response = await agent.get("/api/auth/csrf-token");
  return { agent, csrfToken: response.body.csrfToken };
}

function withCsrf(agent, csrfToken) {
  return {
    post(url) {
      return agent.post(url).set("x-csrf-token", csrfToken);
    },
  };
}

module.exports = { createTestApp, csrfAgent, withCsrf };
