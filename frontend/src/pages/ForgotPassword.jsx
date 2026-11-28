import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Message from "../components/Message.jsx";

export default function ForgotPassword() {
  const { csrfToken } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const data = await api.forgotPassword(email, csrfToken);
      setSuccess(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="card auth-card">
        <p className="eyebrow">Account recovery</p>
        <h1>Forgot your password?</h1>
        <p>
          Enter the email you registered with. If that account exists, the server prepares a
          short-lived reset link. During development the link is printed in the backend console,
          not in this page.
        </p>
        <Message type="error">{error}</Message>
        <Message type="success">{success}</Message>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <button type="submit" disabled={submitting || !csrfToken}>
            {submitting ? "Requesting reset..." : "Send reset link"}
          </button>
        </form>
        <p>
          Remembered it? <Link to="/login">Back to login</Link>
        </p>
      </section>
      <aside className="auth-art card" aria-hidden="true">
        <h2>Reset stays on the server</h2>
        <p>The reset token is hashed before it is stored. A used or expired link cannot be reused.</p>
        <div className="mini-bananas">🍌 🔐 🍌</div>
      </aside>
    </div>
  );
}
