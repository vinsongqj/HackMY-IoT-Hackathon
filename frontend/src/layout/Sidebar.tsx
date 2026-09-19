import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext";

export function Sidebar() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">🚗</div>
        <span>ParkFlow</span>
      </div>

      <div className="sidebar-section">Menu</div>

      <NavLink
        to="/operator"
        className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
      >
        <span className="icon">👷</span>
        <span>Operator</span>
      </NavLink>

      {isAdmin && (
        <NavLink
          to="/admin"
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <span className="icon">🛠️</span>
          <span>Admin</span>
        </NavLink>
      )}

      <div className="sidebar-promo">
        <b>{user?.username ?? "Guest"}</b>
        <p>Signed in as {user?.role ?? "guest"}.</p>
        <button onClick={logout}>Sign out</button>
      </div>
    </aside>
  );
}