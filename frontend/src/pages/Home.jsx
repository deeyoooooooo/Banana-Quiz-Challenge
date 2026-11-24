import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import BananaMark from "../components/BananaMark.jsx";
import DifficultyCards from "../components/DifficultyCards.jsx";
import { DIFFICULTIES } from "../game/difficulties.js";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-copy">
          <BananaMark />
          <p className="eyebrow">Online banana number puzzles</p>
          <h1>Think Fast. Solve Smart. Go Bananas!</h1>
          <p className="lead">
            Banana Arcade is a polished puzzle challenge: read the official Banana
            API image, find the hidden digit, and beat your best score across Easy,
            Medium, and Difficult.
          </p>
          <div className="actions">
            {user ? (
              <Link className="button" to="/dashboard">
                Play Now
              </Link>
            ) : (
              <>
                <Link className="button" to="/register">
                  Play Now
                </Link>
                <Link className="button button-secondary" to="/login">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="puzzle-frame">
            <svg viewBox="0 0 280 220" className="hero-svg">
              <rect x="16" y="16" width="248" height="188" rx="28" fill="#fff" />
              <rect x="28" y="28" width="224" height="128" rx="18" fill="#FFF4C8" />
              <path
                d="M70 120c20-48 92-58 128-10 16 22-4 52-44 58-48 8-86-16-84-48z"
                fill="#F5C400"
              />
              <path d="M178 78c10-16 24-22 30-18-4 16-16 26-32 30 2-4 2-8 2-12z" fill="#5C3B12" />
              <circle cx="96" cy="168" r="18" fill="#6F2C91" />
              <circle cx="140" cy="168" r="18" fill="#F4A261" />
              <circle cx="184" cy="168" r="18" fill="#3D8B6E" />
              <text x="96" y="174" textAnchor="middle" fontSize="14" fill="#fff" fontFamily="Nunito, sans-serif">?</text>
              <text x="140" y="174" textAnchor="middle" fontSize="14" fill="#2A1B3D" fontFamily="Nunito, sans-serif">7</text>
              <text x="184" y="174" textAnchor="middle" fontSize="14" fill="#fff" fontFamily="Nunito, sans-serif">3</text>
            </svg>
          </div>
        </div>
      </section>

      <section className="card how-card">
        <h2>How the game works</h2>
        <ol className="steps">
          <li>
            <strong>Create your identity.</strong> Register and sign in. The server
            stores a session cookie so only you can see your scores.
          </li>
          <li>
            <strong>Pick a difficulty.</strong> Easy has no timer. Medium gives 30
            seconds. Difficult gives 15 seconds.
          </li>
          <li>
            <strong>Solve five Banana API puzzles.</strong> Each image hides a digit
            from 0 to 9. The official solution never leaves the server.
          </li>
        </ol>
      </section>

      <section>
        <div className="section-heading">
          <h2>Three ways to play</h2>
          <p>Every mode uses five live Banana API puzzles. Scoring is decided on the server.</p>
        </div>
        <DifficultyCards difficulties={DIFFICULTIES} />
      </section>
    </div>
  );
}
