import { useEffect, useState } from "react";
import { obtenerCatalogoDeportes, obtenerEventosPisu } from "../../api/deporte";
import type { DeportePisu, EventoPisu, AsistenciaEstudiantePisu } from "../../types/deporte";
import { etiquetaHorario } from "./utils";

type MisDeportesEventosProps = {
  asistencias: AsistenciaEstudiantePisu[];
  onError: (valor: string) => void;
};

export default function MisDeportesEventos({ asistencias, onError }: MisDeportesEventosProps) {
  const [deportes, setDeportes] = useState<DeportePisu[]>([]);
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState<"deportes" | "eventos">("deportes");

  useEffect(() => {
    let activo = true;
    setCargando(true);
    Promise.all([obtenerCatalogoDeportes(), obtenerEventosPisu()])
      .then(([catalogo, listaEventos]) => {
        if (activo) {
          setDeportes(catalogo.deportes.filter((d) => d.inscrito));
          setEventos(listaEventos.filter((e) => e.inscrito && e.estado !== false));
        }
      })
      .catch((err) => onError(err))
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => { activo = false; };
  }, [onError]);

  // Create attendance lookup by deporte_id (from horario.deporte_id)
  const asistenciaPorDeporte = new Map<string, { total: number; presentes: number; porcentaje: number }>();
  asistencias.forEach((a) => {
    if (a.horario?.deporte_id) {
      const key = a.horario.deporte_id;
      const current = asistenciaPorDeporte.get(key) || { total: 0, presentes: 0, porcentaje: 0 };
      current.total += 1;
      if (a.presente) current.presentes += 1;
      current.porcentaje = current.total > 0 ? Math.round((current.presentes / current.total) * 100) : 0;
      asistenciaPorDeporte.set(key, current);
    }
  });

  const ahora = new Date();
  const eventosProximos = eventos
    .filter((e) => new Date(e.fecha) >= ahora)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  const eventosPasados = eventos
    .filter((e) => new Date(e.fecha) < ahora)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const totalInscritos = deportes.length + eventos.length;

  if (cargando) {
    return <p className="text-sm text-slate-400">Cargando tus actividades...</p>;
  }

  if (totalInscritos === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-slate-400 mb-4">No estás inscrito en ninguna actividad.</p>
        <p className="text-sm text-slate-500">
          Explora el <strong>Catálogo</strong> para deportes o <strong>Eventos</strong> para inscribirte.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("deportes")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            tab === "deportes"
              ? "bg-sky-400 text-slate-950"
              : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          Deportes ({deportes.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("eventos")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            tab === "eventos"
              ? "bg-emerald-400 text-slate-950"
              : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
          }`}
        >
          Eventos ({eventos.length})
        </button>
      </div>

      {tab === "deportes" && (
        <div className="space-y-3">
          {deportes.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No tienes deportes inscritos.</p>
          ) : (
            deportes.map((deporte) => {
              const asis = asistenciaPorDeporte.get(deporte.id);
              return (
                <article
                  key={deporte.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5">
                      <svg className="h-6 w-6 text-orange-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2l3 7 7 .7-5 4.7 1.5 7.1L12 18l-6.5 3.5L7 14.4 2 9.7 9 9z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{deporte.nombre}</h4>
                      <p className="text-xs text-slate-400">Cupos {deporte.cupo_disponible}/{deporte.cupo_maximo}</p>
                    </div>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {deporte.horarios.map((horario) => (
                      <span
                        key={horario.id}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                      >
                        {etiquetaHorario(horario)}
                        {horario.docente && ` · ${horario.docente.nombre}`}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {asis && (
                      <span className="text-[11px] text-slate-400">
                        Asistencia: {asis.porcentaje}%
                      </span>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      )}

      {tab === "eventos" && (
        <div className="space-y-3">
          {eventos.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No tienes eventos inscritos.</p>
          ) : (
            <>
              {eventosProximos.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-300">Próximos ({eventosProximos.length})</h4>
                  <div className="space-y-2">
                    {eventosProximos.map((evento) => {
                      const fecha = new Date(evento.fecha);
                      return (
                        <article key={evento.id} className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-medium text-white truncate">{evento.nombre}</h4>
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
                          </div>
                          {evento.descripcion && <p className="mt-2 text-sm text-slate-400">{evento.descripcion}</p>}
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
              {eventosPasados.length > 0 && (
                <details className="group rounded-2xl border border-white/10 bg-white/5">
                  <summary className="flex items-center gap-2 p-4 cursor-pointer list-none">
                    <span className="font-medium text-slate-300">Pasados ({eventosPasados.length})</span>
                    <svg className="ml-auto h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="px-4 pb-4 space-y-2">
                    {eventosPasados.map((evento) => {
                      const fecha = new Date(evento.fecha);
                      return (
                        <article key={evento.id} className="rounded-xl border border-white/10 bg-white/5 p-3 opacity-60">
                          <p className="font-medium text-slate-300 truncate">{evento.nombre}</p>
                          <p className="text-sm text-slate-400">
                            {fecha.toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · {evento.lugar}
                          </p>
                        </article>
                      );
                    })}
                  </div>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}