import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowRight, Sparkles, Command } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ACTIONS = [
  { id: "go-home", title: "Go to Home", kind: "Navigate", to: "/" },
  { id: "go-crm", title: "Go to Clients · CRM", kind: "Navigate", to: "/crm" },
  { id: "go-projects", title: "Go to Projects", kind: "Navigate", to: "/projects" },
  { id: "go-proposals", title: "Go to Proposals", kind: "Navigate", to: "/proposals" },
  { id: "go-agents", title: "Go to Agents", kind: "Navigate", to: "/agents" },
  { id: "go-settings", title: "Go to Settings", kind: "Navigate", to: "/settings" },
  { id: "new-client", title: "Create new client", kind: "Create", to: "/crm?new=1" },
  { id: "new-deal", title: "Create new deal", kind: "Create", to: "/crm?newdeal=1" },
  { id: "new-project", title: "Create new project", kind: "Create", to: "/projects?new=1" },
  { id: "new-proposal", title: "Create new proposal", kind: "Create", to: "/proposals?new=1" },
  { id: "ask-atlas", title: "Ask Atlas — AI copilot", kind: "AI", action: "copilot" },
];

export default function CommandPalette({ open, onClose, onOpenCopilot }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const nav = useNavigate();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ACTIONS;
    return ACTIONS.filter((a) => a.title.toLowerCase().includes(s) || a.kind.toLowerCase().includes(s));
  }, [q]);

  useEffect(() => setIdx(0), [q]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const run = (a) => {
    onClose?.();
    if (a.action === "copilot") onOpenCopilot?.();
    else if (a.to) nav(a.to);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && filtered[idx]) { e.preventDefault(); run(filtered[idx]); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, idx, filtered]); // eslint-disable-line

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          data-testid="palette"
        >
          <motion.div
            className="glass w-full max-w-2xl rounded-2xl overflow-hidden"
            initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                placeholder="Search or run command…"
                value={q} onChange={(e) => setQ(e.target.value)}
                className="flex-1 bg-transparent outline-none text-lg font-display tracking-tight"
                data-testid="palette-input"
              />
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">ESC</kbd>
            </div>
            <div className="max-h-96 overflow-auto p-1.5">
              {filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">No results</div>
              )}
              {filtered.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => run(a)}
                  onMouseEnter={() => setIdx(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${i === idx ? "bg-muted" : ""}`}
                  data-testid={`palette-item-${a.id}`}
                >
                  <div className="w-7 h-7 rounded-lg bg-muted grid place-items-center">
                    {a.kind === "AI" ? <Sparkles className="w-3.5 h-3.5 text-blue-500" /> : <Command className="w-3.5 h-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{a.title}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{a.kind}</div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
