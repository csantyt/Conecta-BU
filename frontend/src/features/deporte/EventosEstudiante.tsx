import { useCallback, useEffect, useState } from "react";
import {
  cancelarInscripcionEventoPisu,
  inscribirseEventoPisu,
  obtenerEventosPisu,
} from "../../api/deporte";
import type { EventoPisu, PerfilPisu } from "../../types/deporte";
import { mensajeError } from "./utils";
import { Toast } from "../deportes/ui";

type EventosEstudianteProps = {
  perfil: PerfilPisu | null;
  onAviso: (valor: string, accion?: string) => void;
  onError: (valor: string) => void;
};

export default function EventosEstudiante({
  perfil,
  onAviso,
  onError,
}: EventosEstudianteProps) {
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "proximos" | "inscritos" | "pasados">("proximos");
  const [toast, setToast] = useState<{ mensaje: string; accion?: string } | null>(null);

  const recargar = useCallback(async () => {
    try {
      const lista = await obtenerEventosPisu();
      setEventos(lista.filter((e) => e.estado !== false));
    } catch (err) {
      onError(mensajeError(err));
    }
  }, [onError]);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    void recargar().finally(() => {
      if (activo) setCargando(false);
    });
    return () => { activo = false; };
  }, [recargar]);

  const ahora = new Date();

  const eventosFiltrados = eventos.filter((e) => {
    const fecha = new Date(e.fecha);
    const esPasado = fecha < ahora;
    if (filtro === "proximos") return !esPasado && !e.inscrito;
    if (filtro === "inscritos") return e.inscrito;
    if (filtro === "pasados") return esPasado;
    return true;
  });

  async function alternarInscripcion(evento: EventoPisu) {
    setEnviandoId(evento.id);
    try {
      if (evento.inscrito) {
        await cancelarInscripcionEventoPisu(evento.id);
        onAviso(`Cancelaste tu inscripción a ${evento.nombre}.`, "eventos");
      } else {
        await inscribirseEventoPisu(evento.id);
        onAviso(`Quedaste inscrito en ${evento.nombre}.`, "eventos");
      }
      await recargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setEnviandoId(null);
    }
  }

  if (cargando) {
    return <p className="text-sm text-slate-400">Cargando eventos...</p>;
  }

  const tabs = [
    { key: "proximos", label: "Próximos" },
    { key: "inscritos", label: "Mis inscripciones" },
    { key: "pasados", label: "Pasados" },
  ] as const;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFiltro(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              filtro === t.key
                ? "bg-sky-400 text-slate-950"
                : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {eventosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-slate-400">
            {filtro === "inscritos"
              ? "No estás inscrito en ningún evento. Explora los próximos eventos para inscribirte."
              : filtro === "pasados"
              ? "No hay eventos pasados."
              : "No hay eventos próximos disponibles."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eventosFiltrados.map((evento) => {
            const fecha = new Date(evento.fecha);
            const esPasado = fecha < ahora;
            const disponibles = evento.cupo_disponible ?? evento.cupo_maximo;
            const abierto = evento.abierto !== false && !esPasado;

            return (
              <article
                key={evento.id}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium text-white truncate">{evento.nombre}</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      {fecha.toLocaleString("es-CO", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })} · {evento.lugar}
                    </p>
                  </div>
                  {evento.inscrito && (
                    <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      Inscrito
                    </span>
                  )}
                </div>

                {evento.descripcion && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">{evento.descripcion}</p>
                )}

                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                  <span>Cupos {disponibles}/{evento.cupo_maximo}</span>
                  {esPasado && <span className="text-rose-400">Finalizado</span>}
                  {!abierto && !esPasado && <span className="text-amber-400">Cerrado</span>}
                </div>

                {perfil?.rol === "Estudiante" && !esPasado && (
                  <button
                    type="button"
                    disabled={enviandoId === evento.id || (!evento.inscrito && disponibles <= 0) || !abierto}
                    onClick={() => void alternarInscripcion(evento)}
                    className={`mt-4 self-start rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                      evento.inscrito
                        ? "border border-white/20 text-slate-200 hover:bg-white/10"
                        : "bg-sky-400 text-slate-950 hover:bg-sky-300"
                    }`}
                  >
                    {enviandoId === evento.id
                      ? "..."
                      : evento.inscrito
                      ? "Cancelar inscripción"
                      : disponibles <= 0
                      ? "Sin cupo"
                      : !abierto
                      ? "No disponible"
                      : "Inscribirme"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {toast && (
        <Toast
          message={toast.mensaje}
          action={toast.accion}
          onAction={() => {
            if (toast.accion) setFiltro(toast.accion as "inscritos");
            setToast(null);
          }}
        />
      )}
    </section>
  );
}