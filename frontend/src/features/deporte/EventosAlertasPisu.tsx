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
import { CoverDeporte } from "./estudianteUI";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  ProgressBar,
  Skeleton,
} from "./ui";
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
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (errorCarga) {
    return <ErrorState message={errorCarga} onRetry={() => void recargar().catch((e) => onError(mensajeError(e)))} />;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Eventos y comunicados"
        description="Torneos, masterclasses y avisos del programa PISU."
        action={
          <Badge tone="info">
            <Icon nombre="eventos" className="h-3.5 w-3.5" />
            {visibles.length} evento{visibles.length === 1 ? "" : "s"}
          </Badge>
        }
      />

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
          <h3 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-300">
            <Icon nombre="campana" className="h-4 w-4 text-uni-mandarina" />
            Comunicados
          </h3>
          {alertas.slice(0, 5).map((alerta) => {
            const personal = Boolean(alerta.estudiante_id);
            return (
              <article
                key={alerta.id}
                className={`rounded-2xl border p-4 ${
                  personal
                    ? "border-rose-400/40 bg-rose-400/10"
                    : "border-uni-cian/25 bg-uni-cian/[0.06]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      personal
                        ? "bg-rose-500/15 text-rose-300"
                        : "bg-uni-cian/15 text-uni-cian"
                    }`}
                  >
                    <Icon nombre={personal ? "alerta" : "campana"} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">{alerta.titulo}</p>
                      {personal ? <Badge tone="danger">Para ti</Badge> : null}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{alerta.mensaje}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {esEstudiante && mios.length > 0 ? (
        <section className="space-y-3">
          <h3 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-300">
            <Icon nombre="medalla" className="h-4 w-4 text-uni-amarillo" />
            Mis eventos
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {mios.map((evento) => {
              const estado = estadoDe(evento);
              return (
                <article
                  key={evento.id}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-white/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-white">{evento.nombre}</p>
                    <Badge tone={estado.tono}>{estado.texto}</Badge>
                  </div>
                  <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-400">
                    <Icon nombre="deportes" className="h-3.5 w-3.5 text-uni-cian" />
                    {evento.deporte?.nombre ?? "Sin deporte"}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                    <Icon nombre="calendario" className="h-3.5 w-3.5 text-uni-cian" />
                    {fechaLocal(new Date(evento.fecha))} · {hora12(evento.hora_inicio)}
                  </p>
                  {evento.estado_evento === "cancelado" && evento.motivo_cancelacion ? (
                    <p className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                      Motivo: {evento.motivo_cancelacion}
                    </p>
                  ) : evento.inscrito ? (
                    <Button
                      variant="secondary"
                      className="mt-3 self-start"
                      loading={enviandoId === evento.id}
                      onClick={() => void alternarInscripcion(evento)}
                    >
                      Cancelar inscripción
                    </Button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-300">
            <Icon nombre="chispa" className="h-4 w-4 text-uni-cian" />
            Eventos disponibles
          </h3>
          {deportes.length > 0 ? (
            <select
              value={filtroDeporte}
              onChange={(e) => setFiltroDeporte(e.target.value)}
              aria-label="Filtrar eventos por deporte"
              className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-xs text-white outline-none transition focus:border-uni-cian/60 focus:ring-2 focus:ring-uni-cian/40"
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
            icono="eventos"
            action={
              filtroDeporte ? (
                <Button variant="secondary" onClick={() => setFiltroDeporte("")}>
                  Ver todos los deportes
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
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
              const maximo = Math.max(1, evento.cupo_maximo);
              const ocupados = Math.min(maximo, Math.max(0, maximo - disponibles));
              const puedeParticipar =
                evento.inscrito ||
                (evento.inscripcion_abierta !== false && disponibles > 0 && abierto);
              return (
                <article
                  key={evento.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:border-uni-cian/30 hover:shadow-xl hover:shadow-black/20"
                >
                  <CoverDeporte
                    nombre={evento.deporte?.nombre ?? "Bienestar"}
                    className="h-28 rounded-none"
                  >
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
                      <p className="min-w-0 truncate text-sm font-bold text-white">
                        {evento.nombre}
                      </p>
                      <Badge tone={tonoTipo(evento.tipo)}>{evento.tipo ?? "General"}</Badge>
                    </div>
                  </CoverDeporte>

                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <p className="text-xs text-slate-300">
                      {evento.deporte?.nombre ?? "Sin deporte"}
                      {evento.creador ? ` · Organiza: ${evento.creador.nombre}` : ""}
                    </p>
                    <p className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Icon nombre="calendario" className="h-3.5 w-3.5 text-uni-cian" />
                      {fechaLocal(new Date(evento.fecha))} · {hora12(evento.hora_inicio)}–
                      {hora12(evento.hora_fin)}
                    </p>
                    <p className="inline-flex items-center gap-1 text-xs text-slate-400">
                      <Icon nombre="ubicacion" className="h-3.5 w-3.5 text-uni-cian" />
                      {evento.lugar}
                    </p>
                    <div className="mt-1">
                      <ProgressBar
                        value={ocupados}
                        max={maximo}
                        label={`Cupos ${disponibles}/${evento.cupo_maximo}`}
                        tone={disponibles <= 0 ? "danger" : disponibles <= 3 ? "warning" : "success"}
                      />
                    </div>
                    {evento.fecha_limite_inscripcion ? (
                      <p className="text-[11px] text-slate-400">
                        Cierra {fechaLocal(new Date(evento.fecha_limite_inscripcion))}
                      </p>
                    ) : null}
                    {esEstudiante ? (
                      <Button
                        variant={evento.inscrito ? "secondary" : "primary"}
                        className="mt-auto self-start"
                        loading={enviandoId === evento.id}
                        disabled={!puedeParticipar}
                        onClick={() => void alternarInscripcion(evento)}
                      >
                        {evento.inscrito ? "Cancelar inscripción" : etiqueta}
                      </Button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
