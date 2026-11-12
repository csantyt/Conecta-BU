import type { ReactNode } from "react";

export const cardClass = "rounded-2xl border border-white/10 bg-white/[0.04] p-5";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`${cardClass} ${className}`}>{children}</div>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-300">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ value, label, description }: { value: string | number; label: string; description?: string }) {
  return (
    <Card>
      <p className="text-3xl font-semibold tabular-nums text-orange-300">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">{label}</p>
      {description ? <p className="mt-2 text-xs text-slate-400">{description}</p> : null}
    </Card>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
      : tone === "warning"
        ? "bg-amber-500/15 text-amber-300 border-amber-400/30"
        : tone === "danger"
          ? "bg-rose-500/15 text-rose-300 border-rose-400/30"
          : "bg-white/10 text-slate-200 border-white/15";
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${toneClass}`}>{children}</span>;
}

export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-white/10">
      <div className="h-2 rounded-full bg-orange-400" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Button({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const v =
    variant === "primary"
      ? "banda-uni sombra-uni text-uni-noche"
      : variant === "danger"
        ? "bg-rose-600 text-white hover:bg-rose-500"
        : "border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10";
  return <button className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${v} ${className}`} {...props}>{children}</button>;
}

export function Input({ label, className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block text-xs text-slate-300">
      {label ? <span className="mb-1 block">{label}</span> : null}
      <input className={`mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-orange-400 focus:ring-2 ${className}`} {...props} />
    </label>
  );
}

export function Select({ label, className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-slate-300">
      {label ? <span className="mb-1 block">{label}</span> : null}
      <select className={`mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-orange-400 focus:ring-2 ${className}`} {...props}>{children}</select>
    </label>
  );
}

export function SearchBar({ value, onChange, placeholder = "Buscar..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-orange-400 focus:ring-2" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />;
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center"><p className="font-medium">{title}</p>{description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-center">
      <p className="text-sm text-rose-200">{message}</p>
      {onRetry ? <button type="button" className="mt-3 text-xs font-semibold text-orange-300" onClick={onRetry}>Reintentar</button> : null}
    </div>
  );
}

export function Skeleton({ className = "h-6" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

export function Modal({ open, onClose, children, title }: { open: boolean; onClose: () => void; children: ReactNode; title?: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6">
        {title ? <h3 className="mb-3 text-lg font-semibold">{title}</h3> : null}
        {children}
        <button type="button" className="mt-4 text-xs text-slate-400" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, message, onConfirm, onCancel }: { open: boolean; message: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6">
        <p className="text-sm">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-full border border-white/15 px-4 py-2 text-xs" onClick={onCancel}>Cancelar</button>
          <button type="button" className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ message, action, onAction }: { message: string; action?: string; onAction?: () => void }) {
  return (
    <div className="fixed bottom-24 right-4 z-50 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm shadow-lg">
      <span>{message}</span>
      {action && onAction ? (
        <button type="button" className="rounded-full border border-sky-400/40 px-3 py-1 text-xs text-sky-300" onClick={onAction}>
          Ver
        </button>
      ) : null}
    </div>
  );
}

export function SportIcon({ nombre }: { nombre: string }) {
  const clave = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (clave.includes("futbol") || clave.includes("soccer")) {
    return (
      <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden>
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M32 4 L40 16 L32 24 L24 16 Z M4 32 L16 24 L24 32 L16 40 Z M60 32 L48 24 L40 32 L48 40 Z M32 60 L40 48 L32 40 L24 48 Z M24 32 L32 24 L40 32 L32 40 Z" fill="currentColor" />
      </svg>
    );
  }
  if (clave.includes("baloncesto") || clave.includes("basket")) {
    return (
      <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden>
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M4 32 H60 M32 4 V60 M14 14 Q32 32 14 50 M50 14 Q32 32 50 50" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (clave.includes("voleibol") || clave.includes("voley")) {
    return (
      <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden>
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M32 4 V60 M4 32 H60 M12 12 Q32 32 52 12 M12 52 Q32 32 52 52" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (clave.includes("atletismo") || clave.includes("pista")) {
    return (
      <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden>
        <circle cx="46" cy="12" r="6" fill="currentColor" />
        <path d="M34 22 L42 30 L38 46 L26 56 M34 22 L22 30 L18 44 M34 22 L42 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden>
      <path d="M32 4 L40 28 H60 L44 42 L50 62 L32 50 L14 62 L20 42 L4 28 H24 Z" fill="currentColor" />
    </svg>
  );
}