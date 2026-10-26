import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="page">
      <header className="topbar">
        <Link className="brand" to="/">
          Banana Quiz Challenge
        </Link>
        <nav className="nav">
          <NavLink to="/">Home</NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
              <button type="button" className="link-button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
              <NavLink to="/register">Register</NavLink>
            </>
          )}
        </nav>
      </header>
      <main className="content">{children}</main>
      <footer className="footer">
        CIS046-3 Software for Enterprise · Banana API by Marc Conrad
      </footer>
    </div>
  );
}
