const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const Database = require("better-sqlite3");
const { initDb } = require("../src/db");

test("adds result columns without dropping users or old scores", async () => {
  const file = path.join(
    os.tmpdir(),
    `banana-quiz-migration-${process.pid}-${Date.now()}.sqlite`
  );

  const legacy = new Database(file);
  legacy.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    INSERT INTO users (username, email, password_hash, created_at)
    VALUES ('Legacy', 'legacy@example.com', 'hash', '2026-01-01T00:00:00.000Z');
    INSERT INTO quiz_results (user_id, score, total_questions, created_at)
    VALUES (1, 3, 5, '2026-01-02T00:00:00.000Z');
  `);
  legacy.close();

  try {
    const migrated = initDb(file);
    const user = migrated.prepare("SELECT username FROM users").get();
    const result = migrated
      .prepare(
        "SELECT score, difficulty, max_score AS maxScore, correct_count AS correctCount FROM quiz_results"
      )
      .get();
    const columns = migrated
      .prepare("PRAGMA table_info(quiz_results)")
      .all()
      .map((row) => row.name);

    assert.equal(user.username, "Legacy");
    assert.equal(result.score, 3);
    assert.equal(result.difficulty, "easy");
    assert.equal(result.maxScore, 5);
    assert.equal(result.correctCount, 3);
    assert.ok(columns.includes("unanswered_count"));
    migrated.close();
  } finally {
    fs.rmSync(file, { force: true });
    fs.rmSync(`${file}-wal`, { force: true });
    fs.rmSync(`${file}-shm`, { force: true });
  }
});
