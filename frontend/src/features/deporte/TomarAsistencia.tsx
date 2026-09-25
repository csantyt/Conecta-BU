import { useEffect, useMemo, useState } from "react";
import {
  editarAsistenciaDocente,
  guardarAsistenciaDocente,
  obtenerAsistenciasDocente,
  obtenerEstudiantesDeClase,
  obtenerMisClasesDocente,
} from "../../api/deporte";
import type {
  AsistenciaPisu,
  ClaseDocente,
  EstudianteDeClase,
} from "../../types/deporte";
import { etiquetaHorario, fechaLocal, mensajeError } from "./utils";

type TomarAsistenciaProps = {
  onAviso: (valor: string) => void;
  onError: (valor: string) => void;
};

const VENTANA_24H_MS = 24 * 60 * 60 * 1000;

function editableDentro24h(asistenciaRegistro: string | undefined): boolean {
  if (!fechaRegistro) {
    return false;
  }
  return Date.now() - new Date(fechaRegistro).getTime() <= VENTANA_24H_MS;
}

export default function TomarAsistencia({
  onAviso,
  onError,
}: TomarAsistenciaProps) {
  const [clases, setClases] = useState<ClaseDocente[]>([]);
  const [horarioId, setHorarioId] = useState("");
  const [fecha, setFecha] = useState(fechaLocal(new Date()));
  const [estudiantes, setEstudiantes] = useState<EstudianteDeClase[]>([]);
  const [presente, setPresente] = useState<Record<string, boolean>>({});
  const [asistenciasMap, setAsistenciasMap] = useState<
    Record<string, AsistenciaPisu>
  >({});
  const [cargandoClases, setCargandoClases] = useState(true);
  const [cargandoGrupo, setCargandoGrupo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const clase = clases.find((item) => item.id === horarioId);

  const lista = useMemo(
    () =>
      estudiantes.filter(
        (
          item,
        ): item is EstudianteDeClase & {
          estudiante: NonNullable<EstudianteDeClase["estudiante"]>;
        } => Boolean(item.estudiante),
      ),
    [estudiantes],
  );

  useEffect(() => {
    let activo = true;
    setCargandoClases(true);
    void obtenerMisClasesDocente()
      .then((items) => {
        if (!activo) {
          return;
        }
        setClases(items);
        setHorarioId((actual) =>
          actual && items.some((item) => item.id === actual)
            ? actual
            : (items[0]?.id ?? ""),
        );
      })
      .catch((error) => onError(mensajeError(error)))
      .finally(() => {
        if (activo) {
          setCargandoClases(false);
        }
      });
    return () => {
      activo = false;
    };
  }, [onError]);

  async function cargarGrupo() {
    if (!horarioId || !fecha) {
      setEstudiantes([]);
      setPresente({});
      setAsistenciasMap({});
      return;
    }

    setCargandoGrupo(true);
    try {
      const [grupo, asistencias] = await Promise.all([
        obtenerEstudiantesDeClase(horarioId),
        obtenerAsistenciasDocente(fecha),
      ]);
      setEstudiantes(grupo.estudiantes);
      const deEstaClase = asistencias.filter(
        (item) => item.horario_id === horarioId,
      );
      const mapaPresente: Record<string, boolean> = {};
      const mapaAsistencia: Record<string, AsistenciaPisu> = {};
      for (const fila of grupo.estudiantes) {
        if (!fila.estudiante) {
          continue;
        }
        const previa = deEstaClase.find(
          (item) => item.estudiante_id === fila.estudiante?.id,
        );
        mapaPresente[fila.estudiante.id] = previa?.presente ?? false;
        if (previa) {
          mapaAsistencia[fila.estudiante.id] = previa;
        }
      }
      setPresente(mapaPresente);
      setAsistenciasMap(mapaAsistencia);
    } catch (error) {
      onError(mensajeError(error));
    } finally {
      setCargandoGrupo(false);
    }
  }

  useEffect(() => {
    void cargarGrupo();
  }, [horarioId, fecha]);

  function marcarTodosPresentes() {
    const mapa: Record<string, boolean> = {};
    for (const fila of lista) {
      mapa[fila.estudiante.id] = true;
    }
    setPresente(mapa);
  }

  async function guardar() {
    if (!horarioId || lista.length === 0) {
      return;
    }
    setGuardando(true);
    try {
      const guardadas = await guardarAsistenciaDocente({
        horarioId,
        fecha,
        estudiantes: lista.map((fila) => ({
          estudianteId: fila.estudiante.id,
          presente: presente[fila.estudiante.id] ?? false,
        })),
      });
      const mapa: Record<string, AsistenciaPisu> = {};
      for (const item of guardadas) {
        mapa[item.estudiante_id] = item;
      }
      setAsistenciasMap(mapa);
      onAviso("Asistencia guardada.");
    } catch (error) {
      onError(mensajeError(error));
    } finally {
      setGuardando(false);
    }
  }

  async function editarRapido(estudianteId: string, nuevoPresente: boolean) {
    const asistencia = asistenciasMap[estudianteId];
    if (!asistencia) {
      setPresente((actual) => ({ ...actual, [estudianteId]: nuevoPresente }));
      return;
    }
    if (!editableDentro24h(asistencia.fecha_registro)) {
      onError(
        "Solo puedes editar la asistencia dentro de las 24 horas posteriores a su registro (RF-016).",
      );
      return;
    }

    setEditandoId(estudianteId);
    try {
      const actualizada = await editarAsistenciaDocente(
        asistencia.id,
        nuevoPresente,
      );
      setPresente((actual) => ({ ...actual, [estudianteId]: nuevoPresente }));
      setAsistenciasMap((actual) => ({
        ...actual,
        [estudianteId]: actualizada,
      }));
      onAviso("Asistencia actualizada.");
    } catch (error) {
      onError(mensajeError(error));
    } finally {
      setEditandoId(null);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 sm:p-6">
      <h2 className="text-lg font-semibold">Tomar asistencia</h2>
      <p className="mt-1 text-sm text-slate-500">
        Marca presentes y ausentes. Si ya guardaste, puedes editar individualmente
        dentro de las 24 horas (RF-016).
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Clase
          </span>
          <select
            value={horarioId}
            disabled={cargandoClases}
            onChange={(event) => setHorarioId(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-sky-400 focus:ring-2"
          >
            {clases.length === 0 ? (
              <option value="">Sin clases asignadas</option>
            ) : null}
            {clases.map((item) => (
              <option key={item.id} value={item.id}>
                {item.deporte?.nombre ?? "Deporte"} · {etiquetaHorario(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Fecha
          </span>
          <input
            type="date"
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-sky-400 focus:ring-2"
          />
        </label>
      </div>

      {clase ? (
        <p className="mt-3 text-xs text-slate-500">
          {clase.deporte?.nombre} · {etiquetaHorario(clase)}
        </p>
      ) : (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No tienes horarios asignados. Un administrador debe publicarlos en
          Administración → Horarios.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={lista.length === 0}
          onClick={marcarTodosPresentes}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-50"
        >
          Marcar todos como presentes
        </button>
        <button
          type="button"
          disabled={guardando || lista.length === 0}
          onClick={() => void guardar()}
          className="rounded-full bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_-12px_rgba(56,189,248,0.9)] disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar asistencia"}
        </button>
      </div>

      {cargandoGrupo ? (
        <p className="mt-4 text-sm text-slate-500">Cargando estudiantes...</p>
      ) : lista.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
          No hay estudiantes inscritos en esta clase.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                <th className="px-2 py-2 font-medium">Estudiante</th>
                <th className="px-2 py-2 font-medium">Categoría</th>
                <th className="px-2 py-2 font-medium">Estado</th>
                <th className="px-2 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((fila) => {
                const id = fila.estudiante.id;
                const estaPresente = presente[id] ?? false;
                const previa = asistenciasMap[id];
                const puedeEditar =
                  previa && editableDentro24h(previa.fecha_registro);

                return (
                  <tr key={id} className="border-b border-slate-100">
                    <td className="px-2 py-3">
                      <p className="font-medium">{fila.estudiante.nombre}</p>
                      <p className="text-xs text-slate-500">
                        {fila.estudiante.correo}
                      </p>
                    </td>
                    <td className="px-2 py-3 text-slate-600">
                      {fila.estudiante.categoria ?? "—"}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          estaPresente
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {estaPresente ? "Presente" : "Ausente"}
                      </span>
                      {previa ? (
                        <p className="mt-1 text-[11px] text-slate-400">
                          {puedeEditar
                            ? "Editable (24 h)"
                            : "Fuera de ventana de edición"}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-slate-400">
                          Sin guardar
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-2">
                        {!previa ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPresente((actual) => ({
                                ...actual,
                                [id]: !estaPresente,
                              }))
                            }
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              estaPresente
                                ? "bg-slate-900 text-white"
                                : "border border-slate-300 text-slate-700"
                            }`}
                          >
                            {estaPresente ? "Presente" : "Ausente"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={!puedeEditar || editandoId === id}
                            onClick={() => void editarRapido(id, !estaPresente)}
                            className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
                          >
                            {editandoId === id
                              ? "..."
                              : puedeEditar
                                ? `Cambiar a ${estaPresente ? "ausente" : "presente"}`
                                : "Bloqueado"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
