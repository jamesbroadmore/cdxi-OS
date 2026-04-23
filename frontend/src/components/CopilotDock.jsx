import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Send, Loader2, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import api from "../lib/api";
import { Button } from "./ui/Primitives";

export default function CopilotDock({ open, onClose, seedPrompt }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
  const scroller = useRef(null);

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages, loading]);

  // When a seed prompt is passed (e.g. from Agents page), prefill the input on open
  useEffect(() => {
    if (open && seedPrompt) {
      setInput(seedPrompt);
    }
  }, [open, seedPrompt]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const { data } = await api.post("/copilot/chat", { session_id: sessionId, message: text });
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      const d = e?.response?.data?.detail;
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${typeof d === "string" ? d : "Copilot error"}` }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Summarize this brand's pipeline risks",
    "Draft a 3-step outreach for a cdxi prospect",
    "Suggest this week's priorities for delivery",
    "Write a proposal intro for a growth retainer",
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] glass border-l border-border flex flex-col"
            initial={{ x: 440 }} animate={{ x: 0 }} exit={{ x: 440 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            data-testid="copilot-dock"
          >
            <div className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-amber-500/10 pointer-events-none" />
              <div className="relative flex items-center gap-3 p-5 border-b border-border">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 grid place-items-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-display text-lg font-semibold">Atlas</div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Helix · Copilot · gpt-5.2</div>
                </div>
                <button onClick={() => setMessages([])} className="p-2 rounded-lg hover:bg-muted transition" title="Clear" data-testid="copilot-clear">
                  <RotateCcw className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition" data-testid="copilot-close">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div ref={scroller} className="flex-1 overflow-auto p-5 space-y-4">
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    Hi — I'm <span className="font-display font-semibold text-foreground">Atlas</span>, cdxi's in-house copilot. Ask me to draft proposals, summarize a brand's pipeline, map delivery priorities, or anything else you'd ask a sharp internal operator.
                  </div>
                  <div className="cdxi-label">Try</div>
                  <div className="space-y-2">
                    {quickPrompts.map((p) => (
                      <button
                        key={p} onClick={() => setInput(p)}
                        className="w-full text-left px-3 py-2.5 rounded-xl border border-border hover:bg-muted transition text-sm"
                        data-testid={`copilot-suggest-${p.slice(0, 12)}`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 shrink-0 rounded-lg grid place-items-center text-xs font-semibold ${m.role === "user" ? "bg-foreground text-background" : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"}`}>
                    {m.role === "user" ? "You" : <Sparkles className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${m.role === "user" ? "bg-foreground text-background" : "bg-muted/60 border border-border"}`}>
                    {m.role === "assistant" ? (
                      <div className="prose-copilot"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Atlas is thinking…
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Message Atlas… (Enter to send)"
                  rows={2}
                  className="flex-1 resize-none rounded-xl bg-background/60 border border-border p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40"
                  data-testid="copilot-input"
                />
                <Button onClick={send} disabled={loading || !input.trim()} data-testid="copilot-send" size="icon" className="h-11 w-11">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
