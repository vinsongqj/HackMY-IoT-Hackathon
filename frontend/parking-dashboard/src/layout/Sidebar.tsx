import { NavLink } from "react-router-dom";

const items = [
  { to: "/operator", icon: "🎛️", label: "Operator" },
  { to: "/admin",    icon: "📊", label: "Admin"    },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">🚗</div>
        <span>Park Sim</span>
      </div>

      <div className="sidebar-section">Menu</div>

      {items.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <span className="icon">{it.icon}</span>
          <span>{it.label}</span>
        </NavLink>
      ))}

      <div className="sidebar-promo">
        <b>Auto Mode</b>
        <p>Let the backend handle arrivals and payments automatically.</p>
        <button>Enable</button>
      </div>
    </aside>
  );
}