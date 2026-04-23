import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Search, Sun, Moon, Sparkles, LogOut, ChevronDown, Plus, Command,
} from "lucide-react";
import { Button } from "./ui/Primitives";
import { initials } from "../lib/utils";

export default function TopBar({ onOpenCopilot, onOpenPalette, onOpenNewWorkspace }) {
  const { user, theme, setTheme, workspaces, workspaceId, setWorkspaceId, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const currentWs = workspaces.find((w) => w.id === workspaceId);

  return (
    <header className="relative z-10 h-14 border-b border-border bg-background/60 backdrop-blur-xl flex items-center gap-3 px-4">
      {/* Workspace switcher */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 px-3 h-9 rounded-xl hover:bg-muted transition border border-border"
          data-testid="workspace-switcher"
        >
          <div className="w-6 h-6 rounded-md bg-blue-600 text-white grid place-items-center text-xs font-semibold">
            {initials(currentWs?.name || "—")}
          </div>
          <div className="text-sm font-medium">{currentWs?.name || "Select workspace"}</div>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
        {open && (
          <div className="absolute left-0 top-11 glass rounded-xl p-1.5 w-64 z-30" data-testid="workspace-menu">
            <div className="cdxi-label px-3 py-2">Workspaces</div>
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => { setWorkspaceId(w.id); setOpen(false); window.location.reload(); }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm"
                data-testid={`workspace-option-${w.id}`}
              >
                <div className="w-5 h-5 rounded-md bg-blue-600 text-white grid place-items-center text-[10px] font-semibold">
                  {initials(w.name)}
                </div>
                <span>{w.name}</span>
                {w.id === workspaceId && <span className="ml-auto text-[10px] text-blue-500 font-semibold">active</span>}
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            <button
              onClick={() => { setOpen(false); onOpenNewWorkspace?.(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm text-muted-foreground"
              data-testid="new-workspace"
            >
              <Plus className="w-3 h-3" /> New workspace
            </button>
          </div>
        )}
      </div>

      {/* Command palette trigger */}
      <button
        onClick={onOpenPalette}
        className="flex items-center gap-2 h-9 px-3 rounded-xl border border-border bg-muted/40 hover:bg-muted transition text-muted-foreground text-sm flex-1 max-w-md"
        data-testid="palette-trigger"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search or run command</span>
        <kbd className="ml-auto flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-background/40">
          <Command className="w-2.5 h-2.5" /> K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} data-testid="theme-toggle" aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
        <Button variant="outline" size="sm" onClick={onOpenCopilot} data-testid="open-copilot" className="gap-2">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">Atlas</span>
        </Button>

        <div className="relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="h-9 px-1.5 rounded-xl hover:bg-muted flex items-center gap-2 transition"
            data-testid="profile-menu"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white grid place-items-center text-xs font-semibold">
              {initials(user?.name || user?.email || "?")}
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-11 glass rounded-xl p-1.5 w-56 z-30">
              <div className="px-3 py-2">
                <div className="text-sm font-semibold">{user?.name}</div>
                <div className="text-xs text-muted-foreground">{user?.email}</div>
              </div>
              <div className="h-px bg-border my-1" />
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted text-sm text-rose-500"
                data-testid="logout-btn"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
