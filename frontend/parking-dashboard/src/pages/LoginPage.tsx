import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api.auth";
import { useAuth } from "../AuthContext";

type Mode = "login" | "signup";

export function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"operator" | "admin">("operator");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const { login } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res =
        mode === "login"
          ? await authApi.login(username, password)
          : await authApi.signup(username, password, role);
      login(res.token);
      nav(res.role === "admin" ? "/admin" : "/operator");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo">
          <div className="sidebar-logo-mark">🚗</div>
          <span>ParkOps</span>
        </div>

        <div className="login-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => { setMode("login"); setErr(null); }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => { setMode("signup"); setErr(null); }}
          >
            Sign up
          </button>
        </div>

        <div className="login-field">
          <label>Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            autoComplete="username"
          />
        </div>

        <div className="login-field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </div>

        {mode === "signup" && (
          <div className="login-field">
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as "operator" | "admin")}>
              <option value="operator">Operator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}

        {err && <div className="login-error">{err}</div>}

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>

        <p className="login-hint">
          Default: <code>admin / admin</code> or <code>operator / operator</code>
        </p>
      </form>
    </div>
  );
}