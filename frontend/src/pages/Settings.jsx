import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Label, Card } from "../components/ui/Primitives";
import { Sun, Moon, Plus, Loader2, Pencil, Check, X } from "lucide-react";
import api from "../lib/api";

function WorkspaceRow({ w, onSaved }) {
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(w.name);
  const [desc, setDesc] = useState(w.description || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api.put(`/workspaces/${w.id}`, { name: name.trim(), description: desc.trim() });
      await onSaved();
      setEdit(false);
    } finally { setBusy(false); }
  };

  if (!edit) {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/40" data-testid={`ws-row-${w.id}`}>
        <div>
          <div className="text-sm font-medium">{w.name}</div>
          <div className="text-xs text-muted-foreground">{w.description || "—"}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="font-mono text-[10px] text-muted-foreground">{w.id.slice(0, 8)}</div>
          <button onClick={() => setEdit(true)} className="p-1.5 rounded-lg hover:bg-muted" data-testid={`ws-edit-${w.id}`}>
            <Pencil className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="px-3 py-3 rounded-xl bg-muted/40 space-y-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Brand name" autoFocus data-testid={`ws-name-${w.id}`} />
      <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Short description" />
      <div className="flex items-center justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => { setEdit(false); setName(w.name); setDesc(w.description || ""); }}><X className="w-3 h-3" /> Cancel</Button>
        <Button size="sm" onClick={save} disabled={busy} data-testid={`ws-save-${w.id}`}>
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
        </Button>
      </div>
    </div>
  );
}

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
        <div className="cdxi-label">Brand workspaces</div>
        <div className="mt-3 space-y-2">
          {workspaces.map((w) => (
            <WorkspaceRow key={w.id} w={w} onSaved={loadWorkspaces} />
          ))}
        </div>
        <form onSubmit={createWs} className="mt-4 flex gap-2" data-testid="new-workspace-form">
          <Input value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="New brand workspace name" />
          <Button type="submit" disabled={loading} data-testid="new-workspace-submit">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
          </Button>
        </form>
      </Card>
    </div>
  );
}
