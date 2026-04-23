import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, Briefcase, FileText, Bot, Workflow,
  BookOpen, Coins, Rocket, Settings, ChevronsLeft, ChevronsRight, GitBranch,
} from "lucide-react";
import { cn } from "../lib/utils";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Home", codename: "Atlas" },
  { to: "/crm", icon: GitBranch, label: "Pipeline", codename: "Pulse" },
  { to: "/clients", icon: Users, label: "Clients", codename: "Pulse" },
  { to: "/projects", icon: Briefcase, label: "Projects", codename: "Orbit" },
  { to: "/proposals", icon: FileText, label: "Proposals", codename: "Vault" },
  { to: "/agents", icon: Bot, label: "Agents", codename: "Helix" },
  { to: "/automations", icon: Workflow, label: "Automations", codename: "Forge", soon: true },
  { to: "/knowledge", icon: BookOpen, label: "Knowledge", codename: "Vault", soon: true },
  { to: "/finance", icon: Coins, label: "Finance", codename: "Pulse", soon: true },
  { to: "/studio", icon: Rocket, label: "Studio", codename: "Orbit", soon: true },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  return (
    <aside
      className={cn(
        "relative z-20 shrink-0 border-r border-border bg-background/60 backdrop-blur-xl transition-all duration-200",
        collapsed ? "w-[72px]" : "w-64",
      )}
      data-testid="sidebar"
    >
      <div className={cn("flex items-center gap-2 p-4 border-b border-border", collapsed ? "justify-center" : "px-5")}>
        {collapsed ? (
          <div className="font-logo text-2xl lowercase">c</div>
        ) : (
          <div className="flex flex-col leading-none">
            <div className="font-logo text-2xl lowercase tracking-tight">cdxi</div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground mt-1">Internal OS</div>
          </div>
        )}
      </div>

      <nav className="p-2 space-y-0.5">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            data-testid={`nav-${n.label.toLowerCase()}`}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition relative",
                isActive
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            <n.icon className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 font-medium">{n.label}</span>
                {n.soon && <span className="text-[9px] font-mono text-muted-foreground/70">soon</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="absolute bottom-3 left-0 right-0 px-2">
        <NavLink
          to="/settings"
          data-testid="nav-settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
              isActive ? "bg-foreground/10 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )
          }
        >
          <Settings className="w-4 h-4" />
          {!collapsed && <span className="font-medium">Settings</span>}
        </NavLink>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-2 w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition"
          data-testid="sidebar-collapse"
        >
          {collapsed ? <ChevronsRight className="w-4 h-4" /> : <><ChevronsLeft className="w-4 h-4" /> Collapse</>}
        </button>
      </div>
    </aside>
  );
}
