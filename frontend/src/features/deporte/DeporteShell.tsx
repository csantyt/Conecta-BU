import { useEffect, useRef, useState } from "react";
import { obtenerAlertasAdmin, obtenerAlertasPisu } from "../../api/deporte";
import { etiquetaDeVista, menuPorRol } from "./menus";
import { homeDeRol, type RolPisu } from "./rutas";
import { Avatar, ErrorBoundary, Icon, type NombreIcono } from "./ui";

type Usuario = { nombre_completo?: string; email: string; rol: string };

/** Traduce las claves del menú (menus.ts) a iconos del UI kit. */
const ICONO_POR_MENU: Record<string, NombreIcono> = {
  panel: "inicio",
  verificar: "check",
  deportes: "deportes",
  horarios: "horario",
  eventos: "eventos",
  inscritos: "usuarios",
  personas: "usuarios",
  comunicados: "campana",
  inicio: "inicio",
  catalogo: "catalogo",
  "mis-deportes": "deportes",
  horario: "horario",
};

type Props = {
  usuario: Usuario;
  rolPisu: string;
  view: string;
  setView: (v: string) => void;
  onVolver?: () => void;
  children: React.ReactNode;
};

const ETIQUETA_ROL: Record<RolPisu, string> = {
  Administrador: "Administrador PISU",
  Docente: "Docente PISU",
  Estudiante: "Estudiante PISU",
};

export default function DeporteShell({ usuario, rolPisu, view, setView, onVolver, children }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [comunicados, setComunicados] = useState(0);
  const mainRef = useRef<HTMLElement | null>(null);
  const menus = menuPorRol(rolPisu);
  const base = view.split(":")[0];

  const rol: RolPisu =
    rolPisu === "Administrador" || rolPisu === "Docente" ? rolPisu : "Estudiante";
  const nombre = usuario.nombre_completo || usuario.email;
  const tieneComunicados = menus.some((grupo) =>
    grupo.items.some((item) => item.key === "comunicados"),
  );

  useEffect(() => {
    if (rolPisu !== "Administrador" && rolPisu !== "Docente") return;
    const carga =
      rolPisu === "Administrador" ? obtenerAlertasAdmin() : obtenerAlertasPisu();
    void carga
      .then((lista) => setComunicados(lista.length))
      .catch(() => setComunicados(0));
  }, [rolPisu, view]);

  // Al cambiar de pantalla: cerrar el drawer móvil y volver arriba.
  useEffect(() => {
    setDrawerOpen(false);
    mainRef.current?.scrollTo({ top: 0 });
  }, [view]);

  function salir() {
    localStorage.clear();
    window.location.hash = "";
    window.location.reload();
  }

  function volverAlPortal() {
    if (onVolver) onVolver();
    else setView(homeDeRol(rol));
    window.location.hash = "";
  }

  function renderNav(onClick: (key: string) => void) {
    return menus.map((group) => (
      <div key={group.title} className="space-y-1">
        <p className="px-3 pb-1 pt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          {group.title}
        </p>
        {group.items.map((m) => {
          const activo = base === m.key;
          const badge = m.key === "comunicados" ? comunicados : 0;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onClick(m.key)}
              aria-current={activo ? "page" : undefined}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors duration-200 ${
                activo
                  ? "bg-uni-cian/12 text-white ring-1 ring-inset ring-uni-cian/30"
                  : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-200 ${
                  activo
                    ? "bg-uni-cian/15 text-uni-cian"
                    : "bg-white/[0.06] text-slate-400 group-hover:text-uni-cian"
                }`}
              >
                <Icon nombre={ICONO_POR_MENU[m.icon] ?? "inicio"} className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1 truncate">{m.label}</span>
              {badge ? (
                <span className="rounded-full bg-uni-mandarina px-2 py-0.5 text-[10px] font-bold text-uni-noche">
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    ));
  }

  const marca = (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl banda-uni text-uni-noche shadow-lg shadow-uni-cian/20">
        <Icon nombre="deportes" className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-uni-cian">Deporte · PISU</p>
        <p className="text-[11px] text-slate-400">Bienestar Universitario</p>
      </div>
    </div>
  );

  const pieUsuario = (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5">
      <Avatar nombre={nombre} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white">{nombre}</p>
        <p className="truncate text-[10px] uppercase tracking-wider text-uni-cian">{ETIQUETA_ROL[rol]}</p>
      </div>
      <button
        type="button"
        onClick={salir}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
      >
        <Icon nombre="salir" className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-uni-noche text-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-uni-noche/80 md:flex">
        <div className="px-3 py-5">{marca}</div>
        <nav aria-label="Menú de Deporte PISU" className="flex-1 overflow-y-auto px-2 pb-4">
          {renderNav((key) => setView(key))}
        </nav>
        <div className="border-t border-white/10 p-3">{pieUsuario}</div>
      </aside>

      <div
        className={`fixed inset-0 z-40 md:hidden ${drawerOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!drawerOpen}
      >
        <div
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            drawerOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className={`absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-white/10 bg-uni-noche shadow-2xl transition-transform duration-300 ${
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-5">
            {marca}
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Cerrar menú"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icon nombre="cerrar" className="h-4 w-4" />
            </button>
          </div>
          <nav aria-label="Menú de Deporte PISU" className="flex-1 overflow-y-auto px-2 pb-4">
            {renderNav((key) => {
              setView(key);
              setDrawerOpen(false);
            })}
          </nav>
          <div className="border-t border-white/10 p-3">{pieUsuario}</div>
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-uni-noche/85 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-300 transition-colors hover:bg-white/10 hover:text-white md:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
            >
              <Icon nombre="menu" className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:block">
                Deporte PISU
              </p>
              <h2 className="truncate text-sm font-bold uppercase tracking-wider text-white">
                {etiquetaDeVista(rolPisu, view)}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {tieneComunicados ? (
              <button
                type="button"
                onClick={() => setView("comunicados")}
                className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                aria-label={comunicados ? `${comunicados} comunicados sin leer` : "Comunicados"}
                title="Comunicados"
              >
                <Icon nombre="campana" className="h-5 w-5" />
                {comunicados ? (
                  <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-uni-mandarina px-1 text-[9px] font-bold text-uni-noche">
                    {comunicados > 9 ? "9+" : comunicados}
                  </span>
                ) : null}
              </button>
            ) : null}
            <button
              type="button"
              onClick={volverAlPortal}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Volver al portal"
              title="Volver al portal"
            >
              <Icon nombre="flecha" className="h-5 w-5 rotate-180" />
            </button>
            <Avatar nombre={nombre} size="sm" className="ml-1 hidden sm:inline-flex" />
          </div>
        </header>

        <main ref={mainRef} className="flex-1 overflow-auto">
          <div key={view} className="animar-entrada mx-auto w-full max-w-6xl p-4 pb-24 md:p-8">
            <ErrorBoundary resetKey={view} onInicio={() => setView(homeDeRol(rol))}>
              {children}
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
