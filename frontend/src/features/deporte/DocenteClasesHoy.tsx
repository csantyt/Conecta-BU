/**
 * Pantalla "Clases de hoy" del rol Docente (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Lista las clases del docente del día actual con su estado en tiempo real y el
 * acceso directo a "Llamar a lista". Se refresca sola cada minuto.
 */

import { useCallback, useEffect, useState } from "react";
import { obtenerClasesHoyDocente, obtenerEventosDocente } from "../../api/deporte";
import type { ClaseHoyDocente, EventoPisu } from "../../types/deporte";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from "./ui";
import { fechaLocal, horaCorta, mensajeError } from "./utils";

type Props = {
  onError: (mensaje: string) => void;
  onNavegar: (vista: string) => void;
};

function tonoEstado(estado: ClaseHoyDocente["estado"]): "neutral" | "success" | "warning" {
  if (estado === "En curso") return "success";
  if (estado === "Por comenzar") return "warning";
  return "neutral";
}

export default function DocenteClasesHoy({ onError, onNavegar }: Props) {
  const [clases, setClases] = useState<ClaseHoyDocente[]>([]);
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!silencioso) setCargando(true);
      setError(null);
      try {
        const [listaClases, listaEventos] = await Promise.all([
          obtenerClasesHoyDocente(),
          obtenerEventosDocente(),
        ]);
        setClases(listaClases);
        setEventos(listaEventos.filter((e) => e.estado_evento !== "cancelado" && !e.finalizado));
      } catch (err) {
        const mensaje = mensajeError(err);
        setError(mensaje);
        onError(mensaje);
      } finally {
        if (!silencioso) setCargando(false);
      }
    },
    [onError],
  );

  useEffect(() => {
    void cargar();
    const id = window.setInterval(() => void cargar(true), 60000);
    return () => window.clearInterval(id);
  }, [cargar]);

  /** Próximos eventos del deporte de una clase. */
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

  if (cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void cargar()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clases de hoy"
        description={new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
        action={
          <Button variant="secondary" onClick={() => void cargar()}>
            Actualizar
          </Button>
        }
      />

      {clases.length === 0 ? (
        <EmptyState
          title="No tienes clases programadas para hoy"
          description="Revisa tu semana en 'Mis deportes'."
        />
      ) : (
        <div className="space-y-4">
          {clases.map((clase) => (
            <Card key={clase.horario_id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{clase.deporte.nombre}</h3>
                  <p className="text-sm text-slate-300">
                    {horaCorta(clase.hora_inicio)}–{horaCorta(clase.hora_fin)} · {clase.lugar}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{clase.inscritos} estudiantes inscritos</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge tone={tonoEstado(clase.estado)}>{clase.estado}</Badge>
                  {clase.asistencia_registrada ? (
                    <Badge tone="success">Asistencia registrada</Badge>
                  ) : (
                    <Badge tone="warning">Sin registrar</Badge>
                  )}
                </div>
              </div>

              {clase.motivo_no_puede ? (
                <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  {clase.motivo_no_puede}
                </p>
              ) : null}

              {proximosDe(clase.deporte.id).length > 0 ? (
                <div className="space-y-1 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Próximos eventos de {clase.deporte.nombre}
                  </p>
                  {proximosDe(clase.deporte.id).map((evento) => (
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
                {clase.asistencia_registrada ? (
                  <Button onClick={() => onNavegar(`lista:${clase.horario_id}:${clase.fecha}`)}>
                    Ver / editar asistencia
                  </Button>
                ) : (
                  <Button
                    disabled={!clase.puede_tomar}
                    onClick={() => onNavegar(`lista:${clase.horario_id}:${clase.fecha}`)}
                  >
                    Tomar asistencia
                  </Button>
                )}
                <Button variant="secondary" onClick={() => onNavegar(`eventos:${clase.deporte.id}`)}>
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
