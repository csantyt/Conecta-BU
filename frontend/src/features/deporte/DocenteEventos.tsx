/**
 * Pantalla "Mis eventos" del rol Docente (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Permite al docente crear, editar y cancelar torneos, masterclass, amistosos y
 * jornadas de práctica ligados a SUS deportes, ver los inscritos, exportar el CSV
 * y gestionar los conflictos de lugar/franja sin perder lo que escribió.
 *
 * ¿Cómo se relaciona con los demás?
 * Consume `/api/v1/deportes/docente/eventos` (protegido por rol Docente) y usa
 * los componentes de `ui/`. Los errores de acción se muestran en el modal o con
 * Toast, nunca reemplazando la pantalla.
 */

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  actualizarEventoDocente,
  cancelarEventoDocente,
  crearEventoDocente,
  descargarCsvInscritosEventoDocente,
  obtenerEventosDocente,
  obtenerInscritosEventoDocente,
  obtenerMisDeportesDocente,
  type PayloadEventoDocente,
} from "../../api/deporte";
import type {
  EventoPisu,
  InscritoEventoDocentePisu,
  MiDeporteDocente,
} from "../../types/deporte";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  ProgressBar,
  SearchBar,
  Select,
  Skeleton,
} from "./ui";
import { fechaLocal, mensajeError } from "./utils";

type Props = {
  deporteInicial?: string | undefined;
  onAviso: (mensaje: string, accion?: string) => void;
  onError: (mensaje: string) => void;
};

const TIPOS = ["Torneo", "Masterclass", "Amistoso", "Jornada de práctica", "Otro"] as const;
const CATEGORIAS = ["Pregrado", "Postgrado", "Egresado"] as const;

type Conflicto = {
  mensaje: string;
  detalle: string;
  alternativas: string[];
};

type Formulario = {
  nombre: string;
  descripcion: string;
  tipo: string;
  deporte_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  cupo_maximo: number;
  fecha_limite_inscripcion: string;
  categorias_permitidas: string[];
};

function hora12(hora?: string | null): string {
  if (!hora) return "—";
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  const sufijo = (h ?? 0) >= 12 ? "p. m." : "a. m.";
  const h12 = (h ?? 0) % 12 === 0 ? 12 : (h ?? 0) % 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${sufijo}`;
}

function tonoTipo(tipo?: string): "neutral" | "success" | "warning" | "danger" {
  if (tipo === "Torneo") return "success";
  if (tipo === "Masterclass") return "warning";
  if (tipo === "Amistoso") return "neutral";
  return "neutral";
}

function estadoDe(evento: EventoPisu): { texto: string; tono: "neutral" | "success" | "warning" | "danger" } {
  if (evento.estado_evento === "cancelado") return { texto: "Cancelado", tono: "danger" };
  if (evento.finalizado) return { texto: "Finalizado", tono: "neutral" };
  return { texto: "Publicado", tono: "success" };
}

function formularioVacio(deporteId = ""): Formulario {
  return {
    nombre: "",
    descripcion: "",
    tipo: "Torneo",
    deporte_id: deporteId,
    fecha: "",
    hora_inicio: "16:00",
    hora_fin: "18:00",
    lugar: "",
    cupo_maximo: 20,
    fecha_limite_inscripcion: "",
    categorias_permitidas: [],
  };
}

export default function DocenteEventos({ deporteInicial, onAviso, onError }: Props) {
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [deportes, setDeportes] = useState<MiDeporteDocente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"proximos" | "pasados" | "cancelados">("proximos");
  const [busqueda, setBusqueda] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState<Formulario>(formularioVacio());
  const [enviando, setEnviando] = useState(false);
  const [conflicto, setConflicto] = useState<Conflicto | null>(null);

  const [detalle, setDetalle] = useState<EventoPisu | null>(null);
  const [inscritos, setInscritos] = useState<InscritoEventoDocentePisu[]>([]);
  const [buscarInscrito, setBuscarInscrito] = useState("");
  const [cancelando, setCancelando] = useState<EventoPisu | null>(null);
  const [motivo, setMotivo] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const [lista, misDeportes] = await Promise.all([
        obtenerEventosDocente(),
        obtenerMisDeportesDocente(),
      ]);
      setEventos(lista);
      setDeportes(misDeportes);
    } catch (err) {
      setErrorCarga(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Al llegar con un deporte preseleccionado (?vista eventos:<deporteId>) abre el form.
  useEffect(() => {
    if (!deporteInicial || cargando) return;
    setForm(formularioVacio(deporteInicial));
    setEditandoId(null);
    setConflicto(null);
    setModalAbierto(true);
  }, [deporteInicial, cargando]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    const ahora = Date.now();
    const finDe = (evento: EventoPisu): number => {
      const dia = evento.fecha.slice(0, 10);
      const hora = (evento.hora_fin ?? "23:59").slice(0, 5);
      const valor = new Date(`${dia}T${hora}:00`).getTime();
      return Number.isNaN(valor) ? new Date(evento.fecha).getTime() : valor;
    };
    return eventos.filter((evento) => {
      const pasada = finDe(evento) < ahora;
      if (filtro === "cancelados" && evento.estado_evento !== "cancelado") return false;
      if (filtro === "proximos" && (pasada || evento.estado_evento === "cancelado")) return false;
      if (filtro === "pasados" && (!pasada || evento.estado_evento === "cancelado")) return false;
      if (!texto) return true;
      return (
        evento.nombre.toLowerCase().includes(texto) ||
        (evento.deporte?.nombre ?? "").toLowerCase().includes(texto) ||
        evento.lugar.toLowerCase().includes(texto)
      );
    });
  }, [eventos, filtro, busqueda]);

  const deporteDelForm = deportes.find((d) => d.id === form.deporte_id) ?? null;

  function abrirNuevo() {
    setForm(formularioVacio(deportes[0]?.id ?? ""));
    setEditandoId(null);
    setConflicto(null);
    setModalAbierto(true);
  }

  function abrirEditar(evento: EventoPisu) {
    setEditandoId(evento.id);
    setConflicto(null);
    setForm({
      nombre: evento.nombre,
      descripcion: evento.descripcion ?? "",
      tipo: evento.tipo ?? "Torneo",
      deporte_id: evento.deporte_id ?? evento.deporte?.id ?? "",
      fecha: evento.fecha.slice(0, 10),
      hora_inicio: (evento.hora_inicio ?? "16:00").slice(0, 5),
      hora_fin: (evento.hora_fin ?? "18:00").slice(0, 5),
      lugar: evento.lugar,
      cupo_maximo: evento.cupo_maximo,
      fecha_limite_inscripcion: evento.fecha_limite_inscripcion
        ? evento.fecha_limite_inscripcion.slice(0, 10)
        : "",
      categorias_permitidas: evento.categorias_permitidas ?? [],
    });
    setModalAbierto(true);
  }

  function errorDeFormulario(): string | null {
    if (form.nombre.trim().length < 2) return "Escribe el nombre del evento (mínimo 2 caracteres).";
    if (!form.deporte_id) return "Elige el deporte.";
    if (!form.fecha) return "Elige la fecha del evento.";
    if (!form.hora_inicio || !form.hora_fin) return "Indica la hora de inicio y de fin.";
    if (form.hora_fin <= form.hora_inicio) return "La hora de fin debe ser posterior a la de inicio.";
    if (form.cupo_maximo < 1) return "El cupo debe ser mayor que 0.";
    if (form.fecha_limite_inscripcion) {
      const inicio = new Date(`${form.fecha}T${form.hora_inicio}:00`).getTime();
      const limite = new Date(`${form.fecha_limite_inscripcion}T23:59:00`).getTime();
      if (limite >= inicio) {
        return "La fecha límite de inscripción debe ser anterior al inicio del evento.";
      }
    }
    return null;
  }

  async function guardar() {
    const error = errorDeFormulario();
    if (error) {
      setConflicto({ mensaje: error, detalle: "", alternativas: [] });
      return;
    }
    const payload: PayloadEventoDocente = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      tipo: form.tipo,
      deporte_id: form.deporte_id,
      fecha: form.fecha,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      lugar: form.lugar.trim(),
      cupo_maximo: form.cupo_maximo,
      fecha_limite_inscripcion: form.fecha_limite_inscripcion || null,
      categorias_permitidas:
        form.categorias_permitidas.length > 0 ? form.categorias_permitidas : undefined,
    };

    setEnviando(true);
    try {
      const resultado = editandoId
        ? await actualizarEventoDocente(editandoId, payload)
        : await crearEventoDocente(payload);
      setModalAbierto(false);
      setConflicto(null);
      const mensaje = editandoId
        ? "Evento actualizado."
        : `Evento creado.${resultado.notificados > 0 ? ` Se avisó a ${resultado.notificados} estudiante(s).` : ""}`;
      onAviso(resultado.aviso ? `${mensaje} ${resultado.aviso}` : mensaje, "eventos");
      await cargar();
    } catch (err) {
      // El conflicto 409 mantiene el modal abierto y conserva los datos.
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const data = err.response.data as {
          message?: string;
          codigo?: string;
          conflicto?: { tipo?: string; lugar?: string; nombre?: string };
          alternativas?: string[];
        };
        const detalle =
          data.conflicto && data.conflicto.tipo && data.conflicto.tipo !== "cupo"
            ? `Tipo: ${data.conflicto.tipo} · Lugar: ${data.conflicto.lugar ?? form.lugar}`
            : "";
        setConflicto({
          mensaje: data.message ?? "No se pudo guardar por un conflicto.",
          detalle,
          alternativas: data.alternativas ?? [],
        });
      } else {
        onError(mensajeError(err));
      }
    } finally {
      setEnviando(false);
    }
  }

  async function verInscritos(evento: EventoPisu) {
    setDetalle(evento);
    setInscritos([]);
    setBuscarInscrito("");
    try {
      const data = await obtenerInscritosEventoDocente(evento.id);
      setInscritos(data.inscritos);
    } catch (err) {
      onError(mensajeError(err));
    }
  }

  async function buscar(q: string) {
    setBuscarInscrito(q);
    if (!detalle) return;
    try {
      const data = await obtenerInscritosEventoDocente(detalle.id, q);
      setInscritos(data.inscritos);
    } catch (err) {
      onError(mensajeError(err));
    }
  }

  async function confirmarCancelacion() {
    if (!cancelando) return;
    if (motivo.trim().length < 3) {
      onError("Escribe el motivo de la cancelación (mínimo 3 caracteres).");
      return;
    }
    try {
      const resultado = await cancelarEventoDocente(cancelando.id, motivo.trim());
      setCancelando(null);
      setMotivo("");
      setDetalle(null);
      onAviso(
        resultado.eliminado
          ? "El evento se eliminó porque no tenía inscritos."
          : `Evento cancelado. Se avisó a ${resultado.notificados} inscrito(s).`,
        "eventos",
      );
      await cargar();
    } catch (err) {
      onError(mensajeError(err));
    }
  }

  if (cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (errorCarga) {
    return <ErrorState message={errorCarga} onRetry={() => void cargar()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis eventos"
        description="Crea y gestiona torneos, masterclass y jornadas de tus deportes."
        action={<Button onClick={abrirNuevo}>Nuevo evento</Button>}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {(["proximos", "pasados", "cancelados"] as const).map((valor) => (
            <button
              key={valor}
              type="button"
              onClick={() => setFiltro(valor)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                filtro === valor ? "bg-white/15 text-white" : "border border-white/15 text-slate-300"
              }`}
            >
              {valor === "proximos" ? "Próximos" : valor === "pasados" ? "Pasados" : "Cancelados"}
            </button>
          ))}
        </div>
        <div className="min-w-[220px] flex-1">
          <SearchBar value={busqueda} onChange={setBusqueda} placeholder="Buscar por nombre, deporte o lugar..." />
        </div>
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          title="No hay eventos en este filtro"
          description="Crea un evento con el botón «Nuevo evento» para que los estudiantes puedan inscribirse."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtrados.map((evento) => {
            const estado = estadoDe(evento);
            const inscritosN = evento.inscritos ?? 0;
            const libres = evento.cupos_libres ?? Math.max(0, evento.cupo_maximo - inscritosN);
            return (
              <Card key={evento.id} className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-white/10">
                      <span className="text-[10px] uppercase text-slate-400">
                        {new Date(evento.fecha).toLocaleDateString("es-CO", { month: "short" })}
                      </span>
                      <span className="text-lg font-bold">{new Date(evento.fecha).getDate()}</span>
                    </div>
                    <div>
                      <p className="font-semibold">{evento.nombre}</p>
                      <p className="text-xs text-slate-400">
                        {evento.deporte?.nombre ?? "Sin deporte"} · {fechaLocal(new Date(evento.fecha))}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone={tonoTipo(evento.tipo)}>{evento.tipo ?? "General"}</Badge>
                    <Badge tone={estado.tono}>{estado.texto}</Badge>
                  </div>
                </div>

                <p className="text-xs text-slate-300">
                  {hora12(evento.hora_inicio)} – {hora12(evento.hora_fin)} · {evento.lugar}
                </p>

                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-400">
                    <span>
                      {libres} cupos libres de {evento.cupo_maximo}
                    </span>
                    {evento.fecha_limite_inscripcion ? (
                      <span>
                        Cierra {fechaLocal(new Date(evento.fecha_limite_inscripcion))}
                      </span>
                    ) : null}
                  </div>
                  <ProgressBar value={inscritosN} max={evento.cupo_maximo} />
                </div>

                {evento.estado_evento === "cancelado" && evento.motivo_cancelacion ? (
                  <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    Motivo: {evento.motivo_cancelacion}
                  </p>
                ) : null}

                <div className="mt-auto flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => void verInscritos(evento)}>
                    Inscritos ({inscritosN})
                  </Button>
                  <Button variant="secondary" onClick={() => abrirEditar(evento)}>
                    Editar
                  </Button>
                  {evento.estado_evento !== "cancelado" ? (
                    <Button variant="danger" onClick={() => { setCancelando(evento); setMotivo(""); }}>
                      Cancelar
                    </Button>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {modalAbierto ? (
        <FormularioEvento
          form={form}
          setForm={setForm}
          deportes={deportes}
          deporte={deporteDelForm}
          editando={Boolean(editandoId)}
          enviando={enviando}
          conflicto={conflicto}
          onCerrar={() => { setModalAbierto(false); setConflicto(null); }}
          onGuardar={() => void guardar()}
        />
      ) : null}

      {detalle ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{detalle.nombre}</h3>
                <p className="text-xs text-slate-400">
                  {detalle.deporte?.nombre ?? "Sin deporte"} · {fechaLocal(new Date(detalle.fecha))} ·{" "}
                  {hora12(detalle.hora_inicio)}–{hora12(detalle.hora_fin)} · {detalle.lugar}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setDetalle(null)}>Cerrar</Button>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="min-w-[220px] flex-1">
                <SearchBar value={buscarInscrito} onChange={(v) => void buscar(v)} placeholder="Buscar inscrito..." />
              </div>
              <Button
                variant="secondary"
                onClick={() => void descargarCsvInscritosEventoDocente(detalle.id, detalle.nombre)}
              >
                Exportar CSV
              </Button>
            </div>

            {inscritos.length === 0 ? (
              <EmptyState title="Sin inscritos todavía" />
            ) : (
              <div className="max-h-72 overflow-auto rounded-xl border border-white/10">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Nombre</th>
                      <th className="px-3 py-2">Documento</th>
                      <th className="px-3 py-2">Categoría</th>
                      <th className="px-3 py-2">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inscritos.map((fila) => (
                      <tr key={fila.id} className="border-t border-white/5">
                        <td className="px-3 py-2">{fila.nombre}</td>
                        <td className="px-3 py-2 text-slate-400">{fila.documento ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-400">{fila.categoria ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-400">
                          {fechaLocal(new Date(fila.fecha_inscripcion))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {cancelando ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6">
            <h3 className="text-lg font-semibold">Cancelar evento</h3>
            <p className="mt-1 text-sm text-slate-300">
              {cancelando.inscritos && cancelando.inscritos > 0
                ? `Se avisará a ${cancelando.inscritos} inscrito(s). El evento quedará como "Cancelado".`
                : "El evento no tiene inscritos: se eliminará definitivamente."}
            </p>
            <div className="mt-3">
              <label className="block text-xs text-slate-300">
                <span className="mb-1 block">Motivo de la cancelación</span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-orange-400 focus:ring-2"
                  rows={3}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej.: Pronóstico de lluvia fuerte"
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setCancelando(null)}>Volver</Button>
              <Button variant="danger" onClick={() => void confirmarCancelacion()}>Cancelar evento</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type FormProps = {
  form: Formulario;
  setForm: (f: Formulario) => void;
  deportes: MiDeporteDocente[];
  deporte: MiDeporteDocente | null;
  editando: boolean;
  enviando: boolean;
  conflicto: Conflicto | null;
  onCerrar: () => void;
  onGuardar: () => void;
};

function FormularioEvento({
  form,
  setForm,
  deportes,
  deporte,
  editando,
  enviando,
  conflicto,
  onCerrar,
  onGuardar,
}: FormProps) {
  const resaltar = Boolean(conflicto && conflicto.detalle);
  const categoriasDelDeporte = (deporte?.categorias_permitidas ?? [...CATEGORIAS]) as string[];

  function actualizar(cambios: Partial<Formulario>) {
    setForm({ ...form, ...cambios });
  }

  function alternarCategoria(categoria: string) {
    const actuales = form.categorias_permitidas;
    actualizar({
      categorias_permitidas: actuales.includes(categoria)
        ? actuales.filter((c) => c !== categoria)
        : [...actuales, categoria],
    });
  }

  const campoResaltado = resaltar ? "ring-2 ring-rose-400" : "";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/60 p-4">
      <div className="my-6 w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h3 className="text-lg font-semibold">{editando ? "Editar evento" : "Nuevo evento"}</h3>

        {conflicto ? (
          <div className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">
            <p className="font-semibold">{conflicto.mensaje}</p>
            {conflicto.detalle ? <p className="mt-1 text-xs text-rose-200/80">{conflicto.detalle}</p> : null}
            {conflicto.alternativas.length > 0 ? (
              <p className="mt-2 text-xs">
                Lugares libres ese día y franja: {conflicto.alternativas.join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <section className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-uni-cian">Información</p>
              <Input
                label="Nombre del evento"
                value={form.nombre}
                onChange={(e) => actualizar({ nombre: e.target.value })}
                placeholder="Ej.: Torneo relámpago"
              />
              <label className="block text-xs text-slate-300">
                <span className="mb-1 block">Descripción</span>
                <textarea
                  className="mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-orange-400 focus:ring-2"
                  rows={2}
                  value={form.descripcion}
                  onChange={(e) => actualizar({ descripcion: e.target.value })}
                  placeholder="Detalles para los estudiantes"
                />
                <span className="mt-1 block text-[11px] text-slate-500">Aparece en la tarjeta del estudiante.</span>
              </label>
              <Select label="Tipo" value={form.tipo} onChange={(e) => actualizar({ tipo: e.target.value })}>
                {TIPOS.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
              </Select>
              <Select
                label="Deporte"
                value={form.deporte_id}
                onChange={(e) => actualizar({ deporte_id: e.target.value, categorias_permitidas: [] })}
              >
                <option value="">Selecciona un deporte</option>
                {deportes.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </Select>
              <span className="block text-[11px] text-slate-500">
                Solo puedes elegir tus deportes asignados.
              </span>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-uni-cian">Cuándo y dónde</p>
              <Input
                label="Fecha"
                type="date"
                className={campoResaltado}
                value={form.fecha}
                onChange={(e) => actualizar({ fecha: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Hora inicio"
                  type="time"
                  className={campoResaltado}
                  value={form.hora_inicio}
                  onChange={(e) => actualizar({ hora_inicio: e.target.value })}
                />
                <Input
                  label="Hora fin"
                  type="time"
                  className={campoResaltado}
                  value={form.hora_fin}
                  onChange={(e) => actualizar({ hora_fin: e.target.value })}
                />
              </div>
              <Input
                label="Lugar"
                className={campoResaltado}
                value={form.lugar}
                onChange={(e) => actualizar({ lugar: e.target.value })}
                placeholder="Ej.: Cancha principal"
              />
            </section>

            <section className="space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-uni-cian">Inscripción</p>
              <Input
                label="Cupo máximo"
                type="number"
                min={1}
                value={form.cupo_maximo}
                onChange={(e) => actualizar({ cupo_maximo: Number(e.target.value) })}
              />
              <Input
                label="Fecha límite de inscripción"
                type="date"
                value={form.fecha_limite_inscripcion}
                onChange={(e) => actualizar({ fecha_limite_inscripcion: e.target.value })}
              />
              <span className="block text-[11px] text-slate-500">
                Debe ser anterior al inicio del evento.
              </span>
              <div>
                <p className="mb-1 text-xs text-slate-300">Categorías permitidas</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIAS.map((categoria) => {
                    const permitida = categoriasDelDeporte.includes(categoria);
                    const marcada = form.categorias_permitidas.includes(categoria);
                    return (
                      <label
                        key={categoria}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                          permitida ? "border-white/20" : "border-white/5 opacity-40"
                        } ${marcada ? "bg-white/15" : ""}`}
                      >
                        <input
                          type="checkbox"
                          disabled={!permitida}
                          checked={marcada}
                          onChange={() => alternarCategoria(categoria)}
                        />
                        {categoria}
                      </label>
                    );
                  })}
                </div>
                <span className="mt-1 block text-[11px] text-slate-500">
                  Si no marcas ninguna, se permiten todas las del deporte.
                </span>
              </div>
            </section>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-uni-cian">Vista previa del estudiante</p>
            <Card className="space-y-2">
              <div className="flex items-start justify-between">
                <p className="font-semibold">{form.nombre || "Nombre del evento"}</p>
                <Badge tone={tonoTipo(form.tipo)}>{form.tipo}</Badge>
              </div>
              <p className="text-xs text-slate-400">
                {deporte?.nombre ?? "Deporte"} · Organiza: tú
              </p>
              <p className="text-xs text-slate-300">
                {form.fecha ? fechaLocal(new Date(`${form.fecha}T12:00:00`)) : "Fecha por definir"} ·{" "}
                {hora12(form.hora_inicio)}–{hora12(form.hora_fin)}
              </p>
              <p className="text-xs text-slate-300">{form.lugar || "Lugar por definir"}</p>
              <p className="text-xs text-slate-400">Cupo: {form.cupo_maximo}</p>
              {form.descripcion ? <p className="text-xs text-slate-400">{form.descripcion}</p> : null}
            </Card>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCerrar} disabled={enviando}>Cerrar</Button>
          <Button onClick={onGuardar} disabled={enviando}>
            {enviando ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
