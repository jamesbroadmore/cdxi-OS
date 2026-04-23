import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Briefcase, FileText, Loader2 } from "lucide-react";
import { Card, Badge } from "../components/ui/Primitives";
import { fmtMoney, initials } from "../lib/utils";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ClientPortal() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    axios.get(`${API}/portal/${token}`).then(({ data }) => setData(data)).catch((e) => setErr("Portal not found or expired."));
  }, [token]);

  if (err) return (
    <div className="min-h-screen grid place-items-center p-10 bg-background text-foreground">
      <Card className="p-8 max-w-md text-center">
        <h2 className="font-display text-xl font-semibold">Portal unavailable</h2>
        <p className="text-sm text-muted-foreground mt-2">{err}</p>
      </Card>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen grid place-items-center bg-background text-foreground">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );

  const { client, projects, proposals } = data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="relative ambient-glow">
        <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-10 py-14">
          <div className="flex items-center justify-between">
            <div className="font-logo text-2xl lowercase tracking-tight">cdxi</div>
            <Badge tone="info">Client portal</Badge>
          </div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-12">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white grid place-items-center font-display text-xl font-bold">
                {initials(client.name)}
              </div>
              <div>
                <div className="cdxi-label">Welcome</div>
                <h1 className="font-display text-4xl font-bold tracking-tight">{client.name}</h1>
                <div className="text-sm text-muted-foreground">{client.company || client.email}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10 pb-20 space-y-8">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-blue-500" />
            <h3 className="font-display text-xl font-semibold">Active engagements</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {projects.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No active projects yet.</Card>}
            {projects.map((p) => (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="cdxi-label">Project</div>
                    <div className="font-display text-lg font-semibold">{p.name}</div>
                  </div>
                  <Badge tone={p.status === "active" ? "success" : "muted"}>{p.status}</Badge>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs"><span className="cdxi-label">Progress</span><span className="font-mono">{p.progress}%</span></div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${p.progress}%` }} /></div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-indigo-500" />
            <h3 className="font-display text-xl font-semibold">Proposals & agreements</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {proposals.length === 0 && <Card className="p-6 text-sm text-muted-foreground">No proposals to review.</Card>}
            {proposals.map((p) => (
              <Card key={p.id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="cdxi-label">Proposal</div>
                    <div className="font-display text-lg font-semibold">{p.title}</div>
                  </div>
                  <Badge tone={p.status === "accepted" ? "success" : p.status === "sent" ? "info" : "muted"}>{p.status}</Badge>
                </div>
                <div className="mt-3 font-mono text-2xl font-semibold">{fmtMoney(p.total || 0, p.currency)}</div>
                <div className="text-xs text-muted-foreground mt-1">{p.lines?.length || 0} line items</div>
              </Card>
            ))}
          </div>
        </section>

        <div className="pt-6 text-center text-xs text-muted-foreground">
          Delivered via <span className="font-logo lowercase text-sm text-foreground">cdxi</span> · Venture Operating System
        </div>
      </div>
    </div>
  );
}
