import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Home() {
  const { user } = useAuth();

  return (
    <section className="card">
      <h1>Banana Quiz Challenge</h1>
      <p>
        A university web application for CIS046-3 Software for Enterprise.
        Registered users log in, request banana puzzles from the official Banana
        API, submit answers, and store their scores.
      </p>
      <p>
        Each puzzle is an image. Your task is to identify the number shown and
        submit that digit. The backend talks to the Banana API and checks
        answers so scores cannot be faked in the browser.
      </p>
      {user ? (
        <p>
          Welcome back, <strong>{user.username}</strong>.{" "}
          <Link className="button" to="/dashboard">
            Go to dashboard
          </Link>
        </p>
      ) : (
        <div className="actions">
          <Link className="button" to="/login">
            Login
          </Link>
          <Link className="button button-secondary" to="/register">
            Register
          </Link>
        </div>
      )}
    </section>
  );
}
