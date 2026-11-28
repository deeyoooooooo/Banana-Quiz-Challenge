const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { validateRegistration, validateLogin, validateEmailOnly, validatePasswordReset } = require("../services/validation");
const { requireAuth } = require("../middleware/requireAuth");
const { ensureCsrfToken } = require("../middleware/csrf");
const {
  createPasswordResetService,
  invalidateUserSessions,
} = require("../services/passwordReset");

const RESET_RESPONSE = {
  message:
    "If an account exists for that email, a password reset link has been created. In development, the link is printed in the server console.",
};

function createAuthRouter(db, options = {}) {
  const router = express.Router();

  const now = options.now || (() => Date.now());
  const nodeEnv = options.nodeEnv || "development";
  const frontendOrigin = options.frontendOrigin || "http://localhost:5173";
  const resetService = createPasswordResetService(db, {
    now,
    ttlMs: options.resetTokenTtlMs || 15 * 60 * 1000,
  });

  function deliverReset(details) {
    if (typeof options.deliverReset === "function") {
      options.deliverReset(details);
      return;
    }
    if (nodeEnv === "development") {
      console.info(
        `[password-reset] Development only. Do not use console delivery in production. Reset link: ${details.resetUrl}`
      );
    }
  }

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many login attempts. Please wait and try again.",
    },
  });

  const resetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many password reset attempts. Please wait and try again.",
    },
  });

  router.get("/csrf-token", (req, res) => {
    const csrfToken = ensureCsrfToken(req);
    res.json({ csrfToken });
  });

  router.post("/register", (req, res) => {
    const { errors, value } = validateRegistration(req.body || {});
    if (errors.length) {
      return res.status(400).json({ error: errors[0], details: errors });
    }

    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(value.email);
    if (existing) {
      return res.status(409).json({
        error: "An account with this email already exists.",
      });
    }

    const passwordHash = bcrypt.hashSync(value.password, 10);
    const createdAt = new Date().toISOString();

    try {
      const result = db
        .prepare(
          `INSERT INTO users (username, email, password_hash, created_at)
           VALUES (?, ?, ?, ?)`
        )
        .run(value.username, value.email, passwordHash, createdAt);

      req.session.user = {
        id: result.lastInsertRowid,
        username: value.username,
        email: value.email,
      };
      ensureCsrfToken(req);

      return res.status(201).json({
        message: "Registration successful.",
        user: req.session.user,
      });
    } catch (error) {
      return res.status(500).json({
        error: "Could not save the new account. Please try again.",
      });
    }
  });

  router.post("/login", loginLimiter, (req, res) => {
    const { errors, value } = validateLogin(req.body || {});
    if (errors.length) {
      return res.status(400).json({ error: errors[0], details: errors });
    }

    const user = db
      .prepare(
        "SELECT id, username, email, password_hash FROM users WHERE email = ?"
      )
      .get(value.email);

    const passwordOk =
      user && bcrypt.compareSync(value.password, user.password_hash);

    if (!passwordOk) {
      return res.status(401).json({
        error: "Invalid email or password.",
      });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };
    req.session.quiz = null;
    ensureCsrfToken(req);

    return res.json({
      message: "Login successful.",
      user: req.session.user,
    });
  });

  router.post("/logout", requireAuth, (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        return res.status(500).json({
          error: "Could not log out. Please try again.",
        });
      }
      res.clearCookie("connect.sid");
      return res.json({ message: "You have been logged out." });
    });
  });

  router.get("/me", requireAuth, (req, res) => {
    res.json({ user: req.session.user });
  });

  router.post("/forgot-password", resetLimiter, (req, res) => {
    const { errors, value } = validateEmailOnly(req.body || {});
    if (errors.length) {
      return res.status(400).json({ error: errors[0] });
    }

    const user = db.prepare("SELECT id FROM users WHERE email = ?").get(value.email);
    if (user) {
      const issued = resetService.issueToken(user.id);
      const resetUrl = `${frontendOrigin}/reset-password?token=${issued.token}`;
      deliverReset({
        email: value.email,
        resetUrl,
        token: issued.token,
        expiresAt: issued.expiresAt,
      });
    }

    return res.json(RESET_RESPONSE);
  });

  router.post("/reset-password", resetLimiter, (req, res) => {
    const { errors, value } = validatePasswordReset(req.body || {});
    if (errors.length) {
      return res.status(400).json({ error: errors[0] });
    }

    const match = resetService.findValidToken(value.token);
    if (!match) {
      return res.status(400).json({
        error: "This reset link is invalid or has expired.",
      });
    }

    const passwordHash = bcrypt.hashSync(value.password, 10);
    const consumed = resetService.consumeToken(match.id);
    if (!consumed) {
      return res.status(400).json({
        error: "This reset link is invalid or has expired.",
      });
    }

    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      passwordHash,
      match.userId
    );
    invalidateUserSessions(db, match.userId);
    if (req.session) {
      req.session.user = null;
      req.session.quiz = null;
    }

    return res.json({
      message: "Your password has been reset. You can log in with the new password.",
    });
  });

  return router;
}

module.exports = { createAuthRouter };
