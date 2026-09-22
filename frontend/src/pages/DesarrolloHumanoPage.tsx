import axios from "axios";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  agendarCita,
  cancelarCita,
  cancelarInscripcion,
  crearEvento,
  crearHorario,
  deshabilitarHorario,
  inscribirseEvento,
  obtenerCitas,
  obtenerEventos,
  obtenerHorarios,
  obtenerHorariosDisponibles,
  obtenerServicios,
  registrarAsistencia,
} from "../api/desarrolloHumano";
import type { Usuario } from "../types/auth";
import type { Cita, EventoDH, Horario, Servicio } from "../types/desarrolloHumano";

type DesarrolloHumanoPageProps = {
  usuario: Usuario;
  onVolver: () => void;
};

type Vista = "citas" | "eventos" | "admin";

const DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") {
      return message;
    }
  }
  return "No se pudo completar la acción.";
}

function formatearFecha(valor: string): string {
  return new Date(valor).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}

export default function DesarrolloHumanoPage({
  usuario,
  onVolver,
}: DesarrolloHumanoPageProps) {
  const esAdmin = usuario.rol === "ADMINISTRADOR";
  const [vista, setVista] = useState<Vista>("citas");
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [eventos, setEventos] = useState<EventoDH[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  const [servicioId, setServicioId] = useState("");
  const [horarioId, setHorarioId] = useState("");
  const [fecha, setFecha] = useState("");
  const [horariosDisponibles, setHorariosDisponibles] = useState<Horario[]>([]);

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
      if (!servicioId && listaServicios[0]) {
        setServicioId(listaServicios[0].id);
      }
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void recargar();
  }, []);

  useEffect(() => {
    if (!fecha || !servicioId) {
      setHorariosDisponibles([]);
      return;
    }
    void obtenerHorariosDisponibles({ fecha, servicio_id: servicioId })
      .then((lista) => {
        setHorariosDisponibles(lista);
        setHorarioId((actual) =>
          lista.some((item) => item.id === actual) ? actual : "",
        );
      })
      .catch((err) => setError(mensajeError(err)));
  }, [fecha, servicioId]);

  const horariosDelServicio = useMemo(() => {
    if (fecha) {
      return horariosDisponibles;
    }
    const servicio = servicios.find((item) => item.id === servicioId);
    return servicio?.horarios ?? [];
  }, [fecha, horariosDisponibles, servicios, servicioId]);

  async function onAgendar(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setAviso(null);
    try {
      await agendarCita({
        servicio_id: servicioId,
        horario_id: horarioId,
        fecha,
      });
      setAviso("Cita agendada correctamente.");
      await recargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  }

  async function onCancelarCita(id: string) {
    setError(null);
    try {
      await cancelarCita(id);
      setAviso("Cita cancelada.");
      await recargar();
    } catch (err) {
      setError(mensajeError(err));
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <button
        type="button"
        onClick={onVolver}
        className="mb-6 text-sm text-slate-300 transition hover:text-white"
      >
        ← Volver a módulos
      </button>

      <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-sm font-medium text-sky-300">Módulo activo</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Desarrollo humano y orientación
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Agenda citas de orientación, consulta horarios y participa en eventos
          con cupo limitado.
        </p>
      </section>

      <div className="mb-6 flex flex-wrap gap-2">
        <TabButton activa={vista === "citas"} onClick={() => setVista("citas")}>
          Citas
        </TabButton>
        <TabButton
          activa={vista === "eventos"}
          onClick={() => setVista("eventos")}
        >
          Eventos
        </TabButton>
        {esAdmin ? (
          <TabButton
            activa={vista === "admin"}
            onClick={() => setVista("admin")}
          >
            Administración
          </TabButton>
        ) : null}
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {aviso ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {aviso}
        </p>
      ) : null}

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando información...</p>
      ) : null}

      {vista === "citas" ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={(event) => void onAgendar(event)}
            className="rounded-2xl border border-white/10 bg-white p-6 text-slate-900"
          >
            <h2 className="text-lg font-semibold">Agendar cita</h2>
            <label className="mt-4 block text-sm font-medium">Servicio</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={servicioId}
              onChange={(event) => {
                setServicioId(event.target.value);
                setHorarioId("");
              }}
              required
            >
              {servicios.map((servicio) => (
                <option key={servicio.id} value={servicio.id}>
                  {servicio.nombre}
                </option>
              ))}
            </select>

            <label className="mt-4 block text-sm font-medium">Fecha</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={fecha}
              onChange={(event) => setFecha(event.target.value)}
              required
            />

            <label className="mt-4 block text-sm font-medium">Horario</label>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={horarioId}
              onChange={(event) => setHorarioId(event.target.value)}
              required
            >
              <option value="">Selecciona un horario</option>
              {horariosDelServicio.map((horario) => (
                <option key={horario.id} value={horario.id}>
                  {etiquetaHorario(horario)}
                </option>
              ))}
            </select>
            {horariosDelServicio.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                {fecha
                  ? "No hay cupos libres en esa fecha."
                  : "Aún no hay horarios. Un administrador debe crearlos."}
              </p>
            ) : null}

            <button
              type="submit"
              className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
            >
              Agendar
            </button>
          </form>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              {esAdmin ? "Todas las citas" : "Mis citas"}
            </h2>
            {citas.length === 0 ? (
              <p className="text-sm text-slate-400">No hay citas registradas.</p>
            ) : (
              citas.map((cita) => (
                <article
                  key={cita.id}
                  className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900"
                >
                  <p className="font-semibold">
                    {cita.servicio?.nombre ?? "Servicio"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatearFecha(cita.fecha_hora)}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                    {cita.estado}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {cita.estado === "AGENDADA" ? (
                      <button
                        type="button"
                        onClick={() => void onCancelarCita(cita.id)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs"
                      >
                        Cancelar
                      </button>
                    ) : null}
                    {esAdmin && cita.estado === "AGENDADA" ? (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            void registrarAsistencia(cita.id, "ASISTIO").then(
                              recargar,
                            )
                          }
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs text-white"
                        >
                          Asistió
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void registrarAsistencia(cita.id, "NO_ASISTIO").then(
                              recargar,
                            )
                          }
                          className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-white"
                        >
                          No asistió
                        </button>
                      </>
                    ) : null}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {vista === "eventos" ? (
        <EventosVista
          eventos={eventos}
          esAdmin={esAdmin}
          onError={setError}
          onAviso={setAviso}
          onRecargar={() => void recargar()}
        />
      ) : null}

      {vista === "admin" && esAdmin ? (
        <AdminVista
          servicios={servicios}
          onError={setError}
          onAviso={setAviso}
          onRecargar={() => void recargar()}
        />
      ) : null}
    </main>
  );
}

function etiquetaHorario(horario: Horario): string {
  const profesional = horario.profesional ? ` · ${horario.profesional}` : "";
  const cupo =
    horario.cupo_disponible !== undefined
      ? ` · ${horario.cupo_disponible} cupo(s)`
      : "";
  return `${DIAS[horario.dia_semana]} ${horaCorta(horario.hora_inicio)}-${horaCorta(horario.hora_fin)}${profesional}${cupo}`;
}

function TabButton({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm ${
        activa
          ? "bg-white text-slate-900"
          : "border border-white/15 text-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

function EventosVista({
  eventos,
  esAdmin,
  onError,
  onAviso,
  onRecargar,
}: {
  eventos: EventoDH[];
  esAdmin: boolean;
  onError: (valor: string) => void;
  onAviso: (valor: string) => void;
  onRecargar: () => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [cupo, setCupo] = useState(20);

  async function onCrear(event: FormEvent) {
    event.preventDefault();
    try {
      await crearEvento({
        titulo,
        descripcion,
        fecha_inicio: new Date(fechaInicio).toISOString(),
        cupo_total: cupo,
      });
      onAviso("Evento creado.");
      setTitulo("");
      setDescripcion("");
      onRecargar();
    } catch (err) {
      onError(mensajeError(err));
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        {eventos.map((evento) => (
          <article
            key={evento.id}
            className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900"
          >
            <h2 className="font-semibold">{evento.titulo}</h2>
            <p className="mt-1 text-sm text-slate-600">{evento.descripcion}</p>
            <p className="mt-2 text-xs text-slate-500">
              {formatearFecha(evento.fecha_inicio)} · Cupos {evento.cupo_disponible}/
              {evento.cupo_total}
            </p>
            {evento.inscrito ? (
              <button
                type="button"
                className="mt-3 rounded-lg border px-3 py-1.5 text-xs"
                onClick={() =>
                  void cancelarInscripcion(evento.id)
                    .then(() => {
                      onAviso("Inscripción cancelada.");
                      onRecargar();
                    })
                    .catch((err) => onError(mensajeError(err)))
                }
              >
                Cancelar inscripción
              </button>
            ) : (
              <button
                type="button"
                className="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white"
                onClick={() =>
                  void inscribirseEvento(evento.id)
                    .then(() => {
                      onAviso("Inscripción confirmada.");
                      onRecargar();
                    })
                    .catch((err) => onError(mensajeError(err)))
                }
              >
                Inscribirme
              </button>
            )}
          </article>
        ))}
        {eventos.length === 0 ? (
          <p className="text-sm text-slate-400">No hay eventos publicados.</p>
        ) : null}
      </div>

      {esAdmin ? (
        <form
          onSubmit={(event) => void onCrear(event)}
          className="rounded-2xl border border-white/10 bg-white p-6 text-slate-900"
        >
          <h2 className="text-lg font-semibold">Publicar evento</h2>
          <input
            className="mt-4 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="Título"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            required
          />
          <textarea
            className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="Descripción"
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
          />
          <input
            type="datetime-local"
            className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
            value={fechaInicio}
            onChange={(event) => setFechaInicio(event.target.value)}
            required
          />
          <input
            type="number"
            min={1}
            className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
            value={cupo}
            onChange={(event) => setCupo(Number(event.target.value))}
            required
          />
          <button
            type="submit"
            className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-sm text-white"
          >
            Crear evento
          </button>
        </form>
      ) : null}
    </section>
  );
}

function AdminVista({
  servicios,
  onError,
  onAviso,
  onRecargar,
}: {
  servicios: Servicio[];
  onError: (valor: string) => void;
  onAviso: (valor: string) => void;
  onRecargar: () => void;
}) {
  const [servicioId, setServicioId] = useState(servicios[0]?.id ?? "");
  const [profesional, setProfesional] = useState("");
  const [dia, setDia] = useState(1);
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("09:00");
  const [cupo, setCupo] = useState(1);
  const [horarios, setHorarios] = useState<Horario[]>([]);

  useEffect(() => {
    void obtenerHorarios()
      .then(setHorarios)
      .catch((err) => onError(mensajeError(err)));
  }, [onError, servicios]);

  async function onCrearHorario(event: FormEvent) {
    event.preventDefault();
    try {
      await crearHorario({
        servicio_id: servicioId,
        profesional: profesional || undefined,
        dia_semana: dia,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        cupo,
      });
      onAviso("Horario creado.");
      const lista = await obtenerHorarios();
      setHorarios(lista);
      onRecargar();
    } catch (err) {
      onError(mensajeError(err));
    }
  }

  async function onDeshabilitar(id: string) {
    try {
      await deshabilitarHorario(id);
      onAviso("Horario deshabilitado.");
      setHorarios(await obtenerHorarios());
      onRecargar();
    } catch (err) {
      onError(mensajeError(err));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
    <form
      onSubmit={(event) => void onCrearHorario(event)}
      className="rounded-2xl border border-white/10 bg-white p-6 text-slate-900"
    >
      <h2 className="text-lg font-semibold">Crear horario de atención</h2>
      <select
        className="mt-4 w-full rounded-xl border px-3 py-2 text-sm"
        value={servicioId}
        onChange={(event) => setServicioId(event.target.value)}
      >
        {servicios.map((servicio) => (
          <option key={servicio.id} value={servicio.id}>
            {servicio.nombre}
          </option>
        ))}
      </select>
      <input
        className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
        placeholder="Profesional (opcional)"
        value={profesional}
        onChange={(event) => setProfesional(event.target.value)}
      />
      <select
        className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
        value={dia}
        onChange={(event) => setDia(Number(event.target.value))}
      >
        {DIAS.map((nombre, indice) => (
          <option key={nombre} value={indice}>
            {nombre}
          </option>
        ))}
      </select>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <input
          type="time"
          className="rounded-xl border px-3 py-2 text-sm"
          value={horaInicio}
          onChange={(event) => setHoraInicio(event.target.value)}
        />
        <input
          type="time"
          className="rounded-xl border px-3 py-2 text-sm"
          value={horaFin}
          onChange={(event) => setHoraFin(event.target.value)}
        />
      </div>
      <input
        type="number"
        min={1}
        className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
        value={cupo}
        onChange={(event) => setCupo(Number(event.target.value))}
      />
      <button
        type="submit"
        className="mt-4 w-full rounded-xl bg-slate-900 py-2.5 text-sm text-white"
      >
        Guardar horario
      </button>
    </form>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Horarios registrados</h2>
        {horarios.length === 0 ? (
          <p className="text-sm text-slate-400">No hay horarios creados.</p>
        ) : (
          horarios.map((horario) => {
            const servicio = servicios.find((item) => item.id === horario.servicio_id);
            return (
              <article
                key={horario.id}
                className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900"
              >
                <p className="font-semibold">{servicio?.nombre ?? "Servicio"}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {etiquetaHorario(horario)}
                </p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">
                  {horario.activo ? "Activo" : "Deshabilitado"}
                </p>
                {horario.activo ? (
                  <button
                    type="button"
                    className="mt-3 rounded-lg border px-3 py-1.5 text-xs"
                    onClick={() => void onDeshabilitar(horario.id)}
                  >
                    Deshabilitar
                  </button>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
