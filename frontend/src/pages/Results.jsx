import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Message from "../components/Message.jsx";

function feedbackFor(score, total) {
  const ratio = total ? score / total : 0;
  if (ratio === 1) {
    return "Excellent. You answered every puzzle correctly.";
  }
  if (ratio >= 0.6) {
    return "Good result. Review a few more puzzles to improve.";
  }
  return "Keep practising. Each quiz loads a new Banana API puzzle.";
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
      await api.startQuiz(csrfToken);
      navigate("/quiz");
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  const score = result?.score ?? 0;
  const total = result?.totalQuestions || result?.answered || 5;

  return (
    <section className="card">
      <h1>Quiz results</h1>
      {loading ? <p className="status">Loading results...</p> : null}
      <Message type="error">{error}</Message>
      {!loading && result ? (
        <>
          <p className="score-line">
            You scored <strong>{score}</strong> out of <strong>{total}</strong>.
          </p>
          <p>Questions answered: {result.answered || total}</p>
          <p>{feedbackFor(score, total)}</p>
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
          Back to dashboard
        </button>
      </div>
    </section>
  );
}
