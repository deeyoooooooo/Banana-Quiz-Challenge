import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refreshSession() {
    try {
      const csrf = await api.getCsrfToken();
      setCsrfToken(csrf.csrfToken);
      try {
        const me = await api.me();
        setUser(me.user);
      } catch {
        setUser(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshSession();
  }, []);

  async function logout() {
    if (csrfToken) {
      try {
        await api.logout(csrfToken);
      } catch {
        // Continue clearing local identity even if the server session is already gone.
      }
    }
    setUser(null);
    const csrf = await api.getCsrfToken();
    setCsrfToken(csrf.csrfToken);
  }

  const value = useMemo(
    () => ({
      user,
      csrfToken,
      loading,
      error,
      setUser,
      setCsrfToken,
      refreshSession,
      logout,
    }),
    [user, csrfToken, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
