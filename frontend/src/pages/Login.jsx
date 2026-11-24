import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Message from "../components/Message.jsx";
import PasswordField from "../components/PasswordField.jsx";

export default function Login() {
  const navigate = useNavigate();
  const { csrfToken, setUser } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleChange(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const data = await api.login(form, csrfToken);
      setUser(data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="card auth-card">
        <p className="eyebrow">Welcome back</p>
        <h1>Login to Banana Arcade</h1>
        <p>Use the email and password from your registration. Your session stays on the server.</p>
        <Message type="error">{error}</Message>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <PasswordField
            id="password"
            name="password"
            label="Password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Login"}
          </button>
        </form>
        <p>
          Need an account? <Link to="/register">Register</Link>
        </p>
      </section>
      <aside className="auth-art card" aria-hidden="true">
        <h2>Ready player banana</h2>
        <p>Five puzzles. Three difficulties. One hidden digit in every image.</p>
        <div className="mini-bananas">🍌 🧩 🍌</div>
      </aside>
    </div>
  );
}
