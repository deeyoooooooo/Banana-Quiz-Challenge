import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Message from "../components/Message.jsx";
import DifficultyCards from "../components/DifficultyCards.jsx";
import { DIFFICULTIES, difficultyMeta } from "../game/difficulties.js";

const emptyStats = {
  totalQuizzes: 0,
  bestScore: null,
  averageScore: null,
  byDifficulty: {},
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, csrfToken, logout } = useAuth();
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(emptyStats);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState("");
  const [selected, setSelected] = useState("easy");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await api.listResults();
        if (!cancelled) {
          setResults(data.results);
          setStats(data.stats || emptyStats);
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

  async function handleStartQuiz(difficulty) {
    setError("");
    setStarting(difficulty);
    try {
      await api.startQuiz(csrfToken, difficulty);
      navigate("/quiz");
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting("");
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const recent = results.slice(0, 5);

  return (
    <div className="dashboard">
      <section className="card profile-card">
        <div>
          <p className="eyebrow">Player dashboard</p>
          <h1>Welcome back, {user.username}</h1>
          <p className="identity">
            Signed in as <strong>{user.email}</strong>
          </p>
        </div>
        <div className="actions">
          <button type="button" onClick={() => handleStartQuiz(selected)} disabled={Boolean(starting)}>
            {starting ? "Starting quiz..." : "Start Playing"}
          </button>
          <button type="button" className="button-secondary" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </section>

      <section className="stats-grid" aria-label="Quiz statistics">
        <article className="card stat-card">
          <p className="eyebrow">Completed</p>
          <p className="stat-value">{loading ? "—" : stats.totalQuizzes}</p>
          <p>Total quizzes saved for this account</p>
        </article>
        <article className="card stat-card">
          <p className="eyebrow">Best score</p>
          <p className="stat-value">{loading ? "—" : stats.bestScore ?? "—"}</p>
          <p>Highest official server score</p>
        </article>
        <article className="card stat-card">
          <p className="eyebrow">Average</p>
          <p className="stat-value">{loading ? "—" : stats.averageScore ?? "—"}</p>
          <p>Mean of your saved scores</p>
        </article>
      </section>

      {stats.totalQuizzes > 0 ? (
        <section className="card">
          <h2>Scores by difficulty</h2>
          <div className="mini-stats">
            {DIFFICULTIES.map((mode) => {
              const group = stats.byDifficulty?.[mode.id] || { count: 0, bestScore: null };
              return (
                <p key={mode.id}>
                  <strong>{mode.name}:</strong> {group.count} quiz{group.count === 1 ? "" : "zes"}
                  {group.bestScore == null ? "" : `, best ${group.bestScore}`}
                </p>
              );
            })}
          </div>
        </section>
      ) : null}

      <Message type="error">{error}</Message>

      <section>
        <div className="section-heading">
          <h2>Choose a difficulty</h2>
          <p>The selected mode is sent to the server when you press Play. The browser cannot change the points or the timer rules.</p>
        </div>
        <DifficultyCards
          difficulties={DIFFICULTIES}
          selected={selected}
          onSelect={setSelected}
          onPlay={handleStartQuiz}
          playingId={starting}
          playable
        />
      </section>

      <section className="card">
        <h2>Recent quiz results</h2>
        {loading ? (
          <p className="status">Loading your results...</p>
        ) : recent.length === 0 ? (
          <p>No quiz results yet. Start a quiz to save your first score.</p>
        ) : (
          <ul className="result-list">
            {recent.map((result) => {
              const mode = difficultyMeta(result.difficulty);
              return (
                <li key={result.id}>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => navigate(`/results/${result.id}`)}
                  >
                    {mode.name}: {result.score}/{result.maxScore || result.totalQuestions} ·{" "}
                    {new Date(result.createdAt).toLocaleString()}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
