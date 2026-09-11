import { Navigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import PageLoader from "./common/PageLoader";

function ProtectedRoute({ children }) {
  const { user, loading } = useUser();

  // Auth state is still being resolved (e.g., on cold direct-URL load).
  // Show a loader instead of immediately redirecting — this fixes the
  // "dynamic import error" that appeared when navigating directly to
  // /market or /portfolio before the UserContext had finished initialising.
  if (loading) {
    return <PageLoader />;
  }

  // After loading completes, check for a valid token + user
  const token = localStorage.getItem("token");
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;