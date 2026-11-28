const path = require("path");

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT || 3001),
    nodeEnv: env.NODE_ENV || "development",
    sessionSecret: env.SESSION_SECRET || "dev-only-change-me",
    frontendOrigin: env.FRONTEND_ORIGIN || "http://localhost:5173",
    bananaApiUrl:
      env.BANANA_API_URL ||
      "http://marcconrad.com/uob/banana/api.php?out=json",
    databasePath: env.DATABASE_PATH
      ? path.resolve(process.cwd(), env.DATABASE_PATH)
      : path.resolve(__dirname, "../../data/app.sqlite"),
    questionsPerQuiz: 5,
    bananaTimeoutMs: positiveNumber(env.BANANA_TIMEOUT_MS, 10000),
    resetTokenTtlMs: positiveNumber(env.RESET_TOKEN_MINUTES, 15) * 60 * 1000,
  };
}

module.exports = { loadConfig };
