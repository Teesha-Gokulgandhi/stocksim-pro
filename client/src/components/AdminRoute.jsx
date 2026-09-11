import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

// Blocks non-admins from ever rendering the admin UI, not just from
// successfully calling admin APIs. Role comes from UserContext, which
// fetched it from the server once when the dashboard layout mounted —
// this avoids a second, redundant /user/profile call on every visit to
// /admin while still never trusting a client-side/localStorage value.
function AdminRoute({ children }) {
  const { user, loading } = useUser();

  if (loading) return null; // avoid a flash of admin UI before we know
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

export default AdminRoute;
