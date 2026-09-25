import { useEffect, useState, type FormEvent } from "react";
import {
  actualizarDeporteAdmin,
  actualizarEventoAdmin,
  actualizarHorarioAdmin,
  crearAlertaAdmin,
  crearDeporteAdmin,
  crearEventoAdmin,
  crearHorarioAdmin,
  eliminarAlertaAdmin,
  obtenerAlertasAdmin,
  obtenerDeportesAdmin,
  obtenerDocentesPisu,
  obtenerEventosAdmin,
  obtenerHorariosAdmin,
  obtenerResumenPisu,
} from "../../api/deporte";
import type {
  AlertaPisu,
  DeportePisu,
  DocentePisu,
  EventoPisu,
  HorarioAdminPisu,
  ResumenPisu,
} from "../../types/deporte";
import { DIAS, etiquetaHorario, mensajeError } from "./utils";

type PanelAdminPisuProps = {
  deportes: DeportePisu[];
  onAviso: (valor: string) => void;
  onError: (valor: string) => void;
  onRecargar: () => Promise<void>;
};

type Vista =
  | "resumen"
  | "deportes"
  | "horarios"
  | "eventos"
  | "alertas";

const tabClass = (activa: boolean) =>
  `shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
    activa
      ? "bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 shadow-[0_10px_24px_-12px_rgba(56,189,248,0.9)]"
      : "border border-white/15 text-slate-300 hover:border-sky-400/35 hover:bg-white/5 hover:text-white"
  }`;

const btnPrimario =
  "rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_10px_24px_-12px_rgba(56,189,248,0.9)] transition hover:brightness-110 disabled:opacity-50";
const btnSecundario =
  "rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-400/10";
const inputClass =
  "mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-sky-400 focus:ring-2";

export default function PanelAdminPisu({
  deportes,
  onAviso,
  onError,
  onRecargar,
}: PanelAdminPisuProps) {
  const [vista, setVista] = useState<Vista>("resumen");

  return (
    <div>
      <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["resumen", "Resumen"],
            ["deportes", "Deportes"],
            ["horarios", "Horarios"],
            ["eventos", "Eventos"],
            ["alertas", "Alertas"],
          ] as const
        ).map(([id, etiqueta]) => (
          <button
            key={id}
            type="button"
            onClick={() => setVista(id)}
            className={tabClass(vista === id)}
          >
            {etiqueta}
          </button>
        ))}
      </nav>

      {vista === "resumen" ? (
        <ResumenAdmin onError={onError} />
      ) : null}
      {vista === "deportes" ? (
        <GestionDeportes
          deportesCatalogo={deportes}
          onAviso={onAviso}
          onError={onError}
          onRecargar={onRecargar}
        />
      ) : null}
      {vista === "horarios" ? (
        <GestionHorarios
          deportes={deportes}
          onAviso={onAviso}
          onError={onError}
          onRecargar={onRecargar}
        />
      ) : null}
      {vista === "eventos" ? (
        <GestionEventos onAviso={onAviso} onError={onError} />
      ) : null}
      {vista === "alertas" ? (
        <GestionAlertas onAviso={onAviso} onError={onError} />
      ) : null}
    </div>
  );
}

function ResumenAdmin({ onError }: { onError: (v: string) => void }) {
  const [resumen, setResumen] = useState<ResumenPisu | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    void obtenerResumenPisu()
      .then(setResumen)
      .catch((err) => onError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, [onError]);

  const cards = resumen
    ? [
        ["Usuarios PISU", resumen.usuarios, "text-sky-300"],
        ["Deportes activos", resumen.deportes_activos, "text-emerald-300"],
        ["Inscripciones", resumen.inscripciones_activas, "text-cyan-300"],
        ["Horarios", resumen.horarios_activos, "text-violet-300"],
        ["Eventos", resumen.eventos_activos, "text-amber-300"],
        ["Asistencias", resumen.asistencias, "text-rose-300"],
        ["Alertas", resumen.alertas, "text-slate-200"],
      ]
    : [];

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Resumen administrativo</h2>
      {cargando ? (
        <p className="text-sm text-slate-400">Cargando indicadores...</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(([label, valor, color]) => (
            <article
              key={String(label)}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] p-5"
            >
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {label}
              </p>
              <p className={`mt-2 text-3xl font-semibold tabular-nums ${color}`}>
                {valor}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function GestionDeportes({
  deportesCatalogo,
  onAviso,
  onError,
  onRecargar,
}: {
  deportesCatalogo: DeportePisu[];
  onAviso: (v: string) => void;
  onError: (v: string) => void;
  onRecargar: () => Promise<void>;
}) {
  const [deportes, setDeportes] = useState<
    Array<{
      id: string;
      nombre: string;
      descripcion: string | null;
      cupo_maximo: number;
      estado: boolean;
    }>
  >([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [cupo, setCupo] = useState(20);
  const [guardando, setGuardando] = useState(false);

  async function recargarLista() {
    setDeportes(await obtenerDeportesAdmin());
  }

  useEffect(() => {
    void recargarLista().catch((err) => onError(mensajeError(err)));
  }, [onError, deportesCatalogo]);

  async function onCrear(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    try {
      await crearDeporteAdmin({
        nombre,
        descripcion: descripcion || undefined,
        cupo_maximo: cupo,
      });
      setNombre("");
      setDescripcion("");
      setCupo(20);
      onAviso("Deporte creado.");
      await Promise.all([recargarLista(), onRecargar()]);
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="space-y-6">
      <form
        onSubmit={(e) => void onCrear(e)}
        className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
      >
        <h2 className="text-lg font-semibold">Nuevo deporte</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            Nombre
            <input
              required
              className={inputClass}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-400">
            Cupo máximo
            <input
              type="number"
              min={1}
              required
              className={inputClass}
              value={cupo}
              onChange={(e) => setCupo(Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-slate-400 sm:col-span-2">
            Descripción
            <textarea
              className={inputClass}
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </label>
        </div>
        <button type="submit" disabled={guardando} className={`mt-4 ${btnPrimario}`}>
          {guardando ? "Guardando..." : "Crear deporte"}
        </button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {deportes.map((deporte) => (
          <article
            key={deporte.id}
            className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{deporte.nombre}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Cupo {deporte.cupo_maximo}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {deporte.estado ? "Activo" : "Inactivo"}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold transition hover:bg-slate-50"
                onClick={() =>
                  void actualizarDeporteAdmin(deporte.id, {
                    estado: !deporte.estado,
                  })
                    .then(() => {
                      onAviso(
                        deporte.estado
                          ? "Deporte desactivado."
                          : "Deporte reactivado.",
                      );
                      return Promise.all([recargarLista(), onRecargar()]);
                    })
                    .catch((err) => onError(mensajeError(err)))
                }
              >
                {deporte.estado ? "Desactivar" : "Activar"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function GestionHorarios({
  deportes,
  onAviso,
  onError,
  onRecargar,
}: {
  deportes: DeportePisu[];
  onAviso: (v: string) => void;
  onError: (v: string) => void;
  onRecargar: () => Promise<void>;
}) {
  const [horarios, setHorarios] = useState<HorarioAdminPisu[]>([]);
  const [docentes, setDocentes] = useState<DocentePisu[]>([]);
  const [deporteId, setDeporteId] = useState(deportes[0]?.id ?? "");
  const [docenteId, setDocenteId] = useState("");
  const [dia, setDia] = useState(1);
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFin, setHoraFin] = useState("10:00");
  const [lugar, setLugar] = useState("Cancha principal");
  const [guardando, setGuardando] = useState(false);

  async function recargar() {
    const [lista, docs] = await Promise.all([
      obtenerHorariosAdmin(),
      obtenerDocentesPisu(),
    ]);
    setHorarios(lista);
    setDocentes(docs);
    setDocenteId((actual) =>
      actual && docs.some((d) => d.id === actual) ? actual : (docs[0]?.id ?? ""),
    );
  }

  useEffect(() => {
    void recargar().catch((err) => onError(mensajeError(err)));
  }, [onError]);

  useEffect(() => {
    if (!deporteId && deportes[0]) {
      setDeporteId(deportes[0].id);
    }
  }, [deportes, deporteId]);

  async function onCrear(event: FormEvent) {
    event.preventDefault();
    if (!deporteId || !docenteId) {
      onError("Asigna un deporte y un docente.");
      return;
    }
    setGuardando(true);
    try {
      await crearHorarioAdmin({
        deporte_id: deporteId,
        docente_id: docenteId,
        dia_semana: dia,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        lugar,
      });
      onAviso("Horario publicado. El docente ya puede tomar asistencia.");
      await Promise.all([recargar(), onRecargar()]);
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="space-y-6">
      <form
        onSubmit={(e) => void onCrear(e)}
        className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
      >
        <h2 className="text-lg font-semibold">Publicar horario</h2>
        <p className="mt-1 text-sm text-slate-400">
          Asigna clase a un docente. Sin horarios, la pestaña de asistencia queda vacía.
        </p>
        {docentes.length === 0 ? (
          <p className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            Primero asigna el rol Docente en Usuarios PISU.
          </p>
        ) : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            Deporte
            <select
              className={inputClass}
              value={deporteId}
              onChange={(e) => setDeporteId(e.target.value)}
            >
              {deportes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Docente
            <select
              className={inputClass}
              value={docenteId}
              onChange={(e) => setDocenteId(e.target.value)}
            >
              {docentes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} · {d.rol}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Día
            <select
              className={inputClass}
              value={dia}
              onChange={(e) => setDia(Number(e.target.value))}
            >
              {DIAS.map((nombreDia, i) => (
                <option key={nombreDia} value={i}>
                  {nombreDia}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-400">
            Lugar
            <input
              required
              className={inputClass}
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-400">
            Inicio
            <input
              type="time"
              required
              className={inputClass}
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-400">
            Fin
            <input
              type="time"
              required
              className={inputClass}
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
            />
          </label>
        </div>
        <button type="submit" disabled={guardando} className={`mt-4 ${btnPrimario}`}>
          {guardando ? "Publicando..." : "Publicar horario"}
        </button>
      </form>

      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Deporte</th>
              <th className="px-4 py-3">Docente</th>
              <th className="px-4 py-3">Horario</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {horarios.map((h) => (
              <tr key={h.id} className="border-t border-white/5">
                <td className="px-4 py-3">{h.deporte?.nombre ?? "—"}</td>
                <td className="px-4 py-3 text-slate-300">
                  {h.docente?.nombre ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-400">{etiquetaHorario(h)}</td>
                <td className="px-4 py-3">
                  {h.estado ? "Activo" : "Inactivo"}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className={btnSecundario}
                    onClick={() =>
                      void actualizarHorarioAdmin(h.id, { estado: !h.estado })
                        .then(() => {
                          onAviso(
                            h.estado
                              ? "Horario deshabilitado."
                              : "Horario reactivado.",
                          );
                          return Promise.all([recargar(), onRecargar()]);
                        })
                        .catch((err) => onError(mensajeError(err)))
                    }
                  >
                    {h.estado ? "Deshabilitar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {horarios.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-400">
            Aún no hay horarios publicados.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function GestionEventos({
  onAviso,
  onError,
}: {
  onAviso: (v: string) => void;
  onError: (v: string) => void;
}) {
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [fecha, setFecha] = useState("");
  const [lugar, setLugar] = useState("");
  const [cupo, setCupo] = useState(40);
  const [guardando, setGuardando] = useState(false);

  async function recargar() {
    setEventos(await obtenerEventosAdmin());
  }

  useEffect(() => {
    void recargar().catch((err) => onError(mensajeError(err)));
  }, [onError]);

  async function onCrear(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    try {
      await crearEventoAdmin({
        nombre,
        descripcion: descripcion || undefined,
        fecha: new Date(fecha).toISOString(),
        lugar,
        cupo_maximo: cupo,
      });
      setNombre("");
      setDescripcion("");
      setFecha("");
      setLugar("");
      setCupo(40);
      onAviso("Evento creado.");
      await recargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="space-y-6">
      <form
        onSubmit={(e) => void onCrear(e)}
        className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
      >
        <h2 className="text-lg font-semibold">Nuevo evento deportivo</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            Nombre
            <input
              required
              className={inputClass}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-400">
            Cupo
            <input
              type="number"
              min={1}
              required
              className={inputClass}
              value={cupo}
              onChange={(e) => setCupo(Number(e.target.value))}
            />
          </label>
          <label className="text-xs text-slate-400">
            Fecha y hora
            <input
              type="datetime-local"
              required
              className={inputClass}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-400">
            Lugar
            <input
              required
              className={inputClass}
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-400 sm:col-span-2">
            Descripción
            <textarea
              className={inputClass}
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </label>
        </div>
        <button type="submit" disabled={guardando} className={`mt-4 ${btnPrimario}`}>
          {guardando ? "Guardando..." : "Crear evento"}
        </button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {eventos.map((evento) => (
          <article
            key={evento.id}
            className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900"
          >
            <p className="font-semibold">{evento.nombre}</p>
            <p className="mt-1 text-sm text-slate-600">
              {new Date(evento.fecha).toLocaleString("es-CO")} · {evento.lugar}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Cupo {evento.cupo_maximo} · {evento.estado ? "Activo" : "Inactivo"}
            </p>
            <button
              type="button"
              className="mt-3 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold"
              onClick={() =>
                void actualizarEventoAdmin(evento.id, { estado: !evento.estado })
                  .then(() => {
                    onAviso(
                      evento.estado ? "Evento desactivado." : "Evento reactivado.",
                    );
                    return recargar();
                  })
                  .catch((err) => onError(mensajeError(err)))
              }
            >
              {evento.estado ? "Desactivar" : "Activar"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function GestionAlertas({
  onAviso,
  onError,
}: {
  onAviso: (v: string) => void;
  onError: (v: string) => void;
}) {
  const [alertas, setAlertas] = useState<AlertaPisu[]>([]);
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [audiencia, setAudiencia] =
    useState<AlertaPisu["audiencia"]>("Todos");
  const [guardando, setGuardando] = useState(false);

  async function recargar() {
    setAlertas(await obtenerAlertasAdmin());
  }

  useEffect(() => {
    void recargar().catch((err) => onError(mensajeError(err)));
  }, [onError]);

  async function onCrear(event: FormEvent) {
    event.preventDefault();
    setGuardando(true);
    try {
      await crearAlertaAdmin({ titulo, mensaje, audiencia });
      setTitulo("");
      setMensaje("");
      setAudiencia("Todos");
      onAviso("Alerta publicada.");
      await recargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="space-y-6">
      <form
        onSubmit={(e) => void onCrear(e)}
        className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
      >
        <h2 className="text-lg font-semibold">Publicar alerta</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            Título
            <input
              required
              className={inputClass}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </label>
          <label className="text-xs text-slate-400">
            Audiencia
            <select
              className={inputClass}
              value={audiencia}
              onChange={(e) =>
                setAudiencia(e.target.value as AlertaPisu["audiencia"])
              }
            >
              <option value="Todos">Todos</option>
              <option value="Estudiantes">Estudiantes</option>
              <option value="Docentes">Docentes</option>
            </select>
          </label>
          <label className="text-xs text-slate-400 sm:col-span-2">
            Mensaje
            <textarea
              required
              className={inputClass}
              rows={3}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
            />
          </label>
        </div>
        <button type="submit" disabled={guardando} className={`mt-4 ${btnPrimario}`}>
          {guardando ? "Publicando..." : "Publicar alerta"}
        </button>
      </form>

      <div className="space-y-3">
        {alertas.map((alerta) => (
          <article
            key={alerta.id}
            className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{alerta.titulo}</p>
                <p className="mt-1 text-sm text-slate-600">{alerta.mensaje}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {alerta.audiencia} ·{" "}
                  {new Date(alerta.fecha_creacion).toLocaleString("es-CO")}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700"
                onClick={() =>
                  void eliminarAlertaAdmin(alerta.id)
                    .then(() => {
                      onAviso("Alerta eliminada.");
                      return recargar();
                    })
                    .catch((err) => onError(mensajeError(err)))
                }
              >
                Eliminar
              </button>
            </div>
          </article>
        ))}
        {alertas.length === 0 ? (
          <p className="text-sm text-slate-400">No hay alertas publicadas.</p>
        ) : null}
      </div>
    </section>
  );
}
