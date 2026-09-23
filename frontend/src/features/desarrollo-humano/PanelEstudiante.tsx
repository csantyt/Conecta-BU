import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  agendarCita,
  cancelarCita,
  cancelarInscripcion,
  inscribirseEvento,
  obtenerHorariosDisponibles,
} from "../../api/desarrolloHumano";
import type { Cita, EventoDH, Horario, Servicio } from "../../types/desarrolloHumano";
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
  onAviso: (valor: string) => void;
  onError: (valor: string) => void;
  onRecargar: () => Promise<void>;
};

type VistaEstudiante = "agendar" | "citas" | "eventos";

export default function PanelEstudiante({
  servicios,
  citas,
  eventos,
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

  const servicio = servicios.find((item) => item.id === servicioId);
  const diasHabiles = useMemo(
    () =>
      Array.from(
        new Set((servicio?.horarios ?? []).filter((h) => h.activo).map((h) => h.dia_semana)),
      ),
    [servicio],
  );

  useEffect(() => {
    if (!servicioId && servicios[0]) {
      setServicioId(servicios[0].id);
    }
  }, [servicios, servicioId]);

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

  return (
    <div>
      <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["agendar", "Servicios y agendar"],
            ["citas", "Mis citas"],
            ["eventos", "Eventos"],
          ] as const
        ).map(([id, etiqueta]) => (
          <button
            key={id}
            type="button"
            onClick={() => setVista(id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm ${
              vista === id ? "bg-white text-slate-900" : "border border-white/15 text-slate-300"
            }`}
          >
            {etiqueta}
          </button>
        ))}
      </nav>

      {vista === "agendar" ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <section>
            <h2 className="mb-3 text-lg font-semibold">Servicios de Desarrollo humano</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {servicios.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setServicioId(item.id);
                    setHorarioId("");
                  }}
                  className={`rounded-2xl border p-4 text-left ${
                    item.id === servicioId
                      ? "border-sky-400 bg-white text-slate-900"
                      : "border-white/10 bg-white/90 text-slate-900"
                  }`}
                >
                  <p className="font-semibold">{item.nombre}</p>
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {item.descripcion}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <form
            onSubmit={(event) => void onAgendar(event)}
            className="rounded-2xl border border-white/10 bg-white p-4 text-slate-900 sm:p-6"
          >
            <h2 className="text-lg font-semibold">Agendar cita</h2>
            <p className="mt-1 text-sm text-slate-500">
              {servicio?.nombre ?? "Elige un servicio"}
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
            <p className="mt-4 text-sm font-medium">Horarios disponibles</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {cupos
                .filter((horario) => {
                  const instante = new Date(
                    `${fecha}T${horaCorta(horario.hora_inicio)}:00`,
                  );
                  return instante.getTime() > Date.now();
                })
                .map((horario) => (
                <button
                  key={horario.id}
                  type="button"
                  onClick={() => setHorarioId(horario.id)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm ${
                    horarioId === horario.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <p className="font-medium">
                    {horaCorta(horario.hora_inicio)} – {horaCorta(horario.hora_fin)}
                  </p>
                  <p className="mt-1 text-xs opacity-80">
                    {horario.profesional ?? "Profesional de Bienestar"} ·{" "}
                    {horario.cupo_disponible ?? horario.cupo} cupo(s)
                  </p>
                </button>
              ))}
            </div>
            {cupos.filter((horario) => {
              const instante = new Date(
                `${fecha}T${horaCorta(horario.hora_inicio)}:00`,
              );
              return instante.getTime() > Date.now();
            }).length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                No hay cupos libres en esa fecha. Elige otro día marcado en azul.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!horarioId || enviando}
              className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Confirmar cita
            </button>
          </form>
        </div>
      ) : null}

      {vista === "citas" ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Mis citas</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {citas.map((cita) => (
              <article
                key={cita.id}
                className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900"
              >
                <p className="font-semibold">{cita.servicio?.nombre ?? "Servicio"}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {formatearFecha(cita.fecha_hora)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  {cita.estado}
                </p>
                {cita.estado === "AGENDADA" ? (
                  <button
                    type="button"
                    className="mt-3 rounded-lg border px-3 py-1.5 text-xs"
                    onClick={() =>
                      void cancelarCita(cita.id)
                        .then(() => {
                          onAviso("Cita cancelada.");
                          return onRecargar();
                        })
                        .catch((err) => onError(mensajeError(err)))
                    }
                  >
                    Cancelar
                  </button>
                ) : null}
              </article>
            ))}
          </div>
          {citas.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no tienes citas.</p>
          ) : null}
        </section>
      ) : null}

      {vista === "eventos" ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {eventos.map((evento) => {
            const limite = evento.fecha_limite_inscripcion ?? evento.fecha_inicio;
            const vencido = new Date(limite).getTime() < Date.now();
            return (
              <article
                key={evento.id}
                className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900"
              >
                <h3 className="font-semibold">{evento.titulo}</h3>
                <p className="mt-1 text-sm text-slate-600">{evento.descripcion}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {formatearFecha(evento.fecha_inicio)} · {evento.cupo_disponible}/
                  {evento.cupo_total} cupos
                </p>
                {evento.inscrito ? (
                  <button
                    type="button"
                    className="mt-3 rounded-lg border px-3 py-1.5 text-xs"
                    onClick={() =>
                      void cancelarInscripcion(evento.id)
                        .then(() => {
                          onAviso("Inscripción cancelada.");
                          return onRecargar();
                        })
                        .catch((err) => onError(mensajeError(err)))
                    }
                  >
                    Cancelar inscripción
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={evento.cupo_disponible <= 0 || vencido}
                    className="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                    onClick={() =>
                      void inscribirseEvento(evento.id)
                        .then(() => {
                          onAviso("Inscripción confirmada.");
                          return onRecargar();
                        })
                        .catch((err) => onError(mensajeError(err)))
                    }
                  >
                    Inscribirme
                  </button>
                )}
              </article>
            );
          })}
          {eventos.length === 0 ? (
            <p className="text-sm text-slate-400">No hay eventos publicados.</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
