import React from "react";
import { cn } from "../../lib/utils";

export function Button({ className, variant = "primary", size = "md", children, ...props }) {
  const variants = {
    primary: "bg-foreground text-background hover:bg-foreground/90",
    secondary: "bg-muted text-foreground hover:bg-muted/70",
    ghost: "bg-transparent text-foreground hover:bg-muted",
    outline: "border border-border bg-transparent text-foreground hover:bg-muted",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    accent: "bg-blue-600 text-white hover:bg-blue-700",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs rounded-lg",
    md: "h-10 px-4 text-sm rounded-xl",
    lg: "h-11 px-5 text-sm rounded-xl",
    icon: "h-9 w-9 rounded-lg",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium tracking-tight transition-[background,color,border-color,transform] duration-150 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none gap-2",
        variants[variant], sizes[size], className,
      )}
      {...props}
    >{children}</button>
  );
}

export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-border bg-background/40 px-3 text-sm",
        "placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "min-h-[90px] w-full rounded-xl border border-border bg-background/40 p-3 text-sm",
        "placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, children, ...props }) {
  return <label className={cn("cdxi-label mb-1.5 block", className)} {...props}>{children}</label>;
}

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn("glass rounded-2xl", className)}
      {...props}
    >{children}</div>
  );
}

export function Badge({ className, children, tone = "muted" }) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    success: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-500 border border-rose-500/20",
    info: "bg-blue-500/10 text-blue-500 border border-blue-500/20",
    accent: "bg-blue-600 text-white",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold tracking-wide uppercase", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-xl border border-border bg-background/40 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition",
        className,
      )}
      {...props}
    >{children}</select>
  );
}
