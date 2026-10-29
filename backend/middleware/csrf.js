const crypto = require("crypto");

function ensureCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  return req.session.csrfToken;
}

function csrfProtection(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const headerToken = req.get("x-csrf-token");
  const sessionToken = req.session && req.session.csrfToken;

  if (!sessionToken || !headerToken || headerToken !== sessionToken) {
    return res.status(403).json({
      error: "Invalid or missing CSRF token. Refresh the page and try again.",
    });
  }

  return next();
}

module.exports = { ensureCsrfToken, csrfProtection };
