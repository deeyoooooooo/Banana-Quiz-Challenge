const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_ ]{3,30}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function validateRegistration({ username, email, password }) {
  const errors = [];
  const cleanUsername = String(username || "").trim();
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = String(password || "");

  if (!cleanUsername) {
    errors.push("Username is required.");
  } else if (!USERNAME_PATTERN.test(cleanUsername)) {
    errors.push("Username must be 3-30 characters using letters, numbers, spaces, or underscores.");
  }

  if (!cleanEmail) {
    errors.push("Email is required.");
  } else if (!EMAIL_PATTERN.test(cleanEmail)) {
    errors.push("Enter a valid email address.");
  }

  if (!cleanPassword) {
    errors.push("Password is required.");
  } else if (!PASSWORD_PATTERN.test(cleanPassword)) {
    errors.push("Password must be at least 8 characters and include a letter and a number.");
  }

  return {
    errors,
    value: {
      username: cleanUsername,
      email: cleanEmail,
      password: cleanPassword,
    },
  };
}

function validateLogin({ email, password }) {
  const errors = [];
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = String(password || "");

  if (!cleanEmail || !EMAIL_PATTERN.test(cleanEmail)) {
    errors.push("Enter a valid email address.");
  }
  if (!cleanPassword) {
    errors.push("Password is required.");
  }

  return {
    errors,
    value: { email: cleanEmail, password: cleanPassword },
  };
}

function parseAnswer(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return { error: "An answer is required." };
  }
  const answer = Number(raw);
  if (!Number.isInteger(answer) || answer < 0 || answer > 9) {
    return { error: "Answer must be a whole number from 0 to 9." };
  }
  return { answer };
}

module.exports = {
  validateRegistration,
  validateLogin,
  parseAnswer,
  normalizeEmail,
};
