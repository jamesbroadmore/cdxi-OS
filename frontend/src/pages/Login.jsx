import React, { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Label } from "../components/ui/Primitives";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";

export default function Login() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("parker@cdxi.au");
  const [password, setPassword] = useState("220191");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await login(email.trim(), password);
      nav("/");
    } catch (ex) {
      const d = ex?.response?.data?.detail;
      setErr(typeof d === "string" ? d : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground grid lg:grid-cols-2">
      <div className="grid-bg absolute inset-0 opacity-30 pointer-events-none" />
      <div className="absolute inset-0 ambient-glow pointer-events-none" />

      <div className="relative z-10 flex flex-col justify-between p-10 lg:p-14">
        <div className="flex flex-col leading-none">
          <div className="font-logo text-3xl lowercase tracking-tight">cdxi</div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mt-1.5">Venture Operating System</div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="max-w-lg"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs mb-5">
            <Sparkles className="w-3 h-3 text-blue-500" /> v1.0 Strategic Platform
          </div>
          <h1 className="font-display text-5xl lg:text-6xl font-bold leading-[1.02] tracking-tight">
            Operate the venture.<br />
            <span className="text-muted-foreground">Automate the growth.</span>
          </h1>
          <p className="mt-6 text-muted-foreground leading-relaxed">
            cdxi OS is the AI-native operating system for running service businesses, managing clients, orchestrating agents and scaling digital ventures — from a single control layer.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Atlas · Command", "Forge · Automations", "Helix · Agents", "Vault · Knowledge", "Pulse · Analytics"].map((n) => (
              <div key={n} className="px-3 py-1.5 rounded-lg glass text-xs font-mono">{n}</div>
            ))}
          </div>
        </motion.div>

        <div className="text-xs text-muted-foreground">© 2026 cdxi Labs · Built for operators, founders and venture studios.</div>
      </div>

      <div className="relative z-10 flex items-center justify-center p-8 lg:p-14">
        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
          className="glass w-full max-w-md rounded-2xl p-8"
          data-testid="login-form"
        >
          <h2 className="font-display text-2xl font-semibold">Sign in to your workspace</h2>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, operator.</p>

          <div className="mt-6 space-y-4">
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} required type="email" placeholder="you@company.com" data-testid="login-email" />
            </div>
            <div>
              <Label>Password</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} required type="password" placeholder="••••••••" data-testid="login-password" />
            </div>
            {err && <div className="text-xs text-rose-500" data-testid="login-error">{err}</div>}
            <Button type="submit" className="w-full" data-testid="login-submit" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Enter cdxi OS <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <div className="text-center text-sm">
            Need an account?{" "}
            <Link to="/register" className="text-blue-500 hover:text-blue-400 font-semibold" data-testid="login-register-link">Create workspace</Link>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-muted/40 p-3 text-xs font-mono text-muted-foreground">
            demo · parker@cdxi.au / 220191
          </div>
        </motion.form>
      </div>
    </div>
  );
}
