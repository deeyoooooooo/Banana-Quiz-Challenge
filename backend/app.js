const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { SqliteSessionStore } = require("./store/sqliteSessionStore");
const { csrfProtection } = require("./middleware/csrf");
const { createAuthRouter } = require("./routes/authRoutes");
const { createQuizRouter } = require("./routes/quizRoutes");
const { createBananaService } = require("./services/bananaService");

function createApp({ config, db, bananaService }) {
  const app = express();
  const banana = bananaService || createBananaService({
    url: config.bananaApiUrl,
    timeoutMs: config.bananaTimeoutMs,
  });

  app.disable("x-powered-by");
  if (config.nodeEnv === "production") {
    app.set("trust proxy", 1);
  }

  app.use(
    cors({
      origin: config.frontendOrigin,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "32kb" }));

  app.use(
    session({
      name: "connect.sid",
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      store: new SqliteSessionStore(db),
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.nodeEnv === "production",
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  app.use(csrfProtection);

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", createAuthRouter(db));
  app.use(
    "/api/quiz",
    createQuizRouter({
      db,
      bananaService: banana,
      questionsPerQuiz: config.questionsPerQuiz,
    })
  );

  app.use((req, res) => {
    res.status(404).json({ error: "Route not found." });
  });

  app.use((err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }
    return res.status(500).json({
      error: "An unexpected server error occurred.",
    });
  });

  return app;
}

module.exports = { createApp };
