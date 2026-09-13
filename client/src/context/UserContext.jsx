import { createContext, useCallback, useContext, useEffect, useState } from "react";
import API from "../services/api";

const UserContext = createContext(null);

// Previously Sidebar, AdminRoute, and StockDetails each independently
// called GET /user/profile — meaning visiting /admin alone triggered two
// identical requests, and browsing between stock pages re-fetched the
// whole profile just to read the balance. This provider fetches it once
// per authenticated session and every consumer reads from here instead.
export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    try {
      const { data } = await API.get("/user/profile");
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      return data.user;
    } catch (error) {
      console.log(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  useEffect(() => {
    refreshUser();

    // Re-fetch profile whenever window gains focus (e.g. switching back to tab)
    const onFocus = () => {
      refreshUser();
    };
    window.addEventListener("focus", onFocus);

    // Refresh on trade execution or explicit app event
    const onTrade = () => {
      refreshUser();
    };
    window.addEventListener("stocksim:trade-executed", onTrade);
    window.addEventListener("stocksim:user-refresh", onTrade);

    // Background poll every 20 seconds so balances stay synchronized
    const timer = setInterval(() => {
      if (localStorage.getItem("token")) {
        refreshUser();
      }
    }, 20000);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("stocksim:trade-executed", onTrade);
      window.removeEventListener("stocksim:user-refresh", onTrade);
      clearInterval(timer);
    };
  }, [refreshUser]);

  return (
    <UserContext.Provider value={{ user, setUser, loading, refreshUser, fetchUser: refreshUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
}
