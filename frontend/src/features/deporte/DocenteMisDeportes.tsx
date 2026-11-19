/**
 * Pantalla "Mis deportes" del rol Docente (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Es la pantalla de inicio del docente: muestra contadores generales y permite
 * alternar entre una VISTA SEMANAL (bloques por día) y la lista de deportes con
 * sus métricas y accesos a estudiantes, reporte y llamar a lista.
 */

import { useCallback, useEffect, useState } from "react";
import { obtenerEventosDocente, obtenerMisDeportesDocente } from "../../api/deporte";
import type { EventoPisu, MiDeporteDocente } from "../../types/deporte";
import PanelHero from "./PanelHero";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  ProgressBar,
  Skeleton,
  SportIcon,
  StatCard,
  Tabs,
} from "./ui";
import { DIAS, fechaLocal, horaCorta, mensajeError } from "./utils";

type Props = {
  usuario: { nombre_completo?: string; email: string };
  onError: (mensaje: string) => void;
  onNavegar: (vista: string) => void;
};

/** Orden de la semana comenzando por lunes. */
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

function tonoEtiqueta(etiqueta: string): "neutral" | "success" | "warning" {
  if (etiqueta === "En curso") return "success";
  if (etiqueta === "Hoy") return "warning";
  return "neutral";
}

export default function DocenteMisDeportes({ usuario, onError, onNavegar }: Props) {
  const [deportes, setDeportes] = useState<MiDeporteDocente[]>([]);
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<"semana" | "deportes">("semana");

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [misDeportes, misEventos] = await Promise.all([
        obtenerMisDeportesDocente(),
        obtenerEventosDocente(),
      ]);
      setDeportes(misDeportes);
      setEventos(misEventos.filter((e) => e.estado_evento !== "cancelado" && !e.finalizado));
    } catch (err) {
      const mensaje = mensajeError(err);
      setError(mensaje);
      onError(mensaje);
    } finally {
      setCargando(false);
    }
  }, [onError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  /** Próximos eventos de un deporte (para mostrarlos en su tarjeta). */
  function proximosDe(deporteId: string): EventoPisu[] {
    const ahora = Date.now();
    return eventos
      .filter(
        (evento) =>
          evento.deporte?.id === deporteId &&
          new Date(`${evento.fecha.slice(0, 10)}T23:59:00`).getTime() >= ahora,
      )
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .slice(0, 2);
  }

  const totalInscritos = deportes.reduce((acc, d) => acc + d.inscritos, 0);
  const clasesHoy = deportes.reduce((acc, d) => acc + d.clases_hoy, 0);
  const totalSesiones = deportes.reduce((acc, d) => acc + (d.total_sesiones_registradas ?? 0), 0);
  const totalAsistencias = deportes.reduce(
    (acc, d) => acc + (d.total_asistencias_registradas ?? 0),
    0,
  );
  const totalFaltas = deportes.reduce((acc, d) => acc + (d.total_faltas ?? 0), 0);
  const conPorcentaje = deportes.filter((d) => d.porcentaje_asistencia !== null);
  const promedioAsistencia = conPorcentaje.length
    ? Math.round(
        conPorcentaje.reduce((acc, d) => acc + (d.porcentaje_asistencia ?? 0), 0) /
          conPorcentaje.length,
      )
    : null;
  const hoy = fechaLocal(new Date());

  if (cargando) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-56 w-full rounded-3xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void cargar()} />;
  }

  const nombre = usuario.nombre_completo || usuario.email;
  const chipClass =
    "inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-100 ring-1 ring-white/10";

  return (
    <div className="space-y-5">
      <PanelHero
        nombre={nombre}
        rol="Docente"
        descripcion="Consulta tu semana, tus deportes asignados y el estado de la asistencia."
        chips={
          <>
            <span className={chipClass}>
              <Icon nombre="deportes" className="h-3.5 w-3.5 text-uni-cian" />
              {deportes.length} deportes asignados
            </span>
            <span className={chipClass}>
              <Icon nombre="usuarios" className="h-3.5 w-3.5 text-uni-amarillo" />
              {totalInscritos} estudiantes inscritos
            </span>
            <span className={chipClass}>
              <Icon nombre="horario" className="h-3.5 w-3.5 text-emerald-300" />
              {clasesHoy} clases hoy
            </span>
            <span className={chipClass}>
              <Icon nombre="racha" className="h-3.5 w-3.5 text-uni-cian" />
              {promedioAsistencia === null ? "—" : `${promedioAsistencia}%`} asistencia promedio
            </span>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={deportes.length}
          label="Deportes asignados"
          icono="deportes"
          acento="text-uni-cian"
        />
        <StatCard
          value={totalInscritos}
          label="Estudiantes inscritos"
          icono="usuarios"
          acento="text-uni-amarillo"
        />
        <StatCard
          value={clasesHoy}
          label="Clases hoy"
          icono="horario"
          acento="text-emerald-300"
        />
        <StatCard
          value={promedioAsistencia === null ? "—" : `${promedioAsistencia}%`}
          label="Asistencia promedio"
          icono="racha"
          acento="text-uni-cian"
        />
        <StatCard
          value={totalSesiones}
          label="Sesiones registradas"
          icono="calendario"
          acento="text-uni-amarillo"
        />
        <StatCard
          value={totalAsistencias}
          label="Marcas de asistencia"
          icono="check"
          acento="text-emerald-300"
        />
        <StatCard
          value={totalFaltas}
          label="Faltas registradas"
          icono="alerta"
          acento="text-rose-300"
        />
      </section>

      <Tabs
        label="Vista de deportes"
        items={[
          { id: "semana", label: "Semana", icono: "calendario" },
          { id: "deportes", label: "Mis deportes", icono: "deportes" },
        ]}
        value={modo}
        onChange={(id) => setModo(id as "semana" | "deportes")}
      />

      {deportes.length === 0 ? (
        <EmptyState
          title="Aún no tienes deportes asignados"
          description="Cuando el administrador te asigne un deporte aparecerá aquí."
        />
      ) : modo === "semana" ? (
        <div className="overflow-x-auto">
          <div className="grid min-w-[880px] grid-cols-7 gap-3">
            {ORDEN_SEMANA.map((dia) => {
              const bloques = deportes.flatMap((d) =>
                d.horarios
                  .filter((h) => h.dia_semana === dia)
                  .map((h) => ({ deporte: d, horario: h })),
              );
              const esHoy = new Date().getDay() === dia;
              return (
                <div key={dia} className="space-y-2">
                  <p className={`text-xs font-bold uppercase tracking-wide ${esHoy ? "text-uni-amarillo" : "text-slate-400"}`}>
                    {DIAS[dia]}
                  </p>
                  {bloques.length === 0 ? (
                    <div className="h-20 rounded-xl border border-dashed border-white/10" />
                  ) : (
                    bloques.map(({ deporte, horario }) => (
                      <div
                        key={horario.id}
                        className={`rounded-xl border p-3 text-xs ${horario.describe.en_curso ? "border-emerald-400/40 bg-emerald-500/10" : horario.describe.es_hoy ? "border-uni-amarillo/40 bg-uni-amarillo/10" : "border-white/10 bg-white/[0.04]"}`}
                      >
                        <p className="font-semibold text-white">{deporte.nombre}</p>
                        <p className="mt-0.5 text-slate-300">
                          {horaCorta(horario.hora_inicio)}–{horaCorta(horario.hora_fin)}
                        </p>
                        <p className="text-slate-400">{horario.lugar}</p>
                        <div className="mt-2">
                          <Badge tone={tonoEtiqueta(horario.describe.etiqueta)}>
                            {horario.describe.etiqueta}
                          </Badge>
                        </div>
                        {horario.describe.es_hoy ? (
                          <button
                            type="button"
                            className="mt-2 text-[11px] font-semibold text-sky-300"
                            onClick={() => onNavegar(`lista:${horario.id}:${hoy}`)}
                          >
                            Llamar a lista
                          </button>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {deportes.map((deporte) => (
            <Card key={deporte.id} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-uni-cian">
                    <SportIcon nombre={deporte.nombre} />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold">{deporte.nombre}</h3>
                    <p className="text-xs text-slate-400">
                      {deporte.inscritos} / {deporte.cupo_maximo} inscritos · {deporte.cupos_disponibles} cupos libres
                    </p>
                    <p className="mt-1 flex flex-wrap gap-1">
                      {deporte.categorias_permitidas.map((c) => (
                        <Badge key={c}>{c}</Badge>
                      ))}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-uni-amarillo">
                    {deporte.porcentaje_asistencia === null ? "—" : `${deporte.porcentaje_asistencia}%`}
                  </p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400">Asistencia</p>
                </div>
              </div>

              <ProgressBar value={deporte.porcentaje_asistencia ?? 0} />

              <div className="space-y-2">
                <div className="grid gap-2 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
                    <p className="text-slate-400 uppercase tracking-wider">Sesiones</p>
                    <p className="font-semibold text-white">{deporte.total_sesiones_registradas ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
                    <p className="text-slate-400 uppercase tracking-wider">Asistencias</p>
                    <p className="font-semibold text-white">{deporte.total_asistencias_registradas ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
                    <p className="text-slate-400 uppercase tracking-wider">Faltas</p>
                    <p className="font-semibold text-white text-rose-300">{deporte.total_faltas ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2">
                    <p className="text-slate-400 uppercase tracking-wider">Última actividad</p>
                    <p className="font-semibold text-white">
                      {deporte.ultima_actividad ? fechaLocal(new Date(deporte.ultima_actividad)) : "—"}
                    </p>
                  </div>
                </div>
                {deporte.horarios.length === 0 ? (
                  <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                    Deporte asignado. Aún no tiene horarios publicados: pídele al
                    administrador que publique un horario para poder llamar a lista.
                  </p>
                ) : (
                  deporte.horarios.map((h) => (
                    <div
                      key={h.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
                    >
                      <span className="text-slate-200">
                        {h.dia} {horaCorta(h.hora_inicio)}–{horaCorta(h.hora_fin)} · {h.lugar}
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge tone={tonoEtiqueta(h.describe.etiqueta)}>{h.describe.detalle}</Badge>
                        {h.describe.es_hoy ? (
                          <button
                            type="button"
                            className="font-semibold text-sky-300"
                            onClick={() => onNavegar(`lista:${h.id}:${hoy}`)}
                          >
                            Llamar a lista
                          </button>
                        ) : null}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {proximosDe(deporte.id).length > 0 ? (
                <div className="space-y-1 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Próximos eventos
                  </p>
                  {proximosDe(deporte.id).map((evento) => (
                    <p key={evento.id} className="text-xs text-slate-200">
                      <span className="font-semibold">{evento.nombre}</span> ·{" "}
                      {fechaLocal(new Date(evento.fecha))}
                      {evento.hora_inicio ? ` · ${horaCorta(evento.hora_inicio)}` : ""} ·{" "}
                      {evento.lugar}
                    </p>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => onNavegar(`estudiantes:${deporte.id}`)}>
                  Ver estudiantes
                </Button>
                <Button variant="secondary" onClick={() => onNavegar(`reporte:${deporte.id}`)}>
                  Reporte del deporte
                </Button>
                <Button onClick={() => onNavegar(`eventos:${deporte.id}`)}>
                  Crear evento para este deporte
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
