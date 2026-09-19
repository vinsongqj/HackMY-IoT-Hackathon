import { useLocation } from "react-router-dom";

export function Topbar() {
  const { pathname } = useLocation();
  const title = pathname.startsWith("/admin") ? "Admin Dashboard" : "Operator Dashboard";

  return (
    <header className="topbar">
      <h1>{title}</h1>

      <div className="topbar-spacer" />

      <div className="topbar-search">
        <span>🔍</span>
        <input placeholder="Search spots, plates, gates…" />
      </div>

      <div className="topbar-icon" title="Notifications">🔔</div>

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