import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PageLoader from "./components/common/PageLoader";

// Auth pages — small, load eagerly
import Login from "./pages/Login";
import Register from "./pages/Register";

// Route-level lazy chunks — each page becomes its own bundle chunk.
// This reduces the initial JS payload from ~866KB to ~325KB.
const NotFound      = lazy(() => import("./pages/NotFound"));
const Dashboard     = lazy(() => import("./pages/Dashboard/Dashboard"));
const Portfolio     = lazy(() => import("./pages/Portfolio/Portfolio"));
const MarketHub     = lazy(() => import("./pages/Market/MarketHub"));
const Transactions  = lazy(() => import("./pages/Transactions/Transactions"));
const Profile       = lazy(() => import("./pages/Profile/Profile"));
const Watchlist     = lazy(() => import("./pages/Watchlist/Watchlist"));
const Settings      = lazy(() => import("./pages/Settings/Settings"));
const StockDetails  = lazy(() => import("./pages/StockDetails/StockDetails"));
const Replay        = lazy(() => import("./pages/Replay/Replay"));
const Admin         = lazy(() => import("./pages/Admin/Admin"));

import ProtectedRoute   from "./components/ProtectedRoute";
import AdminRoute       from "./components/AdminRoute";
import GlobalMaintenanceGuard from "./components/GlobalMaintenanceGuard";
import DashboardLayout  from "./components/layout/DashboardLayout";

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"         element={<Navigate to="/login" replace />} />
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            element={
              <ProtectedRoute>
                <GlobalMaintenanceGuard>
                  <DashboardLayout />
                </GlobalMaintenanceGuard>
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard"        element={<Dashboard />} />
            <Route path="/portfolio"        element={<Portfolio />} />
            <Route path="/market"           element={<MarketHub />} />
            <Route path="/market/:symbol"   element={<StockDetails />} />
            <Route path="/replay"           element={<Replay />} />
            <Route path="/transactions"     element={<Transactions />} />
            <Route path="/watchlist"        element={<Watchlist />} />
            <Route path="/profile"          element={<Profile />} />
            <Route path="/settings"         element={<Settings />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;