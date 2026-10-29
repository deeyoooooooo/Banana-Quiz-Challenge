const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { validateRegistration, validateLogin } = require("../services/validation");
const { requireAuth } = require("../middleware/requireAuth");
const { ensureCsrfToken } = require("../middleware/csrf");

function createAuthRouter(db) {
  const router = express.Router();

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many login attempts. Please wait and try again.",
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

  return router;
}

module.exports = { createAuthRouter };
