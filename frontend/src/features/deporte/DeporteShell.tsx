import { useEffect, useState } from "react";
import { obtenerAlertasAdmin } from "../../api/deporte";
import { etiquetaRol } from "../../types/auth";

type Usuario = { nombre_completo?: string; email: string; rol: string };

type MenuItem = { key: string; label: string; icon: string; badge?: number };
type MenuGroup = { title: string; items: MenuItem[] };

const ADMIN_MENU: MenuGroup[] = [
  {
    title: "GENERAL",
    items: [
      { key: "panel", label: "Panel", icon: "panel" },
      { key: "verificar", label: "Verificar contenido", icon: "verificar" },
    ],
  },
  {
    title: "GESTIÓN DEPORTIVA",
    items: [
      { key: "deportes", label: "Deportes", icon: "deportes" },
      { key: "horarios", label: "Horarios", icon: "horarios" },
      { key: "eventos", label: "Eventos", icon: "eventos" },
      { key: "inscritos", label: "Inscritos por deporte", icon: "inscritos" },
    ],
  },
  {
    title: "PERSONAS",
    items: [
      { key: "docentes", label: "Docentes", icon: "personas" },
      { key: "estudiantes", label: "Estudiantes", icon: "personas" },
      { key: "administradores", label: "Administradores", icon: "personas" },
    ],
  },
  {
    title: "COMUNICACIÓN",
    items: [{ key: "comunicados", label: "Comunicados", icon: "comunicados" }],
  },
];

const DOCENTE_MENU: MenuGroup[] = [
  {
    title: "GENERAL",
    items: [
      { key: "clases-hoy", label: "Mis clases de hoy", icon: "horarios" },
      { key: "grupos", label: "Mis grupos", icon: "inscritos" },
    ],
  },
  {
    title: "CONSULTA",
    items: [
      { key: "historial", label: "Historial", icon: "eventos" },
      { key: "estadisticas", label: "Estadísticas", icon: "panel" },
    ],
  },
];

const ESTUDIANTE_MENU: MenuGroup[] = [
  {
    title: "GENERAL",
    items: [
      { key: "catalogo", label: "Catálogo", icon: "deportes" },
      { key: "eventos", label: "Eventos", icon: "eventos" },
      { key: "mis-deportes", label: "Mis deportes", icon: "inscritos" },
      { key: "horario", label: "Mi horario", icon: "horarios" },
    ],
  },
];

function iconoSvg(icono: string) {
  const path = icono === "panel"
    ? "M4 6h16M4 12h16M4 18h16"
    : icono === "verificar"
      ? "M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
      : icono === "deportes"
        ? "M12 2l3 7 7 .7-5 4.7 1.5 7.1L12 18l-6.5 3.5L7 14.4 2 9.7 9 9z"
        : icono === "horarios"
          ? "M12 8v4l3 3M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"
          : icono === "eventos"
            ? "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
            : icono === "inscritos"
              ? "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
              : icono === "personas"
                ? "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"
                : "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0";
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

type Props = {
  usuario: Usuario;
  rolPisu: string;
  view: string;
  setView: (v: string) => void;
  children: React.ReactNode;
};

export function useHashRoute(defaultView: string) {
  const [view, setView] = useState(defaultView);
  useEffect(() => {
    function sync() {
      const h = window.location.hash.replace(/^#/, "").replace(/^\/deportes\/[^/]*\//, "");
      if (h) setView(h);
    }
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return [view, (v: string) => { window.location.hash = `/deportes/${v}`; setView(v); }] as const;
}

export default function DeporteShell({ usuario, rolPisu, view, setView, children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [comunicados, setComunicados] = useState(0);
  const menus = rolPisu === "Administrador" ? ADMIN_MENU : rolPisu === "Docente" ? DOCENTE_MENU : ESTUDIANTE_MENU;

  useEffect(() => {
    if (rolPisu !== "Administrador") return;
    void obtenerAlertasAdmin()
      .then((lista) => setComunicados((lista as unknown[]).length))
      .catch(() => setComunicados(0));
  }, [rolPisu]);

  function renderNav(activeClass: string, inactiveClass: string, onClick: (key: string) => void) {
    return menus.map((group) => (
      <div key={group.title} className="space-y-1">
        <p className="px-3 pt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{group.title}</p>
        {group.items.map((m) => {
          const item = rolPisu === "Administrador" && m.key === "comunicados" ? { ...m, badge: comunicados } : m;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onClick(m.key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm ${view === m.key ? activeClass : inactiveClass}`}
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-uni-cian">
                {iconoSvg(m.icon)}
              </span>
              <span className="flex-1">{m.label}</span>
              {m.key === "comunicados" && item.badge ? <span className="rounded-full bg-orange-400 px-2 py-0.5 text-[10px] font-bold text-slate-950">{item.badge}</span> : null}
            </button>
          );
        })}
      </div>
    ));
  }

  return (
    <div className="min-h-screen bg-uni-noche text-slate-100 flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-white/10 bg-uni-noche/80">
        <div className="px-4 py-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-uni-cian">DEPORTE · PISU</p>
        </div>
        <nav className="flex-1 space-y-1 px-2 overflow-auto">{renderNav("bg-white/10 text-white", "text-slate-300 hover:bg-white/5", (key) => setView(key))}</nav>
        <div className="border-t border-white/10 p-4">
          <p className="text-xs font-bold text-white truncate">{usuario.nombre_completo || usuario.email}</p>
          <p className="text-[10px] uppercase tracking-wider text-uni-cian">{etiquetaRol(usuario.rol)}</p>
          <button type="button" className="mt-3 text-xs text-uni-mandarina" onClick={() => { localStorage.clear(); window.location.reload(); }}>Salir</button>
        </div>
      </aside>

      <div className={`fixed inset-0 z-40 md:hidden ${drawerOpen ? "" : "pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-black/60 transition ${drawerOpen ? "opacity-100" : "opacity-0"}`} onClick={() => setDrawerOpen(false)} />
        <aside className={`absolute left-0 top-0 h-full w-64 bg-uni-noche border-r border-white/10 transition-transform ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="px-4 py-6 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-uni-cian">DEPORTE · PISU</p>
            <button type="button" className="text-slate-300" onClick={() => setDrawerOpen(false)}>✕</button>
          </div>
          <nav className="space-y-1 px-2 overflow-auto">{renderNav("bg-white/10 text-white", "text-slate-300 hover:bg-white/5", (key) => { setView(key); setDrawerOpen(false); })}</nav>
        </aside>
      </div>

      <div className="flex-1 flex flex-col">
        <header className="border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" className="md:hidden text-slate-300" onClick={() => setDrawerOpen(true)} aria-label="Abrir menú">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
            <h2 className="text-sm font-bold uppercase tracking-wider">{view}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="text-slate-300" onClick={() => (window.location.hash = "")} aria-label="Volver al portal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span className="text-slate-400" aria-label="Comunicados">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 max-w-6xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}