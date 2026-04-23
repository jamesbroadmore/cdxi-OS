import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = loading, false = logged out
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceIdState] = useState(localStorage.getItem("cdxi_workspace_id") || "");
  const [theme, setTheme] = useState(localStorage.getItem("cdxi_theme") || "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("cdxi_theme", theme);
  }, [theme]);

  const setWorkspaceId = (id) => {
    localStorage.setItem("cdxi_workspace_id", id);
    setWorkspaceIdState(id);
  };

  const loadWorkspaces = useCallback(async () => {
    try {
      const { data } = await api.get("/workspaces");
      setWorkspaces(data);
      if (data.length && !localStorage.getItem("cdxi_workspace_id")) {
        setWorkspaceId(data[0].id);
      }
      return data;
    } catch (e) { return []; }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data);
        await loadWorkspaces();
      } catch {
        setUser(false);
      }
    })();
  }, [loadWorkspaces]);

  const login = async (email, password) => {
    // clear any stale storage before fresh login
    localStorage.removeItem("cdxi_token");
    localStorage.removeItem("cdxi_workspace_id");
    const { data } = await api.post("/auth/login", { email, password });
    if (data.access_token) localStorage.setItem("cdxi_token", data.access_token);
    setUser(data.user);
    const wss = await loadWorkspaces();
    if (wss?.length) setWorkspaceId(wss[0].id);
    return data;
  };

  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    if (data.access_token) localStorage.setItem("cdxi_token", data.access_token);
    setUser(data.user);
    const wss = await loadWorkspaces();
    if (wss?.length) setWorkspaceId(data.workspace_id || wss[0].id);
    return data;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("cdxi_token");
    localStorage.removeItem("cdxi_workspace_id");
    setUser(false);
    setWorkspaces([]);
    setWorkspaceIdState("");
  };

  return (
    <AuthCtx.Provider value={{
      user, setUser, workspaces, workspaceId, setWorkspaceId,
      loadWorkspaces, theme, setTheme, login, register, logout,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
