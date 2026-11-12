import { useEffect, useState } from "react";
import { obtenerCitas, obtenerEventos, obtenerServicios } from "../api/desarrolloHumano";
import PanelAdministrador from "../features/desarrollo-humano/PanelAdministrador";
import PanelEstudiante from "../features/desarrollo-humano/PanelEstudiante";
import { mensajeError } from "../features/desarrollo-humano/utils";
import { Badge, Icon } from "../features/deporte/ui";
import type { Usuario } from "../types/auth";
import type { Cita, EventoDH, Servicio } from "../types/desarrolloHumano";

type DesarrolloHumanoPageProps = {
  usuario: Usuario;
  onVolver: () => void;
};

type Panel = "estudiante" | "admin";

export default function DesarrolloHumanoPage({
  usuario,
  onVolver,
}: DesarrolloHumanoPageProps) {
  const esAdmin = usuario.rol === "ADMINISTRADOR";
  const [panel, setPanel] = useState<Panel>(esAdmin ? "admin" : "estudiante");
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [eventos, setEventos] = useState<EventoDH[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  async function recargar() {
    setCargando(true);
    setError(null);
    try {
      const [listaServicios, listaCitas, listaEventos] = await Promise.all([
        obtenerServicios(),
        obtenerCitas(),
        obtenerEventos(),
      ]);
      setServicios(listaServicios);
      setCitas(listaCitas);
      setEventos(listaEventos);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void recargar();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-10">
      <button
        type="button"
        onClick={onVolver}
        className="mb-4 inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-300 transition hover:text-uni-cian sm:mb-6"
      >
        <Icon nombre="flecha" className="h-3.5 w-3.5 rotate-180" />
        Volver a módulos
      </button>

      <section className="relative mb-6 overflow-hidden rounded-3xl border border-white/10 bg-uni-noche/60 p-5 backdrop-blur sm:mb-8 sm:p-8">
        <div
          aria-hidden="true"
          className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-uni-cian/10 blur-3xl"
        />
        <img
          src="/ilustraciones/orientacion.svg"
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="pointer-events-none absolute -right-4 bottom-0 hidden h-44 w-auto opacity-70 sm:block"
        />
        <div className="relative max-w-2xl">
          <span className="inline-block -rotate-2 rounded bg-uni-cian px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-uni-noche">
            Módulo activo
          </span>
          <h1 className="mt-4 text-3xl font-black uppercase tracking-tight sm:text-5xl">
            Desarrollo humano <span className="text-uni-mandarina">y orientación</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            Agenda citas, consulta horarios y participa en eventos de Bienestar.
          </p>
          {!cargando ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="info">
                <Icon nombre="calendario" className="h-3.5 w-3.5" />
                {citas.filter((cita) => cita.estado === "AGENDADA").length} citas activas
              </Badge>
              <Badge tone="neutral">
                <Icon nombre="eventos" className="h-3.5 w-3.5" />
                {eventos.length} eventos
              </Badge>
              <Badge tone="neutral">
                <Icon nombre="corazon" className="h-3.5 w-3.5" />
                {servicios.length} servicios
              </Badge>
            </div>
          ) : null}
        </div>
      </section>

      {esAdmin ? (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            aria-pressed={panel === "estudiante"}
            onClick={() => setPanel("estudiante")}
            className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
              panel === "estudiante"
                ? "banda-uni sombra-uni font-bold text-uni-noche"
                : "border border-white/15 text-slate-300 hover:border-uni-mandarina/60 hover:bg-white/5"
            }`}
          >
            Vista estudiante
          </button>
          <button
            type="button"
            aria-pressed={panel === "admin"}
            onClick={() => setPanel("admin")}
            className={`shrink-0 rounded-full px-4 py-2 text-sm transition ${
              panel === "admin"
                ? "banda-uni sombra-uni font-bold text-uni-noche"
                : "border border-white/15 text-slate-300 hover:border-uni-mandarina/60 hover:bg-white/5"
            }`}
          >
            Panel administrador
          </button>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="animar-entrada mb-4 flex items-start gap-2.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200"
        >
          <Icon nombre="alerta" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      {aviso ? (
        <div
          role="status"
          aria-live="polite"
          className="animar-entrada mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          <Icon nombre="check" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{aviso}</span>
        </div>
      ) : null}

      {cargando && esAdmin ? (
        <p className="mb-4 text-sm text-slate-400">Cargando información…</p>
      ) : null}

      {panel === "estudiante" || !esAdmin ? (
        <PanelEstudiante
          servicios={servicios}
          citas={esAdmin ? citas.filter((cita) => cita.usuario_id === usuario.id) : citas}
          eventos={eventos}
          cargando={cargando}
          onAviso={(valor) => {
            setError(null);
            setAviso(valor);
          }}
          onError={(valor) => {
            setAviso(null);
            setError(valor);
          }}
          onRecargar={recargar}
        />
      ) : (
        <PanelAdministrador
          servicios={servicios}
          citas={citas}
          eventos={eventos}
          onAviso={(valor) => {
            setError(null);
            setAviso(valor);
          }}
          onError={(valor) => {
            setAviso(null);
            setError(valor);
          }}
          onRecargar={recargar}
        />
      )}
    </main>
  );
}
