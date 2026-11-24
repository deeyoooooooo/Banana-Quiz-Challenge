import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Message from "../components/Message.jsx";
import { difficultyMeta } from "../game/difficulties.js";

function headlineFor(accuracy) {
  if (accuracy === 100) {
    return "Perfect run. You solved every puzzle.";
  }
  if (accuracy >= 60) {
    return "Solid finish. A few more solves and you will own this mode.";
  }
  return "Run complete. Practise this difficulty and try again.";
}

export default function Results() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { csrfToken } = useAuth();
  const [result, setResult] = useState(location.state || null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!location.state);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (id && id !== "latest") {
          const data = await api.getResult(id);
          if (!cancelled) {
            setResult(data.result);
          }
        } else {
          const data = await api.listResults();
          if (!cancelled) {
            setResult(data.results[0] || location.state || null);
          }
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
  }, [id, location.state]);

  async function handlePlayAgain() {
    setStarting(true);
    setError("");
    try {
      await api.startQuiz(csrfToken, result?.difficulty || "easy");
      navigate("/quiz");
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  const score = result?.score ?? 0;
  const maxScore = result?.maxScore || result?.totalQuestions || 5;
  const total = result?.totalQuestions || result?.answered || 5;
  const correct = result?.correctCount ?? score;
  const incorrect = result?.incorrectCount ?? 0;
  const unanswered = result?.unansweredCount ?? Math.max(total - correct - incorrect, 0);
  const accuracy = result?.accuracy ?? (total ? Math.round((correct / total) * 100) : 0);
  const mode = difficultyMeta(result?.difficulty);
  const percent = maxScore ? Math.round((score / maxScore) * 100) : 0;

  return (
    <section className="card results-card">
      <p className="eyebrow">{mode.name} complete</p>
      <h1>{loading ? "Quiz results" : headlineFor(accuracy)}</h1>
      {loading ? <p className="status">Loading results...</p> : null}
      <Message type="error">{error}</Message>
      {!loading && result ? (
        <>
          <p className="score-line">
            Final score <strong>{score}</strong> / <strong>{maxScore}</strong>
          </p>
          <div className="score-bar" aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </div>
          <ul className="result-facts">
            <li>Difficulty: {mode.name}</li>
            <li>Correct: {correct}</li>
            <li>Incorrect: {incorrect}</li>
            <li>Unanswered: {unanswered}</li>
            <li>Accuracy: {accuracy}%</li>
          </ul>
        </>
      ) : null}
      <div className="actions">
        <button type="button" onClick={handlePlayAgain} disabled={starting}>
          {starting ? "Starting..." : "Play Again"}
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => navigate("/dashboard")}
        >
          Return to Dashboard
        </button>
      </div>
    </section>
  );
}
