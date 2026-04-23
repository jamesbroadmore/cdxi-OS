import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles, Zap } from "lucide-react";
import api from "../lib/api";
import { Card, Badge, Button } from "../components/ui/Primitives";
import { useCopilot } from "../context/CopilotContext";

const CAT_TONE = { Growth: "success", Delivery: "info", Operations: "warning" };

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const { openWith } = useCopilot();
  useEffect(() => { api.get("/agents").then(({ data }) => setAgents(data)); }, []);

  const deploy = (a) => {
    const prompts = {
      "growth-lead-gen": "Act as a Lead Gen Strategist for cdxi. Map an ideal-customer profile and 5 sources to mine for the next 20 qualified leads.",
      "growth-sales-outreach": "Act as our Sales Outreach Agent. Draft a 3-step cold email sequence for a cdxi prospect, varying angle and CTA.",
      "delivery-content": "Act as our Content Writer. Draft an SEO brief + 300-word intro for a post on 'internal operating systems for modern studios'.",
      "delivery-proposal": "Act as our Proposal Drafter. Draft a scope + pricing for a growth retainer based on our current pipeline signals.",
      "ops-admin": "Act as our Admin Assistant. Triage this week's priorities from the workspace and propose a schedule.",
      "ops-finance": "Act as our Finance Analyst. Summarise deal economics and flag margin risk across current projects.",
    };
    openWith(prompts[a.id] || `Act as ${a.name}. ${a.description}`);
  };

  const grouped = agents.reduce((m, a) => { (m[a.category] ||= []).push(a); return m; }, {});

  return (
    <div className="p-6 lg:p-8" data-testid="agents-page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="cdxi-label">Helix · Agent OS</div>
          <h1 className="font-display text-3xl font-bold tracking-tight">AI workforce</h1>
          <p className="text-sm text-muted-foreground mt-1">Internal AI workforce for cdxi — growth, delivery and ops agents. Hire one. Orchestrate many.</p>
        </div>
        <Badge tone="info">6 agents online</Badge>
      </div>

      {Object.entries(grouped).map(([cat, list], gi) => (
        <section key={cat} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-display text-lg font-semibold">{cat}</h3>
            <Badge tone={CAT_TONE[cat] || "muted"}>{list.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {list.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (gi * list.length + i) * 0.03 }}>
                <Card className="p-5 h-full relative overflow-hidden" data-testid={`agent-card-${a.id}`}>
                  <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />
                  <div className="relative flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center shadow-lg shadow-blue-500/30">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-base font-semibold">{a.name}</div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{a.persona}</div>
                    </div>
                    <Badge tone={a.status === "ready" ? "success" : "warning"}>{a.status}</Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{a.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {a.skills.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-muted text-[10px] font-mono">{s}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => deploy(a)} data-testid={`agent-deploy-${a.id}`}><Zap className="w-3 h-3" /> Deploy</Button>
                    <Button size="sm" variant="ghost" onClick={() => deploy(a)}><Sparkles className="w-3 h-3" /> Configure</Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
