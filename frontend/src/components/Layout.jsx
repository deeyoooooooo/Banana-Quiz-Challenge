import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import BananaMark from "./BananaMark.jsx";

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <div className="page">
      <header className="topbar">
        <Link className="brand" to="/" aria-label="Banana Arcade home">
          <BananaMark compact />
        </Link>
        <nav className="nav" aria-label="Main">
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
    </div>
  );
}
