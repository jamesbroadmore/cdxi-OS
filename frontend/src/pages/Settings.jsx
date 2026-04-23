import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Label, Card } from "../components/ui/Primitives";
import { Sun, Moon, Plus, Loader2 } from "lucide-react";
import api from "../lib/api";

export default function Settings() {
  const { user, theme, setTheme, workspaces, loadWorkspaces } = useAuth();
  const [wsName, setWsName] = useState("");
  const [loading, setLoading] = useState(false);

  const createWs = async (e) => {
    e.preventDefault();
    if (!wsName.trim()) return;
    setLoading(true);
    try {
      await api.post("/workspaces", { name: wsName.trim(), description: "" });
      setWsName("");
      await loadWorkspaces();
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6" data-testid="settings">
      <div>
        <div className="cdxi-label">System</div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <Card className="p-6">
        <div className="cdxi-label">Profile</div>
        <div className="mt-3 grid md:grid-cols-2 gap-4">
          <div><Label>Name</Label><Input value={user?.name || ""} disabled /></div>
          <div><Label>Email</Label><Input value={user?.email || ""} disabled /></div>
          <div><Label>Role</Label><Input value={user?.role || ""} disabled /></div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="cdxi-label">Appearance</div>
        <div className="mt-3 flex items-center gap-3">
          <Button variant={theme === "dark" ? "primary" : "outline"} onClick={() => setTheme("dark")} data-testid="theme-dark"><Moon className="w-3.5 h-3.5" /> Dark</Button>
          <Button variant={theme === "light" ? "primary" : "outline"} onClick={() => setTheme("light")} data-testid="theme-light"><Sun className="w-3.5 h-3.5" /> Light</Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="cdxi-label">Workspaces</div>
        <div className="mt-3 space-y-2">
          {workspaces.map((w) => (
            <div key={w.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/40">
              <div>
                <div className="text-sm font-medium">{w.name}</div>
                <div className="text-xs text-muted-foreground">{w.description || "—"}</div>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">{w.id.slice(0, 8)}</div>
            </div>
          ))}
        </div>
        <form onSubmit={createWs} className="mt-4 flex gap-2" data-testid="new-workspace-form">
          <Input value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="New workspace name" />
          <Button type="submit" disabled={loading} data-testid="new-workspace-submit">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
          </Button>
        </form>
      </Card>
    </div>
  );
}
