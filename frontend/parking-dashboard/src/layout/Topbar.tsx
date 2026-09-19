import { useLocation } from "react-router-dom";
import { useTheme } from "../useTheme";
import { useAuth } from "../AuthContext";

export function Topbar() {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();

  const title = pathname.startsWith("/admin") ? "Admin Dashboard" : "Operator Dashboard";
  const initials = (user?.username ?? "?").slice(0, 2).toUpperCase();

  return (
    <header className="topbar">
      <h1>{title}</h1>

      <div className="topbar-spacer" />

      <div className="topbar-search">
        <span>🔍</span>
        <input placeholder="Search spots, plates, gates…" />
      </div>

      <button
        className="topbar-icon"
        onClick={toggle}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      <button className="topbar-icon" title="Notifications">🔔</button>

      <div className="topbar-user">
        <div className="topbar-user-meta">
          <b>{user?.username ?? "—"}</b>
          <span>{user?.role ?? ""}</span>
        </div>
        <div className="topbar-avatar" title={user?.username}>{initials}</div>
        <button className="topbar-icon" onClick={logout} title="Sign out">⎋</button>
      </div>
    </header>
  );
}