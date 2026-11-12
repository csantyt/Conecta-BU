import { Component, type ErrorInfo, type ReactNode } from "react";

export const cardClass =
  "rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition-colors duration-300";

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

/* ───────────────────────────── Iconos ───────────────────────────── */

export type NombreIcono =
  | "inicio"
  | "catalogo"
  | "deportes"
  | "eventos"
  | "horario"
  | "perfil"
  | "buscar"
  | "campana"
  | "calendario"
  | "reloj"
  | "ubicacion"
  | "usuarios"
  | "trofeo"
  | "medalla"
  | "racha"
  | "check"
  | "cerrar"
  | "flecha"
  | "chispa"
  | "corazon"
  | "cerebro"
  | "estrella"
  | "filtro"
  | "alerta"
  | "info"
  | "salir"
  | "menu"
  | "meta"
  | "spinner";

const ICONOS: Record<NombreIcono, ReactNode> = {
  inicio: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
    </>
  ),
  catalogo: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  deportes: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7.5 3.3 2.4-1.3 3.9h-4l-1.3-3.9z" />
      <path d="M12 3v4.5M20.4 9.4l-4.9.5M17 19.6 14 13.8M7 19.6l3-5.8M3.6 9.4l4.9.5" />
    </>
  ),
  eventos: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 17.5h.01M12 17.5h.01" />
    </>
  ),
  horario: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  perfil: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </>
  ),
  campana: (
    <>
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  calendario: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  reloj: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  ubicacion: (
    <>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  usuarios: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  trofeo: (
    <>
      <path d="M7 4h10v4a5 5 0 0 1-10 0z" />
      <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
      <path d="M12 13v4M9 21h6M10 21v-2h4v2" />
    </>
  ),
  medalla: (
    <>
      <circle cx="12" cy="15" r="5" />
      <path d="M12 13.2l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z" />
      <path d="M8 3h8l-2.5 5h-3z" />
    </>
  ),
  racha: <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" />,
  check: <path d="m4.5 12.5 5 5 10-11" />,
  cerrar: <path d="m6 6 12 12M18 6 6 18" />,
  flecha: <path d="M5 12h14M13 6l6 6-6 6" />,
  chispa: (
    <>
      <path d="M12 2.5 13.8 9l6.7 1.8-6.7 1.9L12 19.5l-1.8-6.8-6.7-1.9L10.2 9z" />
      <path d="M19 3v3M20.5 4.5h-3" />
    </>
  ),
  corazon: (
    <path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" />
  ),
  cerebro: (
    <>
      <path d="M9.5 4.5A3 3 0 0 0 6.6 8a3 3 0 0 0-1 5.6A3 3 0 0 0 8 18.5a3 3 0 0 0 4.5 1.3V4.9a2.5 2.5 0 0 0-3-.4z" />
      <path d="M14.5 4.5A3 3 0 0 1 17.4 8a3 3 0 0 1 1 5.6A3 3 0 0 1 16 18.5a3 3 0 0 1-4.5 1.3V4.9a2.5 2.5 0 0 1 3-.4z" />
    </>
  ),
  estrella: (
    <path d="M12 3.5 14.7 9l6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.9 9.3 9z" />
  ),
  filtro: <path d="M4 5h16l-6 7.2V20l-4-2v-5.8z" />,
  alerta: (
    <>
      <path d="M12 3 2.8 19.5h18.4z" />
      <path d="M12 9v4M12 16.5h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  salir: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  meta: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  spinner: <path d="M21 12a9 9 0 1 1-6.2-8.6" />,
};

export function Icon({
  nombre,
  className = "h-5 w-5",
}: {
  nombre: NombreIcono;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONOS[nombre]}
    </svg>
  );
}

/** Spinner accesible para botones y pantallas de carga. */
export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return <Icon nombre="spinner" className={`animar-girar ${className}`} />;
}

/* ───────────────────────────── Avatar ───────────────────────────── */

const GRADIENTES_AVATAR = [
  "from-uni-cian to-uni-azul",
  "from-uni-mandarina to-uni-naranja",
  "from-emerald-400 to-teal-600",
  "from-violet-400 to-indigo-600",
  "from-rose-400 to-pink-600",
];

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "BU";
  const primera = partes[0]?.[0] ?? "";
  const segunda = partes.length > 1 ? (partes[1]?.[0] ?? "") : "";
  return `${primera}${segunda}`.toUpperCase();
}

export function Avatar({
  nombre,
  size = "md",
  className = "",
}: {
  nombre: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const tamanos = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-xs",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-2xl",
  } as const;
  const indice =
    [...nombre].reduce((total, letra) => total + letra.charCodeAt(0), 0) %
    GRADIENTES_AVATAR.length;
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-black tracking-wide text-uni-noche ring-2 ring-white/20 ${GRADIENTES_AVATAR[indice]} ${tamanos[size]} ${className}`}
    >
      {iniciales(nombre)}
    </span>
  );
}

/* ───────────────────────────── Tabs ───────────────────────────── */

export type TabItem = { id: string; label: string; icono?: NombreIcono; badge?: number };

export function Tabs({
  items,
  value,
  onChange,
  label = "Secciones",
  className = "",
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex gap-2 overflow-x-auto pb-1 ${className}`}
    >
      {items.map((item) => {
        const activo = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activo}
            onClick={() => onChange(item.id)}
            className={`group inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
              activo
                ? "banda-uni sombra-uni text-uni-noche"
                : "border border-white/15 text-slate-300 hover:border-uni-cian/50 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.icono ? (
              <Icon
                nombre={item.icono}
                className={`h-4 w-4 ${activo ? "" : "text-uni-cian"}`}
              />
            ) : null}
            {item.label}
            {item.badge ? (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  activo ? "bg-uni-noche/20 text-uni-noche" : "bg-white/10 text-slate-200"
                }`}
              >
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────────────────────── Tooltip ───────────────────────────── */

export function Tooltip({
  children,
  texto,
  className = "",
}: {
  children: ReactNode;
  texto: string;
  className?: string;
}) {
  return (
    <span className={`group relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[16rem] -translate-x-1/2 rounded-lg bg-uni-noche px-2.5 py-1.5 text-center text-[11px] font-medium leading-4 text-slate-100 opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {texto}
      </span>
    </span>
  );
}

export function StatCard({
  value,
  label,
  description,
  icono,
  acento = "text-uni-cian",
}: {
  value: string | number;
  label: string;
  description?: string;
  icono?: NombreIcono;
  acento?: string;
}) {
  return (
    <Card className="flex items-start justify-between gap-3 hover:border-white/20">
      <div className="min-w-0">
        <p className="text-2xl font-black tabular-nums text-white sm:text-3xl">{value}</p>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        {description ? (
          <p className="mt-2 text-xs text-slate-400">{description}</p>
        ) : null}
      </div>
      {icono ? (
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 ${acento}`}
        >
          <Icon nombre={icono} className="h-5 w-5" />
        </span>
      ) : null}
    </Card>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-400/30"
      : tone === "warning"
        ? "bg-amber-500/15 text-amber-300 border-amber-400/30"
        : tone === "danger"
          ? "bg-rose-500/15 text-rose-300 border-rose-400/30"
          : tone === "info"
            ? "bg-uni-cian/15 text-uni-cian border-uni-cian/30"
            : "bg-white/10 text-slate-200 border-white/15";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  max = 100,
  label,
  tone,
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: "uni" | "success" | "warning" | "danger";
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const color =
    tone === "success"
      ? "bg-emerald-400"
      : tone === "warning"
        ? "bg-amber-400"
        : tone === "danger"
          ? "bg-rose-400"
          : "banda-uni";
  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-slate-400">
          <span>{label}</span>
          <span className="tabular-nums text-slate-300">{Math.round(pct)}%</span>
        </div>
      ) : null}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progreso"}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  loading = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}) {
  const v =
    variant === "primary"
      ? "banda-uni sombra-uni text-uni-noche hover:brightness-105"
      : variant === "danger"
        ? "bg-rose-600 text-white hover:bg-rose-500"
        : "border border-white/15 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10";
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Input({
  label,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block text-xs text-slate-300">
      {label ? <span className="mb-1 block">{label}</span> : null}
      <input
        className={`mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-uni-cian/60 focus:ring-2 focus:ring-uni-cian/40 ${className}`}
        {...props}
      />
    </label>
  );
}

export function Select({
  label,
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs text-slate-300">
      {label ? <span className="mb-1 block">{label}</span> : null}
      <select
        className={`mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-uni-cian/60 focus:ring-2 focus:ring-uni-cian/40 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
        <Icon nombre="buscar" className="h-4 w-4" />
      </span>
      <input
        type="search"
        className="w-full rounded-xl border border-white/15 bg-slate-950 py-2.5 pl-9 pr-9 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-uni-cian/60 focus:ring-2 focus:ring-uni-cian/40"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <Icon nombre="cerrar" className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/* ───────────────────────────── Estados vacíos y de error ───────────────────────────── */

function IlustracionVacia({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" className={className}>
      <circle cx="80" cy="60" r="46" fill="rgb(41 197 230 / 0.08)" />
      <circle cx="80" cy="60" r="32" fill="rgb(41 197 230 / 0.08)" />
      <path
        d="M52 84c0-12 12-22 28-22s28 10 28 22"
        fill="none"
        stroke="rgb(41 197 230 / 0.5)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle
        cx="80"
        cy="46"
        r="11"
        fill="none"
        stroke="rgb(247 147 30 / 0.7)"
        strokeWidth="2.5"
      />
      <path
        d="M68 98h24"
        stroke="rgb(255 255 255 / 0.25)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M40 34l3-6 3 6 6 3-6 3-3 6-3-6-6-3z" fill="rgb(255 194 14 / 0.7)" />
      <path
        d="M118 76l2.2-4.4 2.2 4.4 4.4 2.2-4.4 2.2-2.2 4.4-2.2-4.4-4.4-2.2z"
        fill="rgb(41 197 230 / 0.6)"
      />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icono = "chispa",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icono?: NombreIcono;
}) {
  return (
    <div className="animar-entrada rounded-3xl border border-dashed border-white/15 bg-white/[0.02] p-8 text-center">
      <div className="mx-auto flex max-w-[220px] items-center justify-center">
        <IlustracionVacia className="h-32 w-auto" />
      </div>
      <span className="mx-auto -mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-uni-cian/15 text-uni-cian">
        <Icon nombre={icono} className="h-5 w-5" />
      </span>
      <p className="mt-3 font-semibold text-white">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="animar-entrada rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
        <Icon nombre="alerta" className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm text-rose-200">{message}</p>
      {onRetry ? (
        <button
          type="button"
          className="mt-4 rounded-full border border-rose-400/40 px-4 py-1.5 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
          onClick={onRetry}
        >
          Reintentar
        </button>
      ) : null}
    </div>
  );
}

export function Skeleton({ className = "h-6" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`skeleton-brillo rounded-md ${className}`} />
  );
}

/** Bloque de carga con la forma de una tarjeta del catálogo. */
export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <Skeleton className="h-32 w-full rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-2 w-full" />
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Diálogo"}
        className="animar-aparecer w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {title ? <h3 className="mb-3 text-lg font-semibold text-white">{title}</h3> : null}
        {children}
        <button
          type="button"
          className="mt-4 text-xs font-semibold text-slate-400 transition hover:text-white"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  message,
  confirmLabel = "Confirmar",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Confirmar acción"
        className="animar-aparecer w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
          <Icon nombre="alerta" className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm leading-6 text-slate-200">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-500"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Toast({
  message,
  action,
  onAction,
  tone = "success",
}: {
  message: string;
  action?: string;
  onAction?: () => void;
  tone?: "success" | "error" | "info";
}) {
  const tono =
    tone === "error"
      ? "border-rose-400/40 text-rose-100"
      : tone === "info"
        ? "border-uni-cian/40 text-cyan-50"
        : "border-emerald-400/40 text-emerald-50";
  const icono = tone === "error" ? "alerta" : tone === "info" ? "info" : "check";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`animar-entrada fixed bottom-24 right-4 z-50 flex max-w-[min(22rem,calc(100vw-2rem))] items-center gap-3 rounded-xl border bg-slate-900/95 px-4 py-3 text-sm shadow-2xl backdrop-blur ${tono}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
        <Icon nombre={icono} className="h-4 w-4" />
      </span>
      <span className="flex-1 leading-5">{message}</span>
      {action && onAction ? (
        <button
          type="button"
          className="rounded-full border border-uni-cian/40 px-3 py-1 text-xs font-semibold text-uni-cian transition hover:bg-uni-cian/10"
          onClick={onAction}
        >
          Ver
        </button>
      ) : null}
    </div>
  );
}

export function SportIcon({
  nombre,
  className = "h-10 w-10",
}: {
  nombre: string;
  className?: string;
}) {
  const clave = nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (clave.includes("futbol") || clave.includes("soccer")) {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden>
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M32 4 L40 16 L32 24 L24 16 Z M4 32 L16 24 L24 32 L16 40 Z M60 32 L48 24 L40 32 L48 40 Z M32 60 L40 48 L32 40 L24 48 Z M24 32 L32 24 L40 32 L32 40 Z" fill="currentColor" />
      </svg>
    );
  }
  if (clave.includes("baloncesto") || clave.includes("basket")) {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden>
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M4 32 H60 M32 4 V60 M14 14 Q32 32 14 50 M50 14 Q32 32 50 50" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (clave.includes("voleibol") || clave.includes("voley")) {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden>
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M32 4 V60 M4 32 H60 M12 12 Q32 32 52 12 M12 52 Q32 32 52 52" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (
    clave.includes("atletismo") ||
    clave.includes("pista") ||
    clave.includes("running")
  ) {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden>
        <circle cx="46" cy="12" r="6" fill="currentColor" />
        <path d="M34 22 L42 30 L38 46 L26 56 M34 22 L22 30 L18 44 M34 22 L42 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (clave.includes("natacion") || clave.includes("swim")) {
    return (
      <svg viewBox="0 0 64 64" className={className} aria-hidden>
        <circle cx="18" cy="18" r="5" fill="currentColor" />
        <path
          d="M4 34c6-6 10-6 16 0s10 6 16 0 10-6 16 0M4 44c6-6 10-6 16 0s10 6 16 0 10-6 16 0M4 54c6-6 10-6 16 0s10 6 16 0 10-6 16 0"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-10 w-10" aria-hidden>
      <path d="M32 4 L40 28 H60 L44 42 L50 62 L32 50 L14 62 L20 42 L4 28 H24 Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Aísla los errores de render de una pantalla para que el shell (sidebar y barra
 * superior) siga funcionando. Muestra un ErrorState con "Reintentar" e "Ir al
 * inicio" en lugar de una pantalla blanca total.
 */
type ErrorBoundaryProps = {
  children: ReactNode;
  /** Clave que cambia al navegar: al cambiar, el boundary se reinicia. */
  resetKey: string;
  onInicio?: () => void;
};

type ErrorBoundaryState = { error: string | null };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error.message : "Error inesperado al mostrar la pantalla." };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Se registra en consola para diagnóstico, sin romper la interfaz.
    console.error("ErrorBoundary Deporte:", error, info.componentStack);
  }

  componentDidUpdate(prev: ErrorBoundaryProps): void {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-6 text-center">
          <p className="text-sm text-rose-200">
            Ocurrió un error al mostrar esta pantalla.
          </p>
          <p className="mt-1 text-xs text-rose-200/70">{this.state.error}</p>
          <div className="mt-4 flex justify-center gap-3">
            <button
              type="button"
              className="rounded-full border border-rose-400/40 px-4 py-1.5 text-xs font-semibold text-rose-100"
              onClick={() => this.setState({ error: null })}
            >
              Reintentar
            </button>
            {this.props.onInicio ? (
              <button
                type="button"
                className="rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-slate-200"
                onClick={this.props.onInicio}
              >
                Ir al inicio
              </button>
            ) : null}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Pantalla "no encontrada" reutilizable (ruta comodín por rol). */
export function NoEncontrada({ onInicio }: { onInicio: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-10 text-center">
      <p className="text-lg font-semibold">Página no encontrada</p>
      <p className="mt-1 text-sm text-slate-400">
        La sección que buscas no existe o no está disponible para tu rol.
      </p>
      <button
        type="button"
        className="mt-4 rounded-full banda-uni px-4 py-2 text-sm font-semibold text-uni-noche"
        onClick={onInicio}
      >
        Ir al inicio
      </button>
    </div>
  );
}