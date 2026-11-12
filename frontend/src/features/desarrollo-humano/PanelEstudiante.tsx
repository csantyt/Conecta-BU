import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  agendarCita,
  cancelarCita,
  cancelarInscripcion,
  inscribirseEvento,
  obtenerHorariosDisponibles,
} from "../../api/desarrolloHumano";
import type { Cita, EventoDH, Horario, Servicio } from "../../types/desarrolloHumano";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Icon,
  ProgressBar,
  Skeleton,
  Tabs,
  type NombreIcono,
} from "../deporte/ui";
import CalendarioMes from "./CalendarioMes";
import {
  fechaLocal,
  formatearFecha,
  horaCorta,
  mensajeError,
} from "./utils";

type PanelEstudianteProps = {
  servicios: Servicio[];
  citas: Cita[];
  eventos: EventoDH[];
  cargando?: boolean;
  onAviso: (valor: string, accion?: string) => void;
  onError: (valor: string) => void;
  onRecargar: () => Promise<void>;
};

type VistaEstudiante = "agendar" | "citas" | "eventos";

const ESTADO_CITA: Record<
  Cita["estado"],
  { texto: string; tono: "success" | "warning" | "danger" | "info" }
> = {
  AGENDADA: { texto: "Agendada", tono: "info" },
  CANCELADA: { texto: "Cancelada", tono: "danger" },
  ASISTIO: { texto: "Asistió", tono: "success" },
  NO_ASISTIO: { texto: "No asistió", tono: "warning" },
};

function iconoServicio(nombre: string): NombreIcono {
  const clave = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (clave.includes("psico") || clave.includes("emocional")) return "cerebro";
  if (clave.includes("vocacion") || clave.includes("orientacion")) return "meta";
  if (clave.includes("taller") || clave.includes("grupo")) return "usuarios";
  if (clave.includes("salud") || clave.includes("bienestar")) return "corazon";
  return "perfil";
}

/** Primer día hábil (de los configurados) desde hoy, en formato YYYY-MM-DD. */
function proximaFechaHabil(dias: number[]): string {
  const hoy = new Date();
  for (let salto = 0; salto < 14; salto += 1) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() + salto);
    if (dias.includes(fecha.getDay())) return fechaLocal(fecha);
  }
  return fechaLocal(hoy);
}

export default function PanelEstudiante({
  servicios,
  citas,
  eventos,
  cargando = false,
  onAviso,
  onError,
  onRecargar,
}: PanelEstudianteProps) {
  const [vista, setVista] = useState<VistaEstudiante>("agendar");
  const [servicioId, setServicioId] = useState(servicios[0]?.id ?? "");
  const [fecha, setFecha] = useState(fechaLocal(new Date()));
  const [horarioId, setHorarioId] = useState("");
  const [cupos, setCupos] = useState<Horario[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [porCancelar, setPorCancelar] = useState<
    { tipo: "cita" | "evento"; id: string; texto: string } | null
  >(null);

  const servicio = servicios.find((item) => item.id === servicioId);
  const diasHabiles = useMemo(
    () =>
      Array.from(
        new Set((servicio?.horarios ?? []).filter((h) => h.activo).map((h) => h.dia_semana)),
      ),
    [servicio],
  );

  const cuposDisponibles = useMemo(
    () =>
      cupos.filter((horario) => {
        const instante = new Date(`${fecha}T${horaCorta(horario.hora_inicio)}:00`);
        return instante.getTime() > Date.now();
      }),
    [cupos, fecha],
  );

  useEffect(() => {
    if (!servicioId && servicios[0]) {
      setServicioId(servicios[0].id);
    }
  }, [servicios, servicioId]);

  // Si el día elegido no tiene horarios (p. ej. hoy), salta al próximo hábil.
  useEffect(() => {
    if (diasHabiles.length === 0) return;
    const diaActual = new Date(`${fecha}T12:00:00`).getDay();
    if (!diasHabiles.includes(diaActual) || fecha < fechaLocal(new Date())) {
      setFecha(proximaFechaHabil(diasHabiles));
      setHorarioId("");
    }
  }, [diasHabiles, fecha]);

  useEffect(() => {
    if (!fecha || !servicioId) {
      setCupos([]);
      return;
    }
    void obtenerHorariosDisponibles({ fecha, servicio_id: servicioId })
      .then((lista) => {
        setCupos(lista);
        setHorarioId((actual) =>
          lista.some((item) => item.id === actual) ? actual : "",
        );
      })
      .catch((err) => onError(mensajeError(err)));
  }, [fecha, servicioId, onError]);

  async function onAgendar(event: FormEvent) {
    event.preventDefault();
    setEnviando(true);
    try {
      await agendarCita({
        servicio_id: servicioId,
        horario_id: horarioId,
        fecha,
      });
      onAviso("Cita agendada correctamente.");
      setHorarioId("");
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  }

  async function cancelarInscripcionAEvento(id: string, titulo: string) {
    setEnviandoId(id);
    try {
      await inscribirseEvento(id);
      onAviso(`Inscripción confirmada en ${titulo}.`);
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setEnviandoId(null);
    }
  }

  async function ejecutarCancelacion() {
    if (!porCancelar) return;
    const { tipo, id } = porCancelar;
    setPorCancelar(null);
    setEnviandoId(id);
    try {
      if (tipo === "cita") {
        await cancelarCita(id);
        onAviso("Cita cancelada.");
      } else {
        await cancelarInscripcion(id);
        onAviso("Inscripción cancelada.");
      }
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setEnviandoId(null);
    }
  }

  const citasActivas = citas.filter((cita) => cita.estado === "AGENDADA").length;
  const eventosInscritos = eventos.filter((evento) => evento.inscrito).length;

  const tabs = [
    { id: "agendar", label: "Servicios y agendar", icono: "calendario" as const },
    {
      id: "citas",
      label: "Mis citas",
      icono: "reloj" as const,
      badge: citasActivas || undefined,
    },
    {
      id: "eventos",
      label: "Eventos",
      icono: "eventos" as const,
      badge: eventosInscritos || undefined,
    },
  ];

  if (cargando) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-full max-w-md rounded-full" />
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-3">
            <Skeleton className="h-6 w-52" />
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-2xl" />
              ))}
            </div>
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Tabs
        items={tabs}
        value={vista}
        onChange={(id) => setVista(id as VistaEstudiante)}
        label="Secciones de Desarrollo humano"
        className="mb-5"
      />

      {vista === "agendar" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <section>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
                <Icon nombre="corazon" className="h-5 w-5 text-uni-mandarina" />
                Servicios de Desarrollo humano
              </h2>
              <span className="text-xs text-slate-400">{servicios.length} servicios</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {servicios.map((item) => {
                const activo = item.id === servicioId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => {
                      setServicioId(item.id);
                      setHorarioId("");
                    }}
                    className={`group rounded-2xl border p-4 text-left transition-all duration-300 ${
                      activo
                        ? "border-uni-cian/50 bg-uni-cian/[0.08] shadow-lg shadow-uni-cian/5"
                        : "border-white/10 bg-white/[0.04] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07]"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        activo
                          ? "bg-uni-cian text-uni-noche"
                          : "bg-white/10 text-uni-cian group-hover:bg-white/15"
                      }`}
                    >
                      <Icon nombre={iconoServicio(item.nombre)} className="h-5 w-5" />
                    </span>
                    <p className="mt-3 font-semibold text-white">{item.nombre}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-400">
                      {item.descripcion}
                    </p>
                    {activo ? (
                      <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-uni-cian">
                        <Icon nombre="check" className="h-3.5 w-3.5" />
                        Seleccionado
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {servicios.length === 0 ? (
              <EmptyState
                title="No hay servicios disponibles"
                description="Cuando Bienestar publique servicios de acompañamiento aparecerán aquí."
                icono="corazon"
              />
            ) : null}
          </section>

          <form
            onSubmit={(event) => void onAgendar(event)}
            className="self-start rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
                <Icon nombre="calendario" className="h-5 w-5 text-uni-cian" />
                Agendar cita
              </h2>
              <Badge tone="info">{servicio?.nombre ?? "Elige un servicio"}</Badge>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Elige un día habilitado y luego un horario disponible.
            </p>

            <div className="mt-4">
              <CalendarioMes
                valor={fecha}
                diasHabiles={diasHabiles}
                onChange={(siguiente) => {
                  setFecha(siguiente);
                  setHorarioId("");
                }}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">Horarios disponibles</p>
              <span className="text-xs text-slate-400">
                {cuposDisponibles.length} opción{cuposDisponibles.length === 1 ? "" : "es"}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {cuposDisponibles.map((horario) => {
                const activo = horarioId === horario.id;
                return (
                  <button
                    key={horario.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setHorarioId(horario.id)}
                    className={`rounded-xl border px-3 py-3 text-left text-sm transition-all duration-200 ${
                      activo
                        ? "border-uni-cian bg-uni-cian/15 text-white shadow-lg shadow-uni-cian/10"
                        : "border-white/10 bg-uni-noche/40 text-slate-200 hover:border-uni-cian/40 hover:bg-white/[0.06]"
                    }`}
                  >
                    <p className="inline-flex items-center gap-1.5 font-semibold">
                      <Icon nombre="reloj" className="h-4 w-4 text-uni-cian" />
                      {horaCorta(horario.hora_inicio)} – {horaCorta(horario.hora_fin)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {horario.profesional ?? "Profesional de Bienestar"} ·{" "}
                      {horario.cupo_disponible ?? horario.cupo} cupo(s)
                    </p>
                  </button>
                );
              })}
            </div>

            {cuposDisponibles.length === 0 ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-uni-amarillo/10 px-3 py-2 text-xs text-amber-100">
                <Icon nombre="info" className="h-3.5 w-3.5 shrink-0 text-uni-amarillo" />
                No hay cupos libres en esa fecha. Elige otro día marcado en azul.
              </p>
            ) : null}

            <Button
              type="submit"
              className="mt-5 w-full"
              loading={enviando}
              disabled={!horarioId}
            >
              <Icon nombre="check" className="h-4 w-4" />
              Confirmar cita
            </Button>
          </form>
        </div>
      ) : null}

      {vista === "citas" ? (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
              <Icon nombre="reloj" className="h-5 w-5 text-uni-cian" />
              Mis citas
            </h2>
            <span className="text-xs text-slate-400">
              {citas.length} cita{citas.length === 1 ? "" : "s"}
            </span>
          </div>
          {citas.length === 0 ? (
            <EmptyState
              title="Aún no tienes citas"
              description="Agenda una cita con Bienestar desde la pestaña «Servicios y agendar»."
              icono="calendario"
              action={
                <Button onClick={() => setVista("agendar")}>
                  <Icon nombre="calendario" className="h-4 w-4" />
                  Agendar una cita
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {citas.map((cita) => {
                const estado = ESTADO_CITA[cita.estado];
                return (
                  <article
                    key={cita.id}
                    className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-white/20"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-white">
                        {cita.servicio?.nombre ?? "Servicio"}
                      </p>
                      <Badge tone={estado.tono}>{estado.texto}</Badge>
                    </div>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-300">
                      <Icon nombre="calendario" className="h-4 w-4 text-uni-cian" />
                      {formatearFecha(cita.fecha_hora)}
                    </p>
                    {cita.horario?.profesional ? (
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <Icon nombre="perfil" className="h-3.5 w-3.5" />
                        {cita.horario.profesional}
                      </p>
                    ) : null}
                    {cita.motivo_cancelacion ? (
                      <p className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                        Motivo: {cita.motivo_cancelacion}
                      </p>
                    ) : null}
                    {cita.estado === "AGENDADA" ? (
                      <Button
                        variant="secondary"
                        className="mt-3 self-start"
                        loading={enviandoId === cita.id}
                        onClick={() =>
                          setPorCancelar({
                            tipo: "cita",
                            id: cita.id,
                            texto: `¿Deseas cancelar tu cita de ${cita.servicio?.nombre ?? "este servicio"}?`,
                          })
                        }
                      >
                        Cancelar cita
                      </Button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {vista === "eventos" ? (
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
              <Icon nombre="eventos" className="h-5 w-5 text-uni-cian" />
              Eventos de Bienestar
            </h2>
            <span className="text-xs text-slate-400">
              {eventosInscritos} inscrito{eventosInscritos === 1 ? "" : "s"}
            </span>
          </div>
          {eventos.length === 0 ? (
            <EmptyState
              title="No hay eventos publicados"
              description="Los talleres y jornadas de Bienestar aparecerán en esta sección."
              icono="eventos"
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {eventos.map((evento) => {
                const limite = evento.fecha_limite_inscripcion ?? evento.fecha_inicio;
                const vencido = new Date(limite).getTime() < Date.now();
                const ocupados = Math.max(0, evento.cupo_total - evento.cupo_disponible);
                return (
                  <article
                    key={evento.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:border-uni-cian/30 hover:shadow-xl hover:shadow-black/20"
                  >
                    <div className="relative h-24 overflow-hidden bg-gradient-to-br from-uni-azul/70 via-uni-marino to-uni-noche">
                      <span
                        aria-hidden="true"
                        className="absolute -right-5 -top-6 h-24 w-24 rounded-full bg-uni-cian/25 blur-2xl"
                      />
                      <span className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-uni-noche/60 text-uni-amarillo ring-1 ring-white/20 backdrop-blur">
                        <Icon nombre="chispa" className="h-5 w-5" />
                      </span>
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
                        <h3 className="min-w-0 truncate text-sm font-bold text-white">
                          {evento.titulo}
                        </h3>
                        {evento.inscrito ? <Badge tone="success">Inscrito</Badge> : null}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <p className="line-clamp-2 text-sm text-slate-300">
                        {evento.descripcion}
                      </p>
                      <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <Icon nombre="calendario" className="h-3.5 w-3.5 text-uni-cian" />
                        {formatearFecha(evento.fecha_inicio)}
                      </p>
                      {evento.fecha_limite_inscripcion ? (
                        <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                          <Icon nombre="reloj" className="h-3.5 w-3.5 text-uni-cian" />
                          Inscripciones hasta {formatearFecha(evento.fecha_limite_inscripcion)}
                        </p>
                      ) : null}
                      <ProgressBar
                        value={ocupados}
                        max={Math.max(1, evento.cupo_total)}
                        label={`Cupos ${evento.cupo_disponible}/${evento.cupo_total}`}
                        tone={
                          evento.cupo_disponible <= 0
                            ? "danger"
                            : evento.cupo_disponible <= 3
                              ? "warning"
                              : "success"
                        }
                      />
                      {evento.inscrito ? (
                        <Button
                          variant="secondary"
                          className="mt-auto self-start"
                          loading={enviandoId === evento.id}
                          onClick={() =>
                            setPorCancelar({
                              tipo: "evento",
                              id: evento.id,
                              texto: `¿Deseas cancelar tu inscripción a ${evento.titulo}?`,
                            })
                          }
                        >
                          Cancelar inscripción
                        </Button>
                      ) : (
                        <Button
                          className="mt-auto self-start"
                          loading={enviandoId === evento.id}
                          disabled={evento.cupo_disponible <= 0 || vencido}
                          onClick={() =>
                            void cancelarInscripcionAEvento(evento.id, evento.titulo)
                          }
                        >
                          {evento.cupo_disponible <= 0
                            ? "Sin cupo"
                            : vencido
                              ? "Inscripción cerrada"
                              : "Inscribirme"}
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      <ConfirmDialog
        open={Boolean(porCancelar)}
        message={porCancelar?.texto ?? ""}
        confirmLabel="Sí, cancelar"
        onCancel={() => setPorCancelar(null)}
        onConfirm={() => void ejecutarCancelacion()}
      />
    </div>
  );
}
