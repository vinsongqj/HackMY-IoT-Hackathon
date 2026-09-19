import { Routes, Route, Navigate } from "react-router-dom";
import { Shell } from "./layout/Shell";
import { OperatorDashboard } from "./pages/OperatorDashboard";
import { AdminDashboard } from "./pages/AdminDashboard";

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Navigate to="/operator" replace />} />
        <Route path="/operator" element={<OperatorDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  );
}