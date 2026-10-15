import { useEffect, useState } from "react";
import { obtenerMisHorariosPisu, obtenerEventosPisu } from "../../api/deporte";
import type { HorarioEstudiantePisu, EventoPisu, AsistenciaEstudiantePisu } from "../../types/deporte";
import { DIAS, etiquetaHorario } from "./utils";

type MiHorarioEstudianteProps = {
  asistencias: AsistenciaEstudiantePisu[];
};

export default function MiHorarioEstudiante({ asistencias }: MiHorarioEstudianteProps) {
  const [horarios, setHorarios] = useState<HorarioEstudiantePisu[]>([]);
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    Promise.all([obtenerMisHorariosPisu(), obtenerEventosPisu()])
      .then(([h, e]) => {
        if (activo) {
          setHorarios(h);
          setEventos(e.filter((ev) => ev.inscrito && ev.estado !== false));
        }
      })
      .catch(console.error)
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => { activo = false; };
  }, []);

  const ahora = new Date();
  const eventosProximos = eventos
    .filter((e) => new Date(e.fecha) >= ahora)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  const eventosPasados = eventos
    .filter((e) => new Date(e.fecha) < ahora)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  // Create attendance lookup by horario_id
  const asistenciaPorHorario = new Map<string, { total: number; presentes: number; porcentaje: number }>();
  asistencias.forEach((a) => {
    if (a.horario?.id) {
      const key = a.horario.id;
      const current = asistenciaPorHorario.get(key) || { total: 0, presentes: 0, porcentaje: 0 };
      current.total += 1;
      if (a.presente) current.presentes += 1;
      current.porcentaje = current.total > 0 ? Math.round((current.presentes / current.total) * 100) : 0;
      asistenciaPorHorario.set(key, current);
    }
  });

  if (cargando) {
    return <p className="text-sm text-slate-400">Cargando horario...</p>;
  }

  if (horarios.length === 0 && eventos.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-slate-400 mb-4">No tienes actividades programadas.</p>
        <p className="text-sm text-slate-500">
          Inscríbete en deportes desde el Catálogo o en Eventos para verlos aquí.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {horarios.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
            Horarios de entrenamientos
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {horarios.map((horario) => {
              const asis = asistenciaPorHorario.get(horario.id);
              return (
                <article
                  key={horario.id}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-medium text-white truncate">{horario.deporte?.nombre || "Deporte"}</h4>
                      <p className="mt-1 text-sm text-slate-300">
                        {DIAS[horario.dia_semana]} · {etiquetaHorario(horario)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                      Entrenamiento
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {horario.lugar}
                    {horario.docente && ` · ${horario.docente.nombre}`}
                  </p>
                  {asis && (
                    <div className="mt-3 flex items-center gap-2 text-[11px]">
                      <span className="text-slate-500">Asistencia:</span>
                      <span className="font-medium text-emerald-300">{asis.presentes}</span>
                      <span className="text-slate-500">/</span>
                      <span className="font-medium">{asis.total}</span>
                      <span className="text-slate-500">({asis.porcentaje}%)</span>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {eventosProximos.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
            Eventos próximos
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {eventosProximos.map((evento) => {
              const fecha = new Date(evento.fecha);
              return (
                <article
                  key={evento.id}
                  className="flex flex-col rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-4"
                >
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
                    <span className="shrink-0 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                      Evento
                    </span>
                  </div>
                  {evento.descripcion && (
                    <p className="mt-2 line-clamp-1 text-sm text-slate-400">{evento.descripcion}</p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {eventosPasados.length > 0 && (
        <details className="group rounded-2xl border border-white/10 bg-white/5">
          <summary className="flex items-center gap-2 p-4 cursor-pointer list-none">
            <span className="font-medium text-slate-300">Eventos pasados ({eventosPasados.length})</span>
            <svg className="ml-auto h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <div className="px-4 pb-4 grid gap-3 sm:grid-cols-2">
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
    </section>
  );
}