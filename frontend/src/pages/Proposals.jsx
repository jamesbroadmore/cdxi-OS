import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import api from "../lib/api";
import { Button, Input, Label, Select, Textarea, Card, Badge } from "../components/ui/Primitives";
import Modal from "../components/Modal";
import { fmtMoney } from "../lib/utils";

const STATUS_TONE = { draft: "muted", sent: "info", accepted: "success", declined: "danger" };

function blankForm() {
  return {
    title: "", client_id: "", client_name: "", status: "draft",
    currency: "USD", notes: "",
    lines: [{ title: "", description: "", qty: 1, rate: 0 }],
  };
}

export default function Proposals() {
  const [items, setItems] = useState([]);
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blankForm());

  const load = async () => {
    const [p, c] = await Promise.all([api.get("/proposals"), api.get("/clients")]);
    setItems(p.data); setClients(c.data);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(blankForm()); setOpen(true); };
  const openEdit = (p) => {
    setEditing(p);
    setForm({ title: p.title, client_id: p.client_id || "", client_name: p.client_name || "", status: p.status, currency: p.currency || "USD", notes: p.notes || "", lines: p.lines?.length ? p.lines : [{ title: "", description: "", qty: 1, rate: 0 }] });
    setOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      lines: form.lines.map((l) => ({ ...l, qty: Number(l.qty) || 0, rate: Number(l.rate) || 0 })),
    };
    if (editing) await api.put(`/proposals/${editing.id}`, payload);
    else await api.post("/proposals", payload);
    setOpen(false); setEditing(null); setForm(blankForm());
    load();
  };

  const onDelete = async (p) => {
    if (!window.confirm(`Delete proposal "${p.title}"?`)) return;
    await api.delete(`/proposals/${p.id}`); load();
  };

  const total = form.lines.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);

  return (
    <div className="p-6 lg:p-8" data-testid="proposals">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="cdxi-label">Vault · Proposal engine</div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Proposals</h1>
          <p className="text-sm text-muted-foreground mt-1">Scope, price and close work for cdxi and its brands.</p>
        </div>
        <Button onClick={openNew} data-testid="new-proposal-btn"><Plus className="w-4 h-4" /> New proposal</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="p-5" data-testid={`proposal-card-${p.id}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted grid place-items-center text-blue-500"><FileText className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="cdxi-label">{p.client_name || "—"}</div>
                  <div className="font-semibold truncate">{p.title}</div>
                </div>
                <Badge tone={STATUS_TONE[p.status] || "muted"}>{p.status}</Badge>
              </div>
              <div className="mt-4 font-mono text-2xl font-semibold">{fmtMoney(p.total || 0, p.currency)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{p.lines?.length || 0} line items</div>
              <div className="mt-4 flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => openEdit(p)} data-testid={`proposal-edit-${p.id}`}><Pencil className="w-3 h-3" /> Edit</Button>
                <Button size="sm" variant="ghost" className="text-rose-500 hover:bg-rose-500/10 ml-auto" onClick={() => onDelete(p)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </Card>
          </motion.div>
        ))}
        {items.length === 0 && <div className="col-span-full py-14 text-center text-sm text-muted-foreground">No proposals yet.</div>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit proposal" : "New proposal"} width="lg">
        <form onSubmit={onSubmit} className="space-y-4" data-testid="proposal-form">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Title</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="proposal-title" /></div>
            <div><Label>Status</Label><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="declined">Declined</option>
            </Select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="mb-0">Line items</Label>
              <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, lines: [...form.lines, { title: "", description: "", qty: 1, rate: 0 }] })}><Plus className="w-3 h-3" /> Add line</Button>
            </div>
            <div className="space-y-2">
              {form.lines.map((l, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start p-2 rounded-xl border border-border">
                  <Input className="col-span-5" placeholder="Title" value={l.title} onChange={(e) => { const lines = [...form.lines]; lines[idx] = { ...l, title: e.target.value }; setForm({ ...form, lines }); }} />
                  <Input className="col-span-3" placeholder="Description" value={l.description} onChange={(e) => { const lines = [...form.lines]; lines[idx] = { ...l, description: e.target.value }; setForm({ ...form, lines }); }} />
                  <Input className="col-span-1" type="number" placeholder="Qty" value={l.qty} onChange={(e) => { const lines = [...form.lines]; lines[idx] = { ...l, qty: e.target.value }; setForm({ ...form, lines }); }} />
                  <Input className="col-span-2" type="number" placeholder="Rate" value={l.rate} onChange={(e) => { const lines = [...form.lines]; lines[idx] = { ...l, rate: e.target.value }; setForm({ ...form, lines }); }} />
                  <button type="button" onClick={() => setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) })} className="col-span-1 p-2 rounded-lg hover:bg-muted text-rose-500 justify-self-end"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-end gap-3 px-2">
              <span className="cdxi-label">Total</span>
              <span className="font-mono text-xl font-semibold">{fmtMoney(total, form.currency)}</span>
            </div>
          </div>

          <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" data-testid="proposal-save">{editing ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
