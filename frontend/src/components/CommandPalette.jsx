import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ArrowRight, Sparkles, Command, Users, Briefcase, FileText, Gauge, Bot, LayoutDashboard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

const STATIC_ACTIONS = [
  { id: "go-home", title: "Go to Home", kind: "Navigate", icon: LayoutDashboard, to: "/" },
  { id: "go-crm", title: "Open Pipeline", kind: "Navigate", icon: Gauge, to: "/crm" },
  { id: "go-clients", title: "Open Clients", kind: "Navigate", icon: Users, to: "/clients" },
  { id: "go-projects", title: "Open Projects", kind: "Navigate", icon: Briefcase, to: "/projects" },
  { id: "go-proposals", title: "Open Proposals", kind: "Navigate", icon: FileText, to: "/proposals" },
  { id: "go-agents", title: "Open Agents", kind: "Navigate", icon: Bot, to: "/agents" },
  { id: "go-settings", title: "Open Settings", kind: "Navigate", icon: Command, to: "/settings" },
  { id: "new-client", title: "New client", kind: "Create", icon: Users, to: "/clients?new=1" },
  { id: "new-deal", title: "New deal", kind: "Create", icon: Gauge, to: "/crm?newdeal=1" },
  { id: "new-project", title: "New project", kind: "Create", icon: Briefcase, to: "/projects?new=1" },
  { id: "new-proposal", title: "New proposal", kind: "Create", icon: FileText, to: "/proposals?new=1" },
  { id: "ask-atlas", title: "Ask Atlas — AI copilot", kind: "AI", icon: Sparkles, action: "copilot" },
];

export default function CommandPalette({ open, onClose, onOpenCopilot }) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [entities, setEntities] = useState({ clients: [], deals: [], projects: [], proposals: [] });
  const nav = useNavigate();

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [c, d, p, pr] = await Promise.all([
          api.get("/clients"), api.get("/deals"), api.get("/projects"), api.get("/proposals"),
        ]);
        setEntities({ clients: c.data, deals: d.data, projects: p.data, proposals: pr.data });
      } catch {}
    })();
  }, [open]);

  useEffect(() => setIdx(0), [q]);
  useEffect(() => { if (!open) setQ(""); }, [open]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const staticFiltered = STATIC_ACTIONS.filter((a) =>
      !s || a.title.toLowerCase().includes(s) || a.kind.toLowerCase().includes(s)
    );

    if (!s) return staticFiltered;

    const hits = (arr, type, icon, route) =>
      arr
        .filter((x) => (x.name || x.title || "").toLowerCase().includes(s))
        .slice(0, 4)
        .map((x) => ({
          id: `${type}-${x.id}`,
          title: x.name || x.title,
          subtitle: x.client_name || x.company || x.email || x.status || "",
          kind: type,
          icon,
          to: route,
        }));

    return [
      ...hits(entities.clients, "Client", Users, "/clients"),
      ...hits(entities.deals, "Deal", Gauge, "/crm"),
      ...hits(entities.projects, "Project", Briefcase, "/projects"),
      ...hits(entities.proposals, "Proposal", FileText, "/proposals"),
      ...staticFiltered,
    ];
  }, [q, entities]);

  const run = (a) => {
    onClose?.();
    if (a.action === "copilot") onOpenCopilot?.();
    else if (a.to) nav(a.to);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && results[idx]) { e.preventDefault(); run(results[idx]); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, idx, results]); // eslint-disable-line

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
                placeholder="Search clients, deals, projects or run a command…"
                value={q} onChange={(e) => setQ(e.target.value)}
                className="flex-1 bg-transparent outline-none text-lg font-display tracking-tight"
                data-testid="palette-input"
              />
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">ESC</kbd>
            </div>
            <div className="max-h-96 overflow-auto p-1.5">
              {results.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">No results</div>
              )}
              {results.map((a, i) => {
                const Icon = a.icon || Command;
                return (
                  <button
                    key={a.id}
                    onClick={() => run(a)}
                    onMouseEnter={() => setIdx(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${i === idx ? "bg-muted" : ""}`}
                    data-testid={`palette-item-${a.id}`}
                  >
                    <div className="w-7 h-7 rounded-lg bg-muted grid place-items-center">
                      {a.kind === "AI" ? <Sparkles className="w-3.5 h-3.5 text-blue-500" /> : <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{a.title}</div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">
                        {a.kind}{a.subtitle ? ` · ${a.subtitle}` : ""}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>↑↓ navigate · ↵ select</span>
              <span className="flex items-center gap-1"><Command className="w-2.5 h-2.5" /> K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
