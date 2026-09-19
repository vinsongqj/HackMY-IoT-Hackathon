import { useLocation } from "react-router-dom";
import { useTheme } from "../useTheme";

export function Topbar() {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();

  const title = pathname.startsWith("/admin")
    ? "Admin Dashboard"
    : "Operator Dashboard";

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
        aria-label="Toggle theme"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      <button className="topbar-icon" title="Notifications" aria-label="Notifications">
        🔔
      </button>

      <div className="topbar-user">
        <div className="topbar-user-meta">
          <b>Operator</b>
          <span>admin@parksim</span>
        </div>
        <div className="topbar-avatar">OP</div>
      </div>
    </header>
  );
}