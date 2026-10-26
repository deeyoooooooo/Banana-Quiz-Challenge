import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Message from "../components/Message.jsx";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, csrfToken, logout } = useAuth();
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api.listResults();
        if (!cancelled) {
          setResults(data.results);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleStartQuiz() {
    setError("");
    setStarting(true);
    try {
      await api.startQuiz(csrfToken);
      navigate("/quiz");
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <section className="card">
      <h1>Dashboard</h1>
      <p>
        Welcome, <strong>{user.username}</strong>. You are signed in as{" "}
        {user.email}.
      </p>
      <Message type="error">{error}</Message>
      <div className="actions">
        <button type="button" onClick={handleStartQuiz} disabled={starting}>
          {starting ? "Starting quiz..." : "Start Quiz"}
        </button>
        <button type="button" className="button-secondary" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <h2>Previous results</h2>
      {loading ? (
        <p className="status">Loading your results...</p>
      ) : results.length === 0 ? (
        <p>No quiz results yet. Start a quiz to save your first score.</p>
      ) : (
        <ul className="result-list">
          {results.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                className="link-button"
                onClick={() => navigate(`/results/${result.id}`)}
              >
                {result.score}/{result.totalQuestions} on{" "}
                {new Date(result.createdAt).toLocaleString()}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
