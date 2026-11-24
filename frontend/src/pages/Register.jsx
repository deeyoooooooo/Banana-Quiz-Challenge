import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Message from "../components/Message.jsx";
import PasswordField from "../components/PasswordField.jsx";

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export default function Register() {
  const navigate = useNavigate();
  const { csrfToken, setUser } = useAuth();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Password and confirmation do not match.");
      return;
    }
    if (!PASSWORD_PATTERN.test(form.password)) {
      setError("Password must be at least 8 characters and include a letter and a number.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await api.register(
        {
          username: form.username,
          email: form.email,
          password: form.password,
        },
        csrfToken
      );
      setUser(data.user);
      setSuccess("Account created. Taking you to the dashboard...");
      navigate("/dashboard");
    } catch (err) {
      setError(err.details?.[0] || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-layout">
      <section className="card auth-card">
        <p className="eyebrow">Join Banana Arcade</p>
        <h1>Create your player identity</h1>
        <p>Usernames, emails, and hashed passwords are stored in SQLite. The server never keeps your password in plaintext.</p>
        <Message type="error">{error}</Message>
        <Message type="success">{success}</Message>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            value={form.username}
            onChange={handleChange}
            required
          />

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
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <ul className="requirements">
            <li>At least 8 characters</li>
            <li>Includes a letter and a number</li>
            <li>Must match the confirmation field</li>
          </ul>

          <PasswordField
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={submitting}>
            {submitting ? "Creating account..." : "Register"}
          </button>
        </form>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
      <aside className="auth-art card" aria-hidden="true">
        <h2>Your scores stay yours</h2>
        <p>Registration creates a virtual identity. Quiz history is always filtered by the logged-in user id.</p>
        <div className="mini-bananas">🍌 🔐 🍌</div>
      </aside>
    </div>
  );
}
