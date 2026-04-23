import React, { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Label } from "../components/ui/Primitives";
import { Loader2, ArrowRight } from "lucide-react";

export default function Register() {
  const { user, register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const nav = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await register({ email: email.trim(), password, name: name.trim(), organization_name: org.trim() || undefined });
      nav("/");
    } catch (ex) {
      const d = ex?.response?.data?.detail;
      setErr(typeof d === "string" ? d : "Registration failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground grid place-items-center p-6">
      <div className="grid-bg absolute inset-0 opacity-25 pointer-events-none" />
      <div className="absolute inset-0 ambient-glow pointer-events-none" />
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative z-10 glass w-full max-w-md rounded-2xl p-8"
        data-testid="register-form"
      >
        <div className="mb-6">
          <div className="font-logo text-2xl lowercase tracking-tight">cdxi</div>
        </div>
        <h2 className="font-display text-2xl font-semibold">Create your workspace</h2>
        <p className="text-sm text-muted-foreground mt-1">A few seconds, and you're in.</p>
        <div className="mt-6 space-y-4">
          <div><Label>Full name</Label><Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" data-testid="register-name" /></div>
          <div><Label>Organization</Label><Input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Halcyon Ventures" data-testid="register-org" /></div>
          <div><Label>Email</Label><Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" data-testid="register-email" /></div>
          <div><Label>Password</Label><Input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" data-testid="register-password" /></div>
          {err && <div className="text-xs text-rose-500" data-testid="register-error">{err}</div>}
          <Button type="submit" className="w-full" data-testid="register-submit" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Launch workspace <ArrowRight className="w-4 h-4" /></>}
          </Button>
          <div className="text-center text-sm">
            Already have an account? <Link to="/login" className="text-blue-500 hover:text-blue-400 font-semibold" data-testid="register-login-link">Sign in</Link>
          </div>
        </div>
      </motion.form>
    </div>
  );
}
