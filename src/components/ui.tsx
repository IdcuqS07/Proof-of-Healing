"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Card({
  title,
  subtitle,
  children,
  footer,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/20">
      {title ? (
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </header>
      ) : null}
      {children}
      {footer ? <footer className="mt-4 border-t border-slate-800 pt-3">{footer}</footer> : null}
    </section>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const styles = {
    primary: "bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400",
    ghost: "border border-slate-700 text-slate-200 hover:border-slate-500 disabled:opacity-50",
    danger: "border border-rose-800 text-rose-300 hover:bg-rose-950 disabled:opacity-50",
  }[variant];
  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "emerald" | "amber" }) {
  const tones = {
    slate: "border-slate-700 text-slate-300",
    emerald: "border-emerald-700 text-emerald-300",
    amber: "border-amber-700 text-amber-300",
  }[tone];
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones}`}>{children}</span>
  );
}

export function Mono({ children }: { children: ReactNode }) {
  return <code className="break-all font-mono text-xs text-slate-400">{children}</code>;
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return `${hours}j ${minutes}m ${rest}s`;
}
