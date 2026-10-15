/**
 * Pantalla "Llamar a lista" del rol Docente (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Registra la asistencia de una clase y una fecha. Muestra la ventana horaria,
 * permite marcar a cada estudiante (por defecto todos presentes), y bloquea la
 * edición cuando corresponde. Los errores de la acción se muestran con Toast o
 * en un modal, sin reemplazar la pantalla.
 */

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  editarAsistenciaDocente,
  guardarAsistenciaDocente,
  obtenerClasesHoyDocente,
  obtenerSesionListaDocente,
} from "../../api/deporte";
import type { ClaseHoyDocente, SesionListaDocente } from "../../types/deporte";
import { Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, Skeleton } from "./ui";
import { fechaLocal, horaCorta, mensajeError } from "./utils";

type Props = {
  horarioId: string;
  fechaInicial?: string;
  onAviso: (mensaje: string) => void;
  onError: (mensaje: string) => void;
  onNavegar: (vista: string) => void;
};

/** Lunes y domingo de la semana actual, para limitar el selector de fecha. */
function limitesSemana(): { min: string; max: string } {
  const hoy = new Date();
  const dia = hoy.getDay();
  const desplazamientoLunes = dia === 0 ? -6 : 1 - dia;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + desplazamientoLunes);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return { min: fechaLocal(lunes), max: fechaLocal(domingo) };
}

function tonoEstado(estado: string): "neutral" | "success" | "warning" | "danger" {
  if (estado === "Al día") return "success";
  if (estado === "En riesgo") return "warning";
  if (estado === "Reprobaría") return "danger";
  return "neutral";
}

export default function DocenteLlamarLista({
  horarioId,
  fechaInicial,
  onAviso,
  onError,
  onNavegar,
}: Props) {
  const [fecha, setFecha] = useState(fechaInicial ?? fechaLocal(new Date()));
  const [sesion, setSesion] = useState<SesionListaDocente | null>(null);
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({});
  const [original, setOriginal] = useState<Record<string, boolean | null>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [enEdicion, setEnEdicion] = useState(false);
  const [modalDuplicado, setModalDuplicado] = useState<string | null>(null);
  const [clasesHoy, setClasesHoy] = useState<ClaseHoyDocente[]>([]);
  const limites = useMemo(limitesSemana, []);

  const cargar = useCallback(
    async (fechaConsulta: string) => {
      setCargando(true);
      setError(null);
      try {
        const data = await obtenerSesionListaDocente(horarioId, fechaConsulta);
        setSesion(data);
        const mapaSeleccion: Record<string, boolean> = {};
        const mapaOriginal: Record<string, boolean | null> = {};
        for (const estudiante of data.estudiantes) {
          mapaSeleccion[estudiante.estudiante_id] =
            estudiante.presente ?? true; // por defecto: todos presentes
          mapaOriginal[estudiante.estudiante_id] = estudiante.presente;
        }
        setSeleccion(mapaSeleccion);
        setOriginal(mapaOriginal);
        setEnEdicion(false);
      } catch (err) {
        const mensaje = mensajeError(err);
        setError(mensaje);
        onError(mensaje);
      } finally {
        setCargando(false);
      }
    },
    [horarioId, onError],
  );

  useEffect(() => {
    if (!horarioId) return;
    void cargar(fecha);
  }, [cargar, fecha, horarioId]);

  // Si se entra desde el menú (sin horario), se ofrece elegir una clase de hoy.
  useEffect(() => {
    if (horarioId) return;
    void obtenerClasesHoyDocente()
      .then(setClasesHoy)
      .catch(() => setClasesHoy([]));
  }, [horarioId]);

  if (!horarioId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Llamar a lista"
          description="Elige la clase de hoy para registrar la asistencia."
        />
        {clasesHoy.length === 0 ? (
          <EmptyState
            title="No hay clases programadas para hoy"
            description="Puedes iniciar la asistencia desde 'Mis deportes' o desde 'Clases de hoy'."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {clasesHoy.map((clase) => (
              <Card key={clase.horario_id} className="flex flex-col gap-2">
                <p className="font-semibold">{clase.deporte.nombre}</p>
                <p className="text-xs text-slate-400">
                  {horaCorta(clase.hora_inicio)}–{horaCorta(clase.hora_fin)} · {clase.lugar}
                </p>
                <Button onClick={() => onNavegar(`lista:${clase.horario_id}:${clase.fecha}`)}>
                  Tomar asistencia
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (cargando && !sesion) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error && !sesion) {
    return <ErrorState message={error} onRetry={() => void cargar(fecha)} />;
  }

  if (!sesion) {
    return null;
  }

  const diaFecha = new Date(`${fecha}T00:00:00`).getDay();
  const diaCoincide = diaFecha === sesion.horario.dia_semana;
  const registrada = sesion.ya_registrada;
  const editable = registrada ? sesion.editable : sesion.ventana.abierta;
  const puedeGuardar = editable && (registrada ? enEdicion : true) && diaCoincide;

  const totalPresentes = sesion.estudiantes.filter((e) => seleccion[e.estudiante_id]).length;
  const totalAusentes = sesion.estudiantes.length - totalPresentes;

  function alternar(estudianteId: string, valor: boolean): void {
    setSeleccion((prev) => ({ ...prev, [estudianteId]: valor }));
  }

  async function guardar(): Promise<void> {
    if (!sesion) return;
    setGuardando(true);
    try {
      if (!registrada) {
        await guardarAsistenciaDocente({
          horarioId,
          fecha,
          estudiantes: sesion.estudiantes.map((e) => ({
            estudianteId: e.estudiante_id,
            presente: seleccion[e.estudiante_id] ?? true,
          })),
        });
        onAviso("Asistencia registrada correctamente.");
      } else {
        const cambios = sesion.estudiantes.filter(
          (e) => original[e.estudiante_id] !== (seleccion[e.estudiante_id] ?? false) && e.asistencia_id,
        );
        for (const estudiante of cambios) {
          if (!estudiante.asistencia_id) continue;
          await editarAsistenciaDocente(
            estudiante.asistencia_id,
            seleccion[estudiante.estudiante_id] ?? false,
          );
        }
        onAviso("Asistencia actualizada correctamente.");
      }
      await cargar(fecha);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setModalDuplicado(
          mensajeError(err) ||
            "La asistencia de esta clase ya fue registrada. Puedes editarla dentro de las 24 horas.",
        );
        await cargar(fecha);
      } else {
        onError(mensajeError(err));
      }
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Llamar a lista · ${sesion.horario.deporte}`}
        description={`${sesion.horario.dia} ${horaCorta(sesion.horario.hora_inicio)}–${horaCorta(sesion.horario.hora_fin)} · ${sesion.horario.lugar}`}
        action={
          <Button variant="secondary" onClick={() => onNavegar("hoy")}>
            Clases de hoy
          </Button>
        }
      />

      {sesion.ignorar_horario ? (
        <p className="rounded-xl border border-orange-400/40 bg-orange-500/10 px-4 py-2 text-sm text-orange-200">
          Modo de pruebas: horario ignorado (ASISTENCIA_IGNORAR_HORARIO=true).
        </p>
      ) : null}

      <Card className="space-y-3">
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs text-slate-300">
            <span className="mb-1 block">Fecha de la clase</span>
            <input
              type="date"
              value={fecha}
              min={limites.min}
              max={limites.max}
              disabled={registrada}
              onChange={(e) => setFecha(e.target.value)}
              className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-orange-400 focus:ring-2"
            />
          </label>
          <div className="text-xs text-slate-400">
            <p>
              Ventana: {horaCorta(sesion.horario.hora_inicio)} – {horaCorta(sesion.horario.hora_fin)}
            </p>
            <p>{sesion.estudiantes.length} estudiantes con inscripción activa</p>
          </div>
        </div>

        {!diaCoincide ? (
          <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            La fecha elegida no corresponde al {sesion.horario.dia.toLowerCase()} de esta clase.
          </p>
        ) : null}

        {registrada ? (
          <p className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-3 py-2 text-xs text-sky-200">
            {sesion.editable
              ? "La asistencia ya fue registrada. Puedes corregirla dentro de las 24 horas posteriores a la clase."
              : "La asistencia ya fue registrada y el plazo de corrección (24 h) venció. Solo lectura."}
          </p>
        ) : sesion.ventana.abierta ? null : (
          <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {sesion.ventana.motivo}
          </p>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="success">{totalPresentes} presentes</Badge>
        <Badge tone="danger">{totalAusentes} ausentes</Badge>
        {puedeGuardar ? (
          <>
            <Button variant="secondary" onClick={() => sesion.estudiantes.forEach((e) => alternar(e.estudiante_id, true))}>
              Todos presentes
            </Button>
            <Button variant="secondary" onClick={() => sesion.estudiantes.forEach((e) => alternar(e.estudiante_id, false))}>
              Todos ausentes
            </Button>
          </>
        ) : null}
      </div>

      <Card className="p-0">
        <ul className="divide-y divide-white/10">
          {sesion.estudiantes.map((estudiante) => {
            const presente = seleccion[estudiante.estudiante_id] ?? true;
            return (
              <li key={estudiante.estudiante_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-[220px]">
                  <p className="text-sm font-semibold">{estudiante.nombre}</p>
                  <p className="text-xs text-slate-400">
                    {estudiante.documento ?? "Sin documento"} · {estudiante.categoria ?? "Sin categoría"}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {estudiante.dictadas > 0
                      ? `${estudiante.presentes}/${estudiante.dictadas} clases · ${estudiante.porcentaje}%`
                      : "Sin clases registradas"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={tonoEstado(estudiante.estado)}>{estudiante.estado}</Badge>
                  {puedeGuardar ? (
                    <div className="inline-flex overflow-hidden rounded-full border border-white/15">
                      <button
                        type="button"
                        onClick={() => alternar(estudiante.estudiante_id, true)}
                        className={`px-3 py-1 text-xs font-semibold ${presente ? "bg-emerald-500/25 text-emerald-200" : "text-slate-300"}`}
                      >
                        Presente
                      </button>
                      <button
                        type="button"
                        onClick={() => alternar(estudiante.estudiante_id, false)}
                        className={`px-3 py-1 text-xs font-semibold ${!presente ? "bg-rose-500/25 text-rose-200" : "text-slate-300"}`}
                      >
                        Ausente
                      </button>
                    </div>
                  ) : (
                    <Badge tone={presente ? "success" : "danger"}>{presente ? "Presente" : "Ausente"}</Badge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="flex flex-wrap gap-3">
        {registrada && sesion.editable && !enEdicion ? (
          <Button onClick={() => setEnEdicion(true)}>Editar asistencia</Button>
        ) : (
          <Button disabled={!puedeGuardar || guardando} onClick={() => void guardar()}>
            {guardando ? "Guardando…" : registrada ? "Guardar cambios" : "Guardar asistencia"}
          </Button>
        )}
        {enEdicion ? (
          <Button variant="secondary" onClick={() => { setEnEdicion(false); void cargar(fecha); }}>
            Cancelar
          </Button>
        ) : null}
      </div>

      <Modal
        open={modalDuplicado !== null}
        onClose={() => setModalDuplicado(null)}
        title="Asistencia ya registrada"
      >
        <p className="text-sm text-slate-200">{modalDuplicado}</p>
        <p className="mt-2 text-xs text-slate-400">
          Puedes abrir la asistencia existente y corregirla dentro de las 24 horas posteriores a la clase.
        </p>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => { setModalDuplicado(null); setEnEdicion(true); }}>
            Ir a editar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
