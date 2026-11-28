const crypto = require("crypto");

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function createPasswordResetService(db, { now = () => Date.now(), ttlMs = 15 * 60 * 1000 } = {}) {
  const insertToken = db.prepare(
    `INSERT INTO password_resets (user_id, token_hash, expires_at, used_at, created_at)
     VALUES (?, ?, ?, NULL, ?)`
  );
  const retireOpenTokens = db.prepare(
    `UPDATE password_resets
     SET used_at = ?
     WHERE user_id = ? AND used_at IS NULL`
  );
  const findByHash = db.prepare(
    `SELECT id, user_id, expires_at, used_at
     FROM password_resets
     WHERE token_hash = ?`
  );
  const markUsed = db.prepare(
    `UPDATE password_resets SET used_at = ? WHERE id = ? AND used_at IS NULL`
  );

  function issueToken(userId) {
    const token = crypto.randomBytes(32).toString("hex");
    const createdAt = new Date(now()).toISOString();
    const expiresAt = new Date(now() + ttlMs).toISOString();
    const retireAndInsert = db.transaction(() => {
      retireOpenTokens.run(createdAt, userId);
      insertToken.run(userId, hashToken(token), expiresAt, createdAt);
    });
    retireAndInsert();
    return { token, expiresAt };
  }

  function findValidToken(rawToken) {
    if (!rawToken || typeof rawToken !== "string") {
      return null;
    }
    const row = findByHash.get(hashToken(rawToken));
    if (!row || row.used_at) {
      return null;
    }
    if (new Date(row.expires_at).getTime() <= now()) {
      return null;
    }
    return { id: row.id, userId: row.user_id };
  }

  function consumeToken(resetId) {
    const usedAt = new Date(now()).toISOString();
    const result = markUsed.run(usedAt, resetId);
    return result.changes === 1;
  }

  return { issueToken, findValidToken, consumeToken, hashToken };
}

function invalidateUserSessions(db, userId) {
  const rows = db.prepare("SELECT sid, sess FROM sessions").all();
  const destroy = db.prepare("DELETE FROM sessions WHERE sid = ?");
  for (const row of rows) {
    try {
      const sess = JSON.parse(row.sess);
      if (sess && sess.user && sess.user.id === userId) {
        destroy.run(row.sid);
      }
    } catch {
      // Ignore rows that are not valid session JSON.
    }
  }
}

module.exports = {
  createPasswordResetService,
  invalidateUserSessions,
  hashToken,
};
