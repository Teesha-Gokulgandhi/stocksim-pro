import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import FloatingCopilot from "../copilot/FloatingCopilot";

import "./DashboardLayout.css";

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  const toggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebarCollapsed", String(next));
      return next;
    });
  };

  return (
    <div className="layout">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        toggleCollapse={toggleCollapse}
      />

      <div className={`main-content ${sidebarCollapsed ? "collapsed" : ""}`}>
        <Navbar
          setSidebarOpen={setSidebarOpen}
          sidebarCollapsed={sidebarCollapsed}
          toggleCollapse={toggleCollapse}
        />
        <Outlet />
      </div>

      <FloatingCopilot />
    </div>
  );
}

export default DashboardLayout;
