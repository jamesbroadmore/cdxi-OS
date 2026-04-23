import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, DollarSign } from "lucide-react";
import api from "../lib/api";
import { Button, Input, Label, Select, Textarea, Card, Badge } from "../components/ui/Primitives";
import Modal from "../components/Modal";
import { fmtMoney } from "../lib/utils";

const STAGES = [
  { id: "lead", label: "Lead" },
  { id: "discovery", label: "Discovery" },
  { id: "proposal", label: "Proposal" },
  { id: "won", label: "Won" },
  { id: "onboarding", label: "Onboard" },
  { id: "delivery", label: "Delivery" },
  { id: "growth", label: "Growth" },
  { id: "renewal", label: "Renewal" },
];

const STAGE_TONE = {
  lead: "info", discovery: "info", proposal: "accent", won: "success",
  onboarding: "info", delivery: "warning", growth: "success", renewal: "warning",
};

export default function CRM() {
  const [deals, setDeals] = useState([]);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: "", value: 0, stage: "lead", probability: 20, client_id: "", client_name: "", notes: "", owner: "You",
  });

  const load = async () => {
    const [d, c] = await Promise.all([api.get("/deals"), api.get("/clients")]);
    setDeals(d.data); setClients(c.data);
  };
  useEffect(() => { load(); }, []);

  const byStage = useMemo(() => {
    const m = {};
    STAGES.forEach((s) => (m[s.id] = []));
    deals.forEach((d) => { (m[d.stage] ||= []).push(d); });
    return m;
  }, [deals]);

  const stageTotal = (stage) => byStage[stage]?.reduce((a, d) => a + (d.value || 0), 0) || 0;

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, value: Number(form.value) || 0, probability: Number(form.probability) || 0 };
    if (editing) await api.put(`/deals/${editing.id}`, payload);
    else await api.post("/deals", payload);
    setOpen(false); setEditing(null);
    setForm({ title: "", value: 0, stage: "lead", probability: 20, client_id: "", client_name: "", notes: "", owner: "You" });
    load();
  };

  const openNew = () => {
    setEditing(null);
    setForm({ title: "", value: 0, stage: "lead", probability: 20, client_id: "", client_name: "", notes: "", owner: "You" });
    setOpen(true);
  };
  const openEdit = (d) => {
    setEditing(d);
    setForm({ title: d.title, value: d.value, stage: d.stage, probability: d.probability, client_id: d.client_id || "", client_name: d.client_name || "", notes: d.notes || "", owner: d.owner || "" });
    setOpen(true);
  };
  const onDelete = async (d) => {
    if (!window.confirm(`Delete deal "${d.title}"?`)) return;
    await api.delete(`/deals/${d.id}`); load();
  };
  const moveStage = async (d, stage) => {
    await api.patch(`/deals/${d.id}/stage`, { stage });
    setDeals((ds) => ds.map((x) => x.id === d.id ? { ...x, stage } : x));
  };

  // HTML5 drag & drop
  const onDrop = (e, stage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("deal");
    const d = deals.find((x) => x.id === id);
    if (d && d.stage !== stage) moveStage(d, stage);
  };

  return (
    <div className="p-6 lg:p-8" data-testid="crm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="cdxi-label">Pulse · Client OS</div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-1">Drag deals across the venture lifecycle.</p>
        </div>
        <Button onClick={openNew} data-testid="new-deal-btn"><Plus className="w-4 h-4" /> New deal</Button>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {STAGES.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="kanban-col"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, s.id)}
              data-testid={`kanban-col-${s.id}`}
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                  <Badge tone={STAGE_TONE[s.id] || "muted"}>{s.label}</Badge>
                  <span className="text-[10px] text-muted-foreground font-mono">{byStage[s.id]?.length || 0}</span>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">{fmtMoney(stageTotal(s.id))}</div>
              </div>
              <div className="space-y-2 min-h-[120px]">
                {(byStage[s.id] || []).map((d) => (
                  <motion.div
                    key={d.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("deal", d.id)}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -1 }}
                    className="glass rounded-xl p-3 cursor-grab active:cursor-grabbing"
                    data-testid={`deal-card-${d.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold leading-tight">{d.title}</div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(d)} className="p-1 rounded hover:bg-muted" data-testid={`deal-edit-${d.id}`}>
                          <Pencil className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <button onClick={() => onDelete(d)} className="p-1 rounded hover:bg-muted">
                          <Trash2 className="w-3 h-3 text-rose-500" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{d.client_name || "—"}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm font-mono">
                        <DollarSign className="w-3 h-3 text-emerald-500" />
                        {fmtMoney(d.value)}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">{d.probability}%</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit deal" : "New deal"}>
        <form onSubmit={onSubmit} className="space-y-4" data-testid="deal-form">
          <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nova Robotics · Growth retainer" data-testid="deal-title" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Value</Label><Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} data-testid="deal-value" /></div>
            <div><Label>Probability (%)</Label><Input type="number" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Stage</Label>
              <Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </Select>
            </div>
            <div>
              <Label>Client</Label>
              <Select value={form.client_id} onChange={(e) => {
                const c = clients.find((x) => x.id === e.target.value);
                setForm({ ...form, client_id: e.target.value, client_name: c?.name || "" });
              }}>
                <option value="">— none —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" data-testid="deal-save">{editing ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
