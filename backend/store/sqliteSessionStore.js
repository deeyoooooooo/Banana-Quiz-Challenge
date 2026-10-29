const session = require("express-session");

/**
 * SQLite-backed session store so login sessions survive server restarts.
 * This avoids the default in-memory MemoryStore, which is not suitable
 * once the application is used as a finished local project.
 */
class SqliteSessionStore extends session.Store {
  constructor(db) {
    super();
    this.db = db;
    this.getStmt = db.prepare(
      "SELECT sess, expire FROM sessions WHERE sid = ?"
    );
    this.setStmt = db.prepare(`
      INSERT INTO sessions (sid, sess, expire)
      VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET sess = excluded.sess, expire = excluded.expire
    `);
    this.destroyStmt = db.prepare("DELETE FROM sessions WHERE sid = ?");
    this.touchStmt = db.prepare("UPDATE sessions SET expire = ? WHERE sid = ?");
  }

  get(sid, callback) {
    try {
      const row = this.getStmt.get(sid);
      if (!row) {
        return callback(null, undefined);
      }
      if (row.expire < Date.now()) {
        this.destroyStmt.run(sid);
        return callback(null, undefined);
      }
      return callback(null, JSON.parse(row.sess));
    } catch (error) {
      return callback(error);
    }
  }

  set(sid, sess, callback) {
    try {
      const maxAge = sess.cookie && sess.cookie.maxAge ? sess.cookie.maxAge : 86400000;
      const expire = Date.now() + maxAge;
      this.setStmt.run(sid, JSON.stringify(sess), expire);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  destroy(sid, callback) {
    try {
      this.destroyStmt.run(sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  touch(sid, sess, callback) {
    try {
      const maxAge = sess.cookie && sess.cookie.maxAge ? sess.cookie.maxAge : 86400000;
      this.touchStmt.run(Date.now() + maxAge, sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }
}

module.exports = { SqliteSessionStore };
