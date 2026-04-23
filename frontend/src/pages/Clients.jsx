import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Share2, Copy, Check } from "lucide-react";
import api from "../lib/api";
import { Button, Input, Label, Select, Textarea, Card, Badge } from "../components/ui/Primitives";
import Modal from "../components/Modal";
import { initials } from "../lib/utils";

const STATUS_TONE = { active: "success", prospect: "info", at_risk: "warning", churned: "danger" };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [shareFor, setShareFor] = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", status: "active", health_score: 80, notes: "" });

  const load = async () => { const { data } = await api.get("/clients"); setClients(data); };
  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, health_score: Number(form.health_score) || 0 };
    if (editing) await api.put(`/clients/${editing.id}`, payload);
    else await api.post("/clients", payload);
    setOpen(false); setEditing(null);
    setForm({ name: "", email: "", company: "", phone: "", status: "active", health_score: 80, notes: "" });
    load();
  };

  const onDelete = async (c) => {
    if (!window.confirm(`Delete client ${c.name}?`)) return;
    await api.delete(`/clients/${c.id}`); load();
  };

  const openNew = () => { setEditing(null); setForm({ name: "", email: "", company: "", phone: "", status: "active", health_score: 80, notes: "" }); setOpen(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, email: c.email || "", company: c.company || "", phone: c.phone || "", status: c.status, health_score: c.health_score, notes: c.notes || "" }); setOpen(true); };

  const share = async (c) => {
    const { data } = await api.post(`/clients/${c.id}/share`, {});
    const url = `${window.location.origin}/portal/${data.share_token}`;
    setShareFor(c); setShareUrl(url); setCopied(false);
  };

  return (
    <div className="p-6 lg:p-8" data-testid="clients">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="cdxi-label">Clients</div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">All relationships, health and portal access in one place.</p>
        </div>
        <Button onClick={openNew} data-testid="new-client-btn"><Plus className="w-4 h-4" /> New client</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="p-5 h-full flex flex-col" data-testid={`client-card-${c.id}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white grid place-items-center font-semibold">
                  {initials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{c.company || c.email || "—"}</div>
                </div>
                <Badge tone={STATUS_TONE[c.status] || "muted"}>{c.status.replace("_", " ")}</Badge>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="cdxi-label">Health</span>
                  <span className="font-mono">{c.health_score}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500" style={{ width: `${c.health_score}%` }} />
                </div>
              </div>
              {c.notes && <div className="mt-3 text-xs text-muted-foreground line-clamp-2">{c.notes}</div>}
              <div className="mt-auto pt-4 flex items-center gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => openEdit(c)} data-testid={`client-edit-${c.id}`}><Pencil className="w-3 h-3" /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => share(c)} data-testid={`client-share-${c.id}`}><Share2 className="w-3 h-3" /> Portal</Button>
                <Button size="sm" variant="ghost" className="ml-auto text-rose-500 hover:bg-rose-500/10" onClick={() => onDelete(c)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </Card>
          </motion.div>
        ))}
        {clients.length === 0 && (
          <div className="col-span-full py-14 text-center text-sm text-muted-foreground">No clients yet — create your first account.</div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit client" : "New client"}>
        <form onSubmit={onSubmit} className="space-y-4" data-testid="client-form">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="client-name" /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="prospect">Prospect</option>
                <option value="at_risk">At risk</option>
                <option value="churned">Churned</option>
              </Select>
            </div>
            <div><Label>Health (0–100)</Label><Input type="number" value={form.health_score} onChange={(e) => setForm({ ...form, health_score: e.target.value })} /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" data-testid="client-save">{editing ? "Save" : "Create"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!shareFor} onClose={() => setShareFor(null)} title={`Client Portal — ${shareFor?.name || ""}`} width="md">
        <p className="text-sm text-muted-foreground mb-3">Share this secure link with your client. They'll see projects, proposals and deliverables — read-only.</p>
        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-muted/30 font-mono text-xs break-all" data-testid="share-url">
          {shareUrl}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setShareFor(null)}>Close</Button>
          <Button onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }} data-testid="share-copy">
            {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy link</>}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
