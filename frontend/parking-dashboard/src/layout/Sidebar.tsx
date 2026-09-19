import { NavLink } from "react-router-dom";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">🚗</div>
        <span>Park Sim</span>
      </div>

      <div className="sidebar-section">Menu</div>

      <NavLink
        to="/operator"
        className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
      >
        <span className="icon">🎛️</span>
        <span>Operator</span>
      </NavLink>

      <NavLink
        to="/admin"
        className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
      >
        <span className="icon">📊</span>
        <span>Admin</span>
      </NavLink>

      <div className="sidebar-promo">
        <b>Auto Mode</b>
        <p>Let the backend handle arrivals and payments automatically.</p>
        <button>Enable</button>
      </div>
    </aside>
  );
}