import { useState } from "react";
import { useNavigate } from "react-router-dom";
4;
import { jwtDecode } from "jwt-decode";
import styles from "./SignIn.module.css";
const API_URL = import.meta.env.VITE_API_URL;

type ApiSuccess = {
  token: string;
  user?: { id?: string; username?: string; role?: string };
};

export default function SignIn() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username) {
      return setError("Enter your username");
    }
    if (!password) {
      return setError("Enter your password");
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        // attempt to parse error message, fallback to status text
        let msg = `Sign in failed (${res.status})`;
        try {
          const json = await res.json();
          msg = json?.message || json?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const data: ApiSuccess = await res.json();

      if (!data?.token) {
        throw new Error("Server did not return a token");
      }

      const decoded = jwtDecode(data.token);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(decoded));

      if (data.user) {
        const storage = remember ? localStorage : sessionStorage;
        storage.setItem("user", JSON.stringify(data.user));
      }

      // navigate to app's main page
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("Sign in error:", err);
      setError(err?.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.signInWrapper}>
      <div
        className={styles.signInCard}
        role="main"
        aria-labelledby="signin-heading"
      >
        <header className={styles.signInHeader}>
          <h1 id="signin-heading">Sign in</h1>
          <p>Enter your credentials to access your account</p>
        </header>

        <form onSubmit={onSubmit} noValidate>
          {error && (
            <div role="alert" className={styles.errorAlert}>
              {error}
            </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="username">
              username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className={styles.input}
              placeholder="JohnDoe"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-required="true"
              disabled={loading}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-required="true"
              disabled={loading}
            />
          </div>

          <div className={`${styles.actionsRow} ${styles.mtSmall}`}>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                aria-checked={remember}
                className={styles.checkbox}
                disabled={loading}
              />
              <span className={styles.rememberText}>Remember me</span>
            </label>
          </div>

          <div className={styles.mtMedium}>
            <button
              type="submit"
              className={styles.signInBtn}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        <footer className={styles.footer}>
          © {new Date().getFullYear()} Your Company
        </footer>
      </div>
    </div>
  );
}
