import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Message from "../components/Message.jsx";
import PasswordField from "../components/PasswordField.jsx";

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const { csrfToken } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("This reset link is invalid or has expired.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password and confirmation do not match.");
      return;
    }
    if (!PASSWORD_PATTERN.test(password)) {
      setError("Password must be at least 8 characters and include a letter and a number.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.resetPassword({ token, password }, csrfToken);
      setSuccess(data.message);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="card auth-card">
        <p className="eyebrow">Choose a new password</p>
        <h1>Reset password</h1>
        <p>The new password is hashed with bcrypt before it replaces the old one.</p>
        <Message type="error">{error}</Message>
        <Message type="success">{success}</Message>
        {success ? (
          <p>
            <Link to="/login">Continue to login</Link>
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <PasswordField
              id="password"
              name="password"
              label="New password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <PasswordField
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm new password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
            <button type="submit" disabled={submitting || !csrfToken}>
              {submitting ? "Saving password..." : "Update password"}
            </button>
          </form>
        )}
        <p>
          <Link to="/login">Back to login</Link>
        </p>
      </section>
    </div>
  );
}
