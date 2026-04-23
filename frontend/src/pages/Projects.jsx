import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, ArrowLeft, Flag, CheckCircle2, Circle, Clock } from "lucide-react";
import api from "../lib/api";
import { Button, Input, Label, Select, Textarea, Card, Badge } from "../components/ui/Primitives";
import Modal from "../components/Modal";
import { fmtMoney } from "../lib/utils";

const STATUS_TONE = { planning: "info", active: "success", paused: "warning", complete: "muted" };
const TASK_COLS = [
  { id: "backlog", label: "Backlog" },
  { id: "in_progress", label: "In progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [active, setActive] = useState(null); // project detail
  const [tasks, setTasks] = useState([]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", client_id: "", client_name: "", status: "active", budget: 0, progress: 0, description: "", due_date: "" });

  const [taskOpen, setTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", status: "backlog", priority: "med", assignee: "You" });

  const load = async () => {
    const [p, c] = await Promise.all([api.get("/projects"), api.get("/clients")]);
    setProjects(p.data); setClients(c.data);
  };
  useEffect(() => { load(); }, []);

  const loadTasks = async (pid) => {
    const { data } = await api.get("/tasks", { params: { project_id: pid } });
    setTasks(data);
  };

  useEffect(() => { if (active) loadTasks(active.id); }, [active]);

  const openNew = () => { setEditing(null); setForm({ name: "", client_id: "", client_name: "", status: "active", budget: 0, progress: 0, description: "", due_date: "" }); setOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.name, client_id: p.client_id || "", client_name: p.client_name || "", status: p.status, budget: p.budget, progress: p.progress, description: p.description || "", due_date: p.due_date || "" }); setOpen(true); };

  const onSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form, budget: Number(form.budget) || 0, progress: Number(form.progress) || 0 };
    if (editing) await api.put(`/projects/${editing.id}`, payload);
    else await api.post("/projects", payload);
    setOpen(false); setEditing(null);
    load();
  };

  const onDelete = async (p) => {
    if (!window.confirm(`Delete project ${p.name}?`)) return;
    await api.delete(`/projects/${p.id}`);
    setActive(null); load();
  };

  const createTask = async (e) => {
    e.preventDefault();
    await api.post("/tasks", { ...taskForm, project_id: active.id });
    setTaskOpen(false);
    setTaskForm({ title: "", description: "", status: "backlog", priority: "med", assignee: "You" });
    loadTasks(active.id);
  };

  const moveTask = async (t, status) => {
    await api.patch(`/tasks/${t.id}/status`, { status });
    setTasks((ts) => ts.map((x) => x.id === t.id ? { ...x, status } : x));
  };

  const byStatus = useMemo(() => {
    const m = {};
    TASK_COLS.forEach((c) => (m[c.id] = []));
    tasks.forEach((t) => (m[t.status] ||= []).push(t));
    return m;
  }, [tasks]);

  if (active) {
    return (
      <div className="p-6 lg:p-8" data-testid="project-detail">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setActive(null)} data-testid="back-projects"><ArrowLeft className="w-4 h-4" /></Button>
            <div>
              <div className="cdxi-label">Project · {active.client_name || "—"}</div>
              <h1 className="font-display text-3xl font-bold tracking-tight">{active.name}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONE[active.status] || "muted"}>{active.status}</Badge>
            <Button variant="outline" size="sm" onClick={() => openEdit(active)} data-testid="project-edit-btn">Edit</Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(active)} className="text-rose-500 hover:bg-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-4"><div className="cdxi-label">Budget</div><div className="font-mono text-xl mt-1">{fmtMoney(active.budget)}</div></Card>
          <Card className="p-4"><div className="cdxi-label">Progress</div><div className="font-mono text-xl mt-1">{active.progress}%</div><div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${active.progress}%` }} /></div></Card>
          <Card className="p-4"><div className="cdxi-label">Tasks</div><div className="font-mono text-xl mt-1">{tasks.length}</div></Card>
          <Card className="p-4"><div className="cdxi-label">Open</div><div className="font-mono text-xl mt-1">{tasks.filter((t) => t.status !== "done").length}</div></Card>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-xl font-semibold">Task board</h3>
          <Button size="sm" onClick={() => setTaskOpen(true)} data-testid="new-task-btn"><Plus className="w-3.5 h-3.5" /> New task</Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {TASK_COLS.map((col) => (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const id = e.dataTransfer.getData("task"); const t = tasks.find((x) => x.id === id); if (t) moveTask(t, col.id); }}
              data-testid={`task-col-${col.id}`}
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <Badge tone={col.id === "done" ? "success" : col.id === "review" ? "warning" : "info"}>{col.label}</Badge>
                <span className="font-mono text-[10px] text-muted-foreground">{byStatus[col.id]?.length || 0}</span>
              </div>
              <div className="space-y-2 min-h-[150px]">
                {(byStatus[col.id] || []).map((t) => (
                  <div
                    key={t.id} draggable
                    onDragStart={(e) => e.dataTransfer.setData("task", t.id)}
                    className="glass rounded-xl p-3 cursor-grab active:cursor-grabbing"
                    data-testid={`task-card-${t.id}`}
                  >
                    <div className="flex items-start gap-2">
                      {t.status === "done" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />}
                      <div className="flex-1 text-sm font-medium">{t.title}</div>
                    </div>
                    {t.description && <div className="mt-1 pl-5 text-[11px] text-muted-foreground line-clamp-2">{t.description}</div>}
                    <div className="mt-2 pl-5 flex items-center gap-2">
                      <Flag className={`w-3 h-3 ${t.priority === "high" ? "text-rose-500" : t.priority === "low" ? "text-muted-foreground" : "text-amber-500"}`} />
                      <span className="text-[10px] font-mono text-muted-foreground">{t.assignee}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Modal open={taskOpen} onClose={() => setTaskOpen(false)} title="New task">
          <form onSubmit={createTask} className="space-y-4" data-testid="task-form">
            <div><Label>Title</Label><Input required value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} data-testid="task-title" /></div>
            <div><Label>Description</Label><Textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Status</Label><Select value={taskForm.status} onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}>{TASK_COLS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></div>
              <div><Label>Priority</Label><Select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}><option value="low">Low</option><option value="med">Med</option><option value="high">High</option></Select></div>
              <div><Label>Assignee</Label><Input value={taskForm.assignee} onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setTaskOpen(false)}>Cancel</Button><Button type="submit" data-testid="task-save">Create</Button></div>
          </form>
        </Modal>

        <Modal open={open} onClose={() => setOpen(false)} title="Edit project">
          <ProjectForm form={form} setForm={setForm} clients={clients} onSubmit={onSubmit} onCancel={() => setOpen(false)} editing={!!editing} />
        </Modal>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8" data-testid="projects">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="cdxi-label">Orbit · Delivery OS</div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Active engagements, delivery and team workload.</p>
        </div>
        <Button onClick={openNew} data-testid="new-project-btn"><Plus className="w-4 h-4" /> New project</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((p, i) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="p-5 h-full flex flex-col cursor-pointer hover:border-blue-500/40 transition" onClick={() => setActive(p)} data-testid={`project-card-${p.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="cdxi-label">{p.client_name || "Internal"}</div>
                  <div className="font-display text-lg font-semibold mt-0.5">{p.name}</div>
                </div>
                <Badge tone={STATUS_TONE[p.status] || "muted"}>{p.status}</Badge>
              </div>
              {p.description && <div className="mt-2 text-xs text-muted-foreground line-clamp-2">{p.description}</div>}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="cdxi-label">Progress</span>
                  <span className="font-mono">{p.progress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${p.progress}%` }} />
                </div>
              </div>
              <div className="mt-auto pt-4 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.due_date || "no due date"}</span>
                <span>{fmtMoney(p.budget)}</span>
              </div>
            </Card>
          </motion.div>
        ))}
        {projects.length === 0 && <div className="col-span-full py-14 text-center text-sm text-muted-foreground">No projects — launch your first engagement.</div>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit project" : "New project"}>
        <ProjectForm form={form} setForm={setForm} clients={clients} onSubmit={onSubmit} onCancel={() => setOpen(false)} editing={!!editing} />
      </Modal>
    </div>
  );
}

function ProjectForm({ form, setForm, clients, onSubmit, onCancel, editing }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="project-form">
      <div><Label>Name</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="project-name" /></div>
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
        <div>
          <Label>Status</Label>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="planning">Planning</option><option value="active">Active</option>
            <option value="paused">Paused</option><option value="complete">Complete</option>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Budget</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></div>
        <div><Label>Progress (%)</Label><Input type="number" value={form.progress} onChange={(e) => setForm({ ...form, progress: e.target.value })} /></div>
      </div>
      <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button><Button type="submit" data-testid="project-save">{editing ? "Save" : "Create"}</Button></div>
    </form>
  );
}
