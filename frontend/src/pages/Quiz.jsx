import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Message from "../components/Message.jsx";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function Quiz() {
  const navigate = useNavigate();
  const { csrfToken } = useAuth();
  const [puzzle, setPuzzle] = useState(null);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadCurrent() {
    setLoading(true);
    setError("");
    try {
      const data = await api.currentQuiz();
      setPuzzle(data.puzzle);
    } catch (err) {
      setError(err.message);
      setPuzzle(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCurrent();
  }, []);

  function handleSelect(digit) {
    if (submitting) {
      return;
    }
    setSelected(digit);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (selected === null || submitting) {
      setError("Select a digit before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");
    setFeedback("");
    try {
      const data = await api.submitAnswer(selected, csrfToken);
      if (data.completed) {
        navigate(`/results/${data.resultId || "latest"}`, {
          state: {
            score: data.score,
            answered: data.answered,
            totalQuestions: data.totalQuestions,
            lastCorrect: data.correct,
          },
        });
        return;
      }
      setFeedback(data.correct ? "Correct." : "Incorrect.");
      setSelected(null);
      if (data.needsRetry) {
        setError(data.error || "Could not load the next puzzle.");
      } else {
        setPuzzle(data.puzzle);
      }
    } catch (err) {
      setError(err.message);
      if (err.needsRetry && err.puzzle) {
        setPuzzle(err.puzzle);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetry() {
    setLoading(true);
    setError("");
    try {
      const data = await api.retryPuzzle(csrfToken);
      setPuzzle(data.puzzle);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h1>Quiz</h1>
      {puzzle ? (
        <p>
          Puzzle {puzzle.questionNumber} of {puzzle.totalQuestions}. Score:{" "}
          {puzzle.score}/{puzzle.answered}
        </p>
      ) : null}

      <Message type="error">{error}</Message>
      <Message type="success">{feedback}</Message>

      {loading ? <p className="status">Loading puzzle from the Banana API...</p> : null}

      {!loading && puzzle ? (
        <form onSubmit={handleSubmit}>
          <img
            className="puzzle-image"
            src={puzzle.question}
            alt="Banana puzzle from the official Banana API"
          />
          <fieldset disabled={submitting}>
            <legend>Select the number shown in the image</legend>
            <div className="digit-grid">
              {DIGITS.map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className={selected === digit ? "digit selected" : "digit"}
                  onClick={() => handleSelect(digit)}
                >
                  {digit}
                </button>
              ))}
            </div>
          </fieldset>
          <button type="submit" disabled={submitting || selected === null}>
            {submitting ? "Checking answer..." : "Submit Answer"}
          </button>
        </form>
      ) : null}

      {error ? (
        <button type="button" className="button-secondary" onClick={handleRetry}>
          Retry
        </button>
      ) : null}
    </section>
  );
}
