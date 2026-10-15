/**
 * Eventos y comunicados del rol Estudiante (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Reúne tres cosas en una sola pantalla:
 *   1) Los comunicados (campana) que el estudiante recibe.
 *   2) El catálogo de eventos disponibles de los docentes (con \"Organiza\"),
 *      filtrable por deporte y con el botón Participar / Inscrito / Lleno.
 *   3) \"Mis eventos\": los eventos en los que está inscrito, incluidos los
 *      cancelados (que muestran el motivo).
 *
 * ¿Cómo se relaciona con los demás?
 * Consume `/deportes/eventos` (catálogo) y `/estudiante/eventos/mios` (mis
 * eventos). La inscripción valida cupo, plazo, categoría y cruce en el backend.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelarInscripcionEventoPisu,
  inscribirseEventoPisu,
  obtenerAlertasPisu,
  obtenerEventosPisu,
  obtenerMisEventosPisu,
} from "../../api/deporte";
import type { AlertaPisu, EventoPisu, PerfilPisu } from "../../types/deporte";
import CompletarPerfilPisu from "./CompletarPerfilPisu";
import { Badge, EmptyState, ErrorState, Skeleton } from "./ui";
import { fechaLocal, mensajeError } from "./utils";

type EventosAlertasPisuProps = {
  perfil: PerfilPisu | null;
  onAviso: (valor: string, accion?: string) => void;
  onError: (valor: string) => void;
};

function hora12(hora?: string | null): string {
  if (!hora) return "";
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  const sufijo = (h ?? 0) >= 12 ? "p. m." : "a. m.";
  const h12 = (h ?? 0) % 12 === 0 ? 12 : (h ?? 0) % 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${sufijo}`;
}

function tonoTipo(tipo?: string): "neutral" | "success" | "warning" | "danger" {
  if (tipo === "Torneo") return "success";
  if (tipo === "Masterclass") return "warning";
  return "neutral";
}

function estadoDe(evento: EventoPisu): { texto: string; tono: "neutral" | "success" | "warning" | "danger" } {
  if (evento.estado_evento === "cancelado") return { texto: "Cancelado", tono: "danger" };
  if (evento.finalizado) return { texto: "Finalizado", tono: "neutral" };
  return { texto: "Publicado", tono: "success" };
}

export default function EventosAlertasPisu({
  perfil,
  onAviso,
  onError,
}: EventosAlertasPisuProps) {
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [mios, setMios] = useState<EventoPisu[]>([]);
  const [alertas, setAlertas] = useState<AlertaPisu[]>([]);
  const [filtroDeporte, setFiltroDeporte] = useState("");
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);

  const esEstudiante = perfil?.rol === "Estudiante";

  const recargar = useCallback(async () => {
    const [listaEventos, listaAlertas, misEventos] = await Promise.all([
      obtenerEventosPisu(),
      obtenerAlertasPisu(),
      esEstudiante ? obtenerMisEventosPisu() : Promise.resolve([] as EventoPisu[]),
    ]);
    setEventos(listaEventos.filter((e) => e.estado !== false));
    setAlertas(listaAlertas);
    setMios(misEventos);
  }, [esEstudiante]);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setErrorCarga(null);
    void recargar()
      .catch((err) => {
        if (activo) setErrorCarga(mensajeError(err));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [recargar]);

  const deportes = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const evento of eventos) {
      if (evento.deporte) mapa.set(evento.deporte.id, evento.deporte.nombre);
    }
    return [...mapa.entries()];
  }, [eventos]);

  const visibles = useMemo(
    () =>
      filtroDeporte
        ? eventos.filter((evento) => evento.deporte?.id === filtroDeporte)
        : eventos,
    [eventos, filtroDeporte],
  );

  async function alternarInscripcion(evento: EventoPisu) {
    setEnviandoId(evento.id);
    try {
      if (evento.inscrito) {
        await cancelarInscripcionEventoPisu(evento.id);
        onAviso(`Cancelaste tu inscripción a ${evento.nombre}.`);
      } else {
        await inscribirseEventoPisu(evento.id);
        onAviso(`Quedaste inscrito en ${evento.nombre}.`);
      }
      await recargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setEnviandoId(null);
    }
  }

  if (cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (errorCarga) {
    return <ErrorState message={errorCarga} onRetry={() => void recargar().catch((e) => onError(mensajeError(e)))} />;
  }

  return (
    <div className="space-y-6">
      {esEstudiante && perfil ? (
        <CompletarPerfilPisu
          perfil={perfil}
          onAviso={onAviso}
          onError={onError}
          onRecargar={recargar}
        />
      ) : null}
      {alertas.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Comunicados
          </h3>
          {alertas.slice(0, 5).map((alerta) => (
            <article
              key={alerta.id}
              className={`rounded-2xl border px-4 py-3 ${
                alerta.estudiante_id
                  ? "border-rose-400/40 bg-rose-400/10"
                  : "border-amber-400/30 bg-amber-400/10"
              }`}
            >
              <p className="text-sm font-semibold text-amber-100">{alerta.titulo}</p>
              <p className="mt-1 text-sm text-amber-50/90">{alerta.mensaje}</p>
            </article>
          ))}
        </section>
      ) : null}

      {esEstudiante && mios.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Mis eventos
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {mios.map((evento) => {
              const estado = estadoDe(evento);
              return (
                <article
                  key={evento.id}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-white">{evento.nombre}</p>
                    <Badge tone={estado.tono}>{estado.texto}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {evento.deporte?.nombre ?? "Sin deporte"} · {fechaLocal(new Date(evento.fecha))}{" "}
                    {hora12(evento.hora_inicio)}
                  </p>
                  {evento.estado_evento === "cancelado" && evento.motivo_cancelacion ? (
                    <p className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                      Motivo: {evento.motivo_cancelacion}
                    </p>
                  ) : evento.inscrito ? (
                    <button
                      type="button"
                      disabled={enviandoId === evento.id}
                      onClick={() => void alternarInscripcion(evento)}
                      className="mt-3 self-start rounded-full border border-white/20 px-4 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/10 disabled:opacity-50"
                    >
                      Cancelar inscripción
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-slate-400">
            Eventos disponibles
          </h3>
          {deportes.length > 0 ? (
            <select
              value={filtroDeporte}
              onChange={(e) => setFiltroDeporte(e.target.value)}
              className="rounded-xl border border-white/15 bg-slate-950 px-3 py-1.5 text-xs text-white outline-none ring-orange-400 focus:ring-2"
            >
              <option value="">Todos los deportes</option>
              {deportes.map(([id, nombre]) => (
                <option key={id} value={id}>
                  {nombre}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {visibles.length === 0 ? (
          <EmptyState
            title="No hay eventos publicados"
            description="Cuando un docente publique un torneo o masterclass aparecerá aquí."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {visibles.map((evento) => {
              const disponibles = evento.cupo_disponible ?? evento.cupo_maximo;
              const abierto = evento.abierto !== false;
              const cupo = disponibles > 0;
              const etiqueta = evento.inscrito
                ? "Inscrito"
                : !abierto
                  ? "Finalizado"
                  : !cupo
                    ? "Lleno"
                    : evento.inscripcion_abierta === false
                      ? "No disponible"
                      : "Participar";
              return (
                <article
                  key={evento.id}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-white">{evento.nombre}</p>
                    <Badge tone={tonoTipo(evento.tipo)}>{evento.tipo ?? "General"}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    {evento.deporte?.nombre ?? "Sin deporte"}
                    {evento.creador ? ` · Organiza: ${evento.creador.nombre}` : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">
                    {fechaLocal(new Date(evento.fecha))} · {hora12(evento.hora_inicio)}–{hora12(evento.hora_fin)} ·{" "}
                    {evento.lugar}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Cupos {disponibles}/{evento.cupo_maximo}
                    {evento.fecha_limite_inscripcion
                      ? ` · Cierra ${fechaLocal(new Date(evento.fecha_limite_inscripcion))}`
                      : ""}
                  </p>
                  {esEstudiante ? (
                    <button
                      type="button"
                      disabled={
                        enviandoId === evento.id ||
                        (!evento.inscrito &&
                          (evento.inscripcion_abierta === false || disponibles <= 0 || !abierto))
                      }
                      onClick={() => void alternarInscripcion(evento)}
                      className={`mt-3 self-start rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                        evento.inscrito
                          ? "border border-white/20 text-slate-200 hover:bg-white/10"
                          : "bg-sky-400 text-slate-950 hover:bg-sky-300"
                      }`}
                    >
                      {etiqueta}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
