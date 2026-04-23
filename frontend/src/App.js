import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Clients from "./pages/Clients";
import Projects from "./pages/Projects";
import Proposals from "./pages/Proposals";
import Agents from "./pages/Agents";
import Settings from "./pages/Settings";
import ComingSoon from "./pages/ComingSoon";
import ClientPortal from "./pages/ClientPortal";

import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import CommandPalette from "./components/CommandPalette";
import CopilotDock from "./components/CopilotDock";
import Modal from "./components/Modal";
import { Button, Input, Label } from "./components/ui/Primitives";
import api from "./lib/api";
import { Loader2 } from "lucide-react";

function AppShell() {
  const { user, loadWorkspaces } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [copilot, setCopilot] = useState(false);
  const [palette, setPalette] = useState(false);
  const [wsModal, setWsModal] = useState(false);
  const [wsName, setWsName] = useState("");

  // Global Cmd+K
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setCopilot((p) => !p);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const createWs = async (e) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    await api.post("/workspaces", { name: wsName.trim(), description: "" });
    setWsName(""); setWsModal(false);
    await loadWorkspaces();
  };

  if (user === null) return (
    <div className="min-h-screen grid place-items-center bg-background">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="h-screen flex bg-background text-foreground relative overflow-hidden">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <TopBar
          onOpenCopilot={() => setCopilot(true)}
          onOpenPalette={() => setPalette(true)}
          onOpenNewWorkspace={() => setWsModal(true)}
        />
        <main className="flex-1 overflow-auto relative">
          <div className="grid-bg absolute inset-0 opacity-[0.08] pointer-events-none" />
          <div className="relative z-[1]">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/crm" element={<CRM />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/proposals" element={<Proposals />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/automations" element={<ComingSoon title="Automations" codename="Forge · Automation OS" description="Workflow canvas, triggers, AI steps, webhooks and approval gates." />} />
              <Route path="/knowledge" element={<ComingSoon title="Knowledge" codename="Vault · Knowledge OS" description="Company brain — SOPs, playbooks, semantic search and RAG-powered assistants." />} />
              <Route path="/finance" element={<ComingSoon title="Finance" codename="Pulse · Finance OS" description="Revenue, invoicing, cashflow, forecasting and deal economics." />} />
              <Route path="/studio" element={<ComingSoon title="Studio" codename="Orbit · Venture Studio" description="Idea vault, validation lab, portfolio operating layer." />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} onOpenCopilot={() => setCopilot(true)} />
      <CopilotDock open={copilot} onClose={() => setCopilot(false)} />

      <Modal open={wsModal} onClose={() => setWsModal(false)} title="New workspace">
        <form onSubmit={createWs} className="space-y-4">
          <div><Label>Name</Label><Input value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="e.g. Growth Lab" data-testid="new-ws-name" autoFocus /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setWsModal(false)}>Cancel</Button>
            <Button type="submit" data-testid="new-ws-submit">Create</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/portal/:token" element={<ClientPortal />} />
          <Route path="*" element={<AppShell />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
