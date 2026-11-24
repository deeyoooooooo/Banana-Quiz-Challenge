const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

function tableColumns(db, tableName) {
  return db.prepare(`PRAGMA table_info(${tableName})`).all().map((row) => row.name);
}

function ensureColumn(db, tableName, columnName, definition) {
  if (!tableColumns(db, tableName).includes(columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function migrateQuizResults(db) {
  ensureColumn(db, "quiz_results", "difficulty", "TEXT NOT NULL DEFAULT 'easy'");
  ensureColumn(db, "quiz_results", "max_score", "INTEGER");
  ensureColumn(db, "quiz_results", "correct_count", "INTEGER");
  ensureColumn(db, "quiz_results", "incorrect_count", "INTEGER");
  ensureColumn(db, "quiz_results", "unanswered_count", "INTEGER NOT NULL DEFAULT 0");

  db.prepare(
    `UPDATE quiz_results
     SET max_score = total_questions
     WHERE max_score IS NULL`
  ).run();

  db.prepare(
    `UPDATE quiz_results
     SET correct_count = score
     WHERE correct_count IS NULL`
  ).run();

  db.prepare(
    `UPDATE quiz_results
     SET incorrect_count = MAX(total_questions - COALESCE(correct_count, score), 0)
     WHERE incorrect_count IS NULL`
  ).run();
}

function initDb(databasePath) {
  if (databasePath !== ":memory:") {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  }

  const db = new Database(databasePath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire INTEGER NOT NULL
    );
  `);

  migrateQuizResults(db);

  return db;
}

module.exports = { initDb };
