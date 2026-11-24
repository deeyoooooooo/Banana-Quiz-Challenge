import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Message from "../components/Message.jsx";
import { difficultyMeta } from "../game/difficulties.js";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function formatMs(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${seconds}s`;
}

export default function Quiz() {
  const navigate = useNavigate();
  const { csrfToken } = useAuth();
  const [puzzle, setPuzzle] = useState(null);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [remainingMs, setRemainingMs] = useState(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const submittingRef = useRef(false);
  const timeoutSentRef = useRef(false);

  function applyPuzzle(nextPuzzle) {
    timeoutSentRef.current = false;
    setPuzzle(nextPuzzle);
    setSelected(null);
    setHint("");
    setRemainingMs(nextPuzzle?.remainingMs ?? null);
  }

  async function finishIfComplete(data) {
    if (data.completed) {
      navigate(`/results/${data.resultId || "latest"}`, {
        state: {
          score: data.score,
          answered: data.answered,
          totalQuestions: data.totalQuestions,
          lastCorrect: data.correct,
          timedOut: data.timedOut,
          difficulty: data.difficulty,
          maxScore: data.maxScore,
          correctCount: data.correctCount,
          incorrectCount: data.incorrectCount,
          unansweredCount: data.unansweredCount,
        },
      });
      return true;
    }
    if (data.puzzle) {
      applyPuzzle(data.puzzle);
    }
    return false;
  }

  async function loadCurrent() {
    setLoading(true);
    setError("");
    try {
      const data = await api.currentQuiz();
      applyPuzzle(data.puzzle);
      if (data.expired) {
        setFeedback("Time has already run out for this puzzle.");
      }
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

  useEffect(() => {
    if (!puzzle || puzzle.timeLimit == null || remainingMs == null) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setRemainingMs((current) => {
        if (current == null || current <= 0) {
          return current;
        }
        return Math.max(0, current - 250);
      });
    }, 250);
    return () => window.clearInterval(timer);
  }, [puzzle?.questionNumber, puzzle?.timeLimit]);

  useEffect(() => {
    if (
      remainingMs !== 0 ||
      puzzle?.timeLimit == null ||
      submittingRef.current ||
      timeoutSentRef.current
    ) {
      return undefined;
    }
    timeoutSentRef.current = true;
    handleTimeout();
    return undefined;
  }, [remainingMs, puzzle?.timeLimit, puzzle?.questionNumber]);

  function handleSelect(digit) {
    if (submitting) {
      return;
    }
    setSelected(digit);
  }

  async function handleTimeout() {
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    try {
      const data = await api.timeoutQuestion(csrfToken);
      setFeedback("Time ran out. This puzzle was marked unanswered.");
      await finishIfComplete(data);
    } catch (err) {
      if (err.remainingMs) {
        timeoutSentRef.current = false;
        setRemainingMs(err.remainingMs);
      } else if (err.timedOut || err.puzzle) {
        await finishIfComplete(err);
      } else {
        setError(err.message);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (selected === null || submittingRef.current) {
      setError("Select a digit before submitting.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError("");
    setFeedback("");
    try {
      const data = await api.submitAnswer(selected, csrfToken);
      if (data.timedOut) {
        setFeedback("Time ran out. This puzzle was marked unanswered.");
      } else {
        setFeedback(data.correct ? "Correct. Nice solve." : "Incorrect. Next puzzle coming up.");
      }
      await finishIfComplete(data);
    } catch (err) {
      setError(err.message);
      if (err.needsRetry && err.puzzle) {
        applyPuzzle(err.puzzle);
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleRetry() {
    setLoading(true);
    setError("");
    try {
      const data = await api.retryPuzzle(csrfToken);
      applyPuzzle(data.puzzle);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleHint() {
    setError("");
    try {
      const data = await api.requestHint(csrfToken);
      setHint(data.hint);
      setPuzzle((current) =>
        current ? { ...current, hintAvailable: false } : current
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleQuit() {
    setConfirmQuit(false);
    try {
      await api.abandonQuiz(csrfToken);
    } catch {
      // Still leave the quiz screen so the player is not trapped.
    }
    navigate("/dashboard");
  }

  const mode = puzzle ? difficultyMeta(puzzle.difficulty) : null;
  const lowTime =
    puzzle?.timeLimit && remainingMs != null && remainingMs <= 5000 && remainingMs > 0;
  const progress = puzzle
    ? Math.round(((puzzle.questionNumber - 1) / puzzle.totalQuestions) * 100)
    : 0;

  return (
    <section className="card quiz-card">
      <div className="quiz-top">
        <div>
          <p className="eyebrow">{mode ? `${mode.name} · ${mode.tagline}` : "Quiz"}</p>
          <h1>Banana puzzle</h1>
          {puzzle ? (
            <p>
              Question {puzzle.questionNumber} of {puzzle.totalQuestions}
            </p>
          ) : null}
        </div>
        <div className="quiz-meta">
          {puzzle ? (
            <p className="score-chip">
              Score {puzzle.score}/{puzzle.maxScore}
            </p>
          ) : null}
          {puzzle?.timeLimit != null && remainingMs != null ? (
            <p className={`timer ${lowTime ? "timer-warning" : ""}`} aria-live="polite">
              {formatMs(remainingMs)}
            </p>
          ) : (
            <p className="timer timer-off">No timer</p>
          )}
        </div>
      </div>

      <div className="progress" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <Message type="error">{error}</Message>
      <Message type="success">{feedback}</Message>
      {hint ? <Message type="success">{hint}</Message> : null}

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
          <div className="actions">
            <button type="submit" disabled={submitting || selected === null}>
              {submitting ? "Checking answer..." : "Submit Answer"}
            </button>
            {puzzle.hintsEnabled ? (
              <button
                type="button"
                className="button-secondary"
                onClick={handleHint}
                disabled={submitting || puzzle.hintAvailable === false}
              >
                {puzzle.hintAvailable === false ? "Hint used" : "Use hint"}
              </button>
            ) : null}
            <button
              type="button"
              className="button-secondary"
              onClick={() => setConfirmQuit(true)}
              disabled={submitting}
            >
              Quit
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <button type="button" className="button-secondary" onClick={handleRetry}>
          Retry
        </button>
      ) : null}

      {confirmQuit ? (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="quit-title">
          <div className="card modal-card">
            <h2 id="quit-title">Leave this quiz?</h2>
            <p>Progress will not be saved as a completed result.</p>
            <div className="actions">
              <button type="button" onClick={handleQuit}>
                Yes, quit
              </button>
              <button type="button" className="button-secondary" onClick={() => setConfirmQuit(false)}>
                Keep playing
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
