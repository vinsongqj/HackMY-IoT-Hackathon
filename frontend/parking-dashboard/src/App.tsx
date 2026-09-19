// src/App.tsx
import { Routes, Route, Navigate, NavLink, useLocation } from "react-router-dom";
import { OperatorDashboard } from "./pages/OperatorDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";

function Shell() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">P</div>
          <span>ParkOps</span>
        </div>

        <div className="sidebar-section">Navigation</div>

        <NavLink
          to="/operator"
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <span className="icon">▦</span>
          <span>Operator</span>
        </NavLink>

        <NavLink
          to="/admin"
          className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
        >
          <span className="icon">▤</span>
          <span>Admin</span>
        </NavLink>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{isAdmin ? "Analytics" : "Dashboard"}</h1>
            <span className="sub">
              {isAdmin ? "Metro District · Admin" : "Metro District · Downtown Zone"}
            </span>
          </div>
          <div className="topbar-spacer" />
        </header>

        <Routes>
          <Route path="/" element={<Navigate to="/operator" replace />} />
          <Route path="/operator" element={<OperatorDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/operator" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return <Shell />;
}