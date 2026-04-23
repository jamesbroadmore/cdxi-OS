import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, Cell, CartesianGrid,
} from "recharts";
import {
  TrendingUp, Users, Briefcase, Activity, Sparkles, ArrowUpRight,
  Clock, Gauge, Rocket,
} from "lucide-react";
import api from "../lib/api";
import { Card, Badge } from "../components/ui/Primitives";
import { fmtMoney } from "../lib/utils";

const STAGE_COLORS = {
  lead: "#60a5fa", discovery: "#818cf8", proposal: "#a78bfa",
  won: "#34d399", onboarding: "#22d3ee", delivery: "#f472b6",
  growth: "#fbbf24", renewal: "#fb923c", lost: "#f87171",
};

function KpiCard({ label, value, delta, icon: Icon, accent = "text-blue-500", i = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04, duration: 0.3 }}
      className="relative"
    >
      <Card className="p-5 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="cdxi-label">{label}</div>
          <div className={`w-8 h-8 rounded-lg bg-muted grid place-items-center ${accent}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-3 font-mono text-3xl font-semibold tracking-tight">{value}</div>
        {delta && (
          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3 text-emerald-500" /> {delta}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

export default function Dashboard() {
  const [m, setM] = useState(null);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [d, a] = await Promise.all([
          api.get("/dashboard/metrics"),
          api.get("/activity"),
        ]);
        setM(d.data);
        setActivity(a.data);
      } catch (e) {}
    })();
  }, []);

  if (!m) {
    return (
      <div className="p-8 text-sm text-muted-foreground" data-testid="dashboard-loading">Loading command deck…</div>
    );
  }

  return (
    <div className="relative" data-testid="dashboard">
      <div className="ambient-glow relative p-6 lg:p-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="cdxi-label">Atlas · Command Deck</div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mt-1">
              Operate the venture.
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Live view across revenue, pipeline, delivery and your AI workforce.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="success">● systems nominal</Badge>
            <Badge tone="info">Helix · 6 agents online</Badge>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard i={0} label="Revenue · won" value={fmtMoney(m.revenue)} delta="+12% qoq" icon={TrendingUp} accent="text-emerald-500" />
          <KpiCard i={1} label="Pipeline open" value={fmtMoney(m.pipeline)} delta={`${m.total_deals} deals`} icon={Gauge} accent="text-blue-500" />
          <KpiCard i={2} label="MRR" value={fmtMoney(m.mrr)} delta="retainers est." icon={Activity} accent="text-indigo-500" />
          <KpiCard i={3} label="Client health" value={`${m.client_health}%`} delta={`${m.total_clients} clients`} icon={Users} accent="text-amber-500" />
          <KpiCard i={4} label="Active projects" value={m.active_projects} delta={`${m.open_tasks} open tasks`} icon={Briefcase} accent="text-rose-500" />
          <KpiCard i={5} label="Automation savings" value={fmtMoney(m.automation_savings)} delta="this quarter" icon={Sparkles} accent="text-cyan-500" />
        </div>
      </div>

      <div className="px-6 lg:px-8 pb-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="cdxi-label">Pulse · 8-week revenue</div>
              <h3 className="font-display text-xl font-semibold">Revenue flow</h3>
            </div>
            <Badge tone="info">Live</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={m.revenue_trend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="cdxi-label">Pipeline · by stage</div>
              <h3 className="font-display text-xl font-semibold">Stage mix</h3>
            </div>
            <Badge tone="muted">{m.total_deals} deals</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={m.pipeline_by_stage}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {m.pipeline_by_stage.map((d, i) => (
                    <Cell key={i} fill={STAGE_COLORS[d.stage] || "#60a5fa"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="cdxi-label">Activity stream</div>
              <h3 className="font-display text-xl font-semibold">Signal feed</h3>
            </div>
            <Badge tone="success">Realtime</Badge>
          </div>
          <div className="divide-y divide-border">
            {activity.length === 0 && <div className="py-6 text-sm text-muted-foreground">No recent activity.</div>}
            {activity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 py-3" data-testid={`activity-item-${i}`}>
                <div className="w-7 h-7 rounded-lg bg-muted grid place-items-center">
                  {a.type === "deal" ? <Gauge className="w-3.5 h-3.5 text-blue-500" /> :
                   a.type === "client" ? <Users className="w-3.5 h-3.5 text-amber-500" /> :
                   <Briefcase className="w-3.5 h-3.5 text-emerald-500" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-[11px] text-muted-foreground">{a.subtitle}</div>
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {a.at ? new Date(a.at).toLocaleDateString() : ""}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="cdxi-label">Operating mode</div>
            <h3 className="font-display text-2xl font-semibold mt-1">Executive</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">You're running the venture from the Atlas command deck. Switch modes for focus, building, or agent ops.</p>
            <div className="mt-4 space-y-2">
              {["Focus Mode", "Executive Mode", "Builder Mode", "Agent Ops"].map((m, i) => (
                <div key={m} className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${i === 1 ? "bg-foreground text-background" : "bg-muted/40"}`}>
                  <div className="flex items-center gap-2">
                    <Rocket className="w-3 h-3" /> {m}
                  </div>
                  {i === 1 && <Badge tone="accent">Active</Badge>}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
