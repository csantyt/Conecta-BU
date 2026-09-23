import { useEffect, useMemo, useState, type FormEvent } from "react";
import { listarUsuarios } from "../../api/auth";
import {
  actualizarEvento,
  actualizarHorario,
  crearEvento,
  crearHorario,
  deshabilitarHorario,
  eliminarEvento,
  obtenerHorarios,
  obtenerInscripcionesEvento,
  registrarAsistencia,
  registrarAsistenciaEvento,
} from "../../api/desarrolloHumano";
import type { Usuario } from "../../types/auth";
import type {
  Cita,
  EventoDH,
  Horario,
  InscripcionEvento,
  Servicio,
} from "../../types/desarrolloHumano";
import {
  DIAS,
  esMismaFecha,
  fechaLocal,
  formatearFecha,
  horaCorta,
  mensajeError,
  etiquetaHorario,
} from "./utils";

type PanelAdministradorProps = {
  servicios: Servicio[];
  citas: Cita[];
  eventos: EventoDH[];
  onAviso: (valor: string) => void;
  onError: (valor: string) => void;
  onRecargar: () => Promise<void>;
};

type VistaAdmin = "horarios" | "hoy" | "eventos";

export default function PanelAdministrador({
  servicios,
  citas,
  eventos,
  onAviso,
  onError,
  onRecargar,
}: PanelAdministradorProps) {
  const [vista, setVista] = useState<VistaAdmin>("horarios");

  return (
    <div>
      <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["horarios", "Horarios"],
            ["hoy", "Citas del día"],
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
      {vista === "horarios" ? (
        <GestionHorarios
          servicios={servicios}
          onAviso={onAviso}
          onError={onError}
          onRecargar={onRecargar}
        />
      ) : null}
      {vista === "hoy" ? (
        <CitasDelDia citas={citas} onAviso={onAviso} onError={onError} onRecargar={onRecargar} />
      ) : null}
      {vista === "eventos" ? (
        <GestionEventos
          eventos={eventos}
          onAviso={onAviso}
          onError={onError}
          onRecargar={onRecargar}
        />
      ) : null}
    </div>
  );
}

function GestionHorarios({
  servicios,
  onAviso,
  onError,
  onRecargar,
}: {
  servicios: Servicio[];
  onAviso: (valor: string) => void;
  onError: (valor: string) => void;
  onRecargar: () => Promise<void>;
}) {
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [servicioId, setServicioId] = useState(servicios[0]?.id ?? "");
  const [profesional, setProfesional] = useState("");
  const [dia, setDia] = useState(1);
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("09:00");
  const [cupo, setCupo] = useState(1);

  async function recargarHorarios() {
    setHorarios(await obtenerHorarios());
  }

  useEffect(() => {
    void recargarHorarios().catch((err) => onError(mensajeError(err)));
  }, [onError]);

  function limpiar() {
    setEditandoId(null);
    setProfesional("");
    setDia(1);
    setHoraInicio("08:00");
    setHoraFin("09:00");
    setCupo(1);
  }

  async function onGuardar(event: FormEvent) {
    event.preventDefault();
    try {
      const payload = {
        servicio_id: servicioId,
        dia_semana: dia,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        cupo,
        ...(profesional.trim() ? { profesional: profesional.trim() } : {}),
      };
      if (editandoId) {
        await actualizarHorario(editandoId, payload);
        onAviso("Horario actualizado.");
      } else {
        await crearHorario(payload);
        onAviso("Horario creado.");
      }
      limpiar();
      await recargarHorarios();
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={(event) => void onGuardar(event)}
        className="rounded-2xl border border-white/10 bg-white p-4 text-slate-900 sm:p-6"
      >
        <h2 className="text-lg font-semibold">
          {editandoId ? "Editar horario" : "Crear horario"}
        </h2>
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
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-slate-900 py-2.5 text-sm text-white"
          >
            {editandoId ? "Guardar cambios" : "Crear horario"}
          </button>
          {editandoId ? (
            <button
              type="button"
              className="rounded-xl border px-4 text-sm"
              onClick={limpiar}
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Horarios registrados</h2>
        {horarios.map((horario) => {
          const servicio = servicios.find((item) => item.id === horario.servicio_id);
          return (
            <article
              key={horario.id}
              className="rounded-2xl border border-white/10 bg-white p-4 text-slate-900 sm:p-5"
            >
              <p className="font-semibold">{servicio?.nombre ?? "Servicio"}</p>
              <p className="mt-1 text-sm text-slate-600">{etiquetaHorario(horario)}</p>
              <p className="mt-1 text-xs uppercase text-slate-500">
                {horario.activo ? "Activo" : "Deshabilitado"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1.5 text-xs"
                  onClick={() => {
                    setEditandoId(horario.id);
                    setServicioId(horario.servicio_id);
                    setProfesional(horario.profesional ?? "");
                    setDia(horario.dia_semana);
                    setHoraInicio(horaCorta(horario.hora_inicio));
                    setHoraFin(horaCorta(horario.hora_fin));
                    setCupo(horario.cupo);
                  }}
                >
                  Editar
                </button>
                {horario.activo ? (
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1.5 text-xs"
                    onClick={() =>
                      void deshabilitarHorario(horario.id)
                        .then(async () => {
                          onAviso("Horario deshabilitado.");
                          await recargarHorarios();
                          await onRecargar();
                        })
                        .catch((err) => onError(mensajeError(err)))
                    }
                  >
                    Deshabilitar
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
        {horarios.length === 0 ? (
          <p className="text-sm text-slate-400">No hay horarios creados.</p>
        ) : null}
      </div>
    </div>
  );
}

function CitasDelDia({
  citas,
  onAviso,
  onError,
  onRecargar,
}: {
  citas: Cita[];
  onAviso: (valor: string) => void;
  onError: (valor: string) => void;
  onRecargar: () => Promise<void>;
}) {
  const [dia, setDia] = useState(fechaLocal(new Date()));
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const delDia = useMemo(
    () => citas.filter((cita) => esMismaFecha(cita.fecha_hora, dia)),
    [citas, dia],
  );

  useEffect(() => {
    void listarUsuarios()
      .then(setUsuarios)
      .catch(() => setUsuarios([]));
  }, []);

  function nombreDe(usuarioId: string): string {
    const persona = usuarios.find((item) => item.id === usuarioId);
    return persona?.nombre_completo || persona?.email || usuarioId.slice(0, 8);
  }

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="text-lg font-semibold">Citas del día</h2>
        <label className="text-sm">
          Fecha
          <input
            type="date"
            className="mt-1 block rounded-xl border border-white/20 bg-white px-3 py-2 text-slate-900"
            value={dia}
            onChange={(event) => setDia(event.target.value)}
          />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {delDia.map((cita) => (
          <article
            key={cita.id}
            className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900"
          >
            <p className="font-semibold">{cita.servicio?.nombre ?? "Servicio"}</p>
            <p className="mt-1 text-sm text-slate-600">{nombreDe(cita.usuario_id)}</p>
            <p className="mt-1 text-sm text-slate-600">{formatearFecha(cita.fecha_hora)}</p>
            <p className="mt-1 text-xs uppercase text-slate-500">{cita.estado}</p>
            {cita.estado === "AGENDADA" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs text-white"
                  onClick={() =>
                    void registrarAsistencia(cita.id, "ASISTIO")
                      .then(() => {
                        onAviso("Asistencia registrada.");
                        return onRecargar();
                      })
                      .catch((err) => onError(mensajeError(err)))
                  }
                >
                  Asistió
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs text-white"
                  onClick={() =>
                    void registrarAsistencia(cita.id, "NO_ASISTIO")
                      .then(() => {
                        onAviso("Inasistencia registrada.");
                        return onRecargar();
                      })
                      .catch((err) => onError(mensajeError(err)))
                  }
                >
                  No asistió
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {delDia.length === 0 ? (
        <p className="text-sm text-slate-400">No hay citas para esta fecha.</p>
      ) : null}
    </section>
  );
}

function GestionEventos({
  eventos,
  onAviso,
  onError,
  onRecargar,
}: {
  eventos: EventoDH[];
  onAviso: (valor: string) => void;
  onError: (valor: string) => void;
  onRecargar: () => Promise<void>;
}) {
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [cupo, setCupo] = useState(20);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [inscritos, setInscritos] = useState<Record<string, InscripcionEvento[]>>(
    {},
  );

  useEffect(() => {
    void listarUsuarios()
      .then(setUsuarios)
      .catch(() => setUsuarios([]));
  }, []);

  function nombreDe(usuarioId: string): string {
    const persona = usuarios.find((item) => item.id === usuarioId);
    return persona?.nombre_completo || persona?.email || usuarioId.slice(0, 8);
  }

  async function onGuardar(event: FormEvent) {
    event.preventDefault();
    try {
      const payload = {
        titulo,
        fecha_inicio: new Date(fechaInicio).toISOString(),
        cupo_total: cupo,
        ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
        ...(fechaLimite
          ? { fecha_limite_inscripcion: new Date(fechaLimite).toISOString() }
          : {}),
      };
      if (editandoId) {
        await actualizarEvento(editandoId, payload);
        onAviso("Evento actualizado.");
        setEditandoId(null);
      } else {
        await crearEvento(payload);
        onAviso("Evento creado.");
      }
      setTitulo("");
      setDescripcion("");
      setFechaLimite("");
      await onRecargar();
    } catch (err) {
      onError(mensajeError(err));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={(event) => void onGuardar(event)}
        className="rounded-2xl border border-white/10 bg-white p-4 text-slate-900 sm:p-6"
      >
        <h2 className="text-lg font-semibold">
          {editandoId ? "Editar evento" : "Crear evento"}
        </h2>
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
        <label className="mt-3 block text-xs text-slate-500">Inicio</label>
        <input
          type="datetime-local"
          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          value={fechaInicio}
          onChange={(event) => setFechaInicio(event.target.value)}
          required
        />
        <label className="mt-3 block text-xs text-slate-500">
          Fecha límite de inscripción
        </label>
        <input
          type="datetime-local"
          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          value={fechaLimite}
          onChange={(event) => setFechaLimite(event.target.value)}
        />
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
          {editandoId ? "Guardar cambios" : "Publicar evento"}
        </button>
      </form>

      <div className="space-y-3">
        {eventos.map((evento) => (
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
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-xs"
                onClick={() => {
                  setEditandoId(evento.id);
                  setTitulo(evento.titulo);
                  setDescripcion(evento.descripcion ?? "");
                  setCupo(evento.cupo_total);
                }}
              >
                Editar
              </button>
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-xs"
                onClick={() =>
                  void obtenerInscripcionesEvento(evento.id)
                    .then((lista) =>
                      setInscritos((actual) => ({ ...actual, [evento.id]: lista })),
                    )
                    .catch((err) => onError(mensajeError(err)))
                }
              >
                Ver inscritos
              </button>
              <button
                type="button"
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700"
                onClick={() =>
                  void eliminarEvento(evento.id)
                    .then(() => {
                      onAviso("Evento eliminado.");
                      return onRecargar();
                    })
                    .catch((err) => onError(mensajeError(err)))
                }
              >
                Eliminar
              </button>
            </div>
            {inscritos[evento.id] ? (
              <ul className="mt-3 space-y-2 text-xs">
                {inscritos[evento.id]?.length === 0 ? (
                  <li className="text-slate-500">Nadie inscrito aún.</li>
                ) : (
                  inscritos[evento.id]?.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-col gap-2 rounded-lg border px-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span>
                        {nombreDe(item.usuario_id)} · {item.asistencia ?? "Sin marcar"}
                      </span>
                      <span className="flex gap-1">
                        <button
                          type="button"
                          className="rounded bg-emerald-700 px-2 py-1 text-white"
                          onClick={() =>
                            void registrarAsistenciaEvento(
                              evento.id,
                              item.usuario_id,
                              "ASISTIO",
                            )
                              .then(() => obtenerInscripcionesEvento(evento.id))
                              .then((lista) =>
                                setInscritos((actual) => ({
                                  ...actual,
                                  [evento.id]: lista,
                                })),
                              )
                              .catch((err) => onError(mensajeError(err)))
                          }
                        >
                          Asistió
                        </button>
                        <button
                          type="button"
                          className="rounded bg-slate-700 px-2 py-1 text-white"
                          onClick={() =>
                            void registrarAsistenciaEvento(
                              evento.id,
                              item.usuario_id,
                              "NO_ASISTIO",
                            )
                              .then(() => obtenerInscripcionesEvento(evento.id))
                              .then((lista) =>
                                setInscritos((actual) => ({
                                  ...actual,
                                  [evento.id]: lista,
                                })),
                              )
                              .catch((err) => onError(mensajeError(err)))
                          }
                        >
                          No asistió
                        </button>
                      </span>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </article>
        ))}
        {eventos.length === 0 ? (
          <p className="text-sm text-slate-400">No hay eventos publicados.</p>
        ) : null}
      </div>
    </div>
  );
}
