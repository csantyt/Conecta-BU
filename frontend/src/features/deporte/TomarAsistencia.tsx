import { useEffect, useMemo, useState } from "react";
import {
  guardarAsistenciaDocente,
  obtenerAsistenciasDocente,
  obtenerEstudiantesDeClase,
  obtenerMisClasesDocente,
} from "../../api/deporte";
import type { ClaseDocente, EstudianteDeClase } from "../../types/deporte";
import { etiquetaHorario, fechaLocal, mensajeError } from "./utils";

type TomarAsistenciaProps = {
  onAviso: (valor: string) => void;
  onError: (valor: string) => void;
};

export default function TomarAsistencia({
  onAviso,
  onError,
}: TomarAsistenciaProps) {
  const [clases, setClases] = useState<ClaseDocente[]>([]);
  const [horarioId, setHorarioId] = useState("");
  const [fecha, setFecha] = useState(fechaLocal(new Date()));
  const [estudiantes, setEstudiantes] = useState<EstudianteDeClase[]>([]);
  const [presente, setPresente] = useState<Record<string, boolean>>({});
  const [cargandoClases, setCargandoClases] = useState(true);
  const [cargandoGrupo, setCargandoGrupo] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const clase = clases.find((item) => item.id === horarioId);

  const lista = useMemo(
    () =>
      estudiantes.filter(
        (item): item is EstudianteDeClase & { estudiante: NonNullable<EstudianteDeClase["estudiante"]> } =>
          Boolean(item.estudiante),
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

  useEffect(() => {
    if (!horarioId || !fecha) {
      setEstudiantes([]);
      setPresente({});
      return;
    }

    let activo = true;
    setCargandoGrupo(true);
    void Promise.all([
      obtenerEstudiantesDeClase(horarioId),
      obtenerAsistenciasDocente(fecha),
    ])
      .then(([grupo, asistencias]) => {
        if (!activo) {
          return;
        }
        setEstudiantes(grupo.estudiantes);
        const deEstaClase = asistencias.filter(
          (item) => item.horario_id === horarioId,
        );
        const mapa: Record<string, boolean> = {};
        for (const fila of grupo.estudiantes) {
          if (!fila.estudiante) {
            continue;
          }
          const previa = deEstaClase.find(
            (item) => item.estudiante_id === fila.estudiante?.id,
          );
          mapa[fila.estudiante.id] = previa?.presente ?? false;
        }
        setPresente(mapa);
      })
      .catch((error) => onError(mensajeError(error)))
      .finally(() => {
        if (activo) {
          setCargandoGrupo(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [horarioId, fecha, onError]);

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
      await guardarAsistenciaDocente({
        horarioId,
        fecha,
        estudiantes: lista.map((fila) => ({
          estudianteId: fila.estudiante.id,
          presente: presente[fila.estudiante.id] ?? false,
        })),
      });
      onAviso("Asistencia guardada.");
    } catch (error) {
      onError(mensajeError(error));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 sm:p-6">
      <h2 className="text-lg font-semibold">Tomar asistencia</h2>
      <p className="mt-1 text-sm text-slate-500">
        Marca presentes y ausentes del grupo y guarda el registro del día.
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
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={lista.length === 0}
          onClick={marcarTodosPresentes}
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
        >
          Marcar todos como presentes
        </button>
        <button
          type="button"
          disabled={guardando || lista.length === 0}
          onClick={() => void guardar()}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
                <th className="px-2 py-2 text-right font-medium">Asistencia</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((fila) => {
                const id = fila.estudiante.id;
                const estaPresente = presente[id] ?? false;
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
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex justify-end gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={estaPresente}
                            onChange={(event) =>
                              setPresente((actual) => ({
                                ...actual,
                                [id]: event.target.checked,
                              }))
                            }
                            className="h-4 w-4 accent-slate-900"
                          />
                          Presente
                        </label>
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
                          {estaPresente ? "Sí" : "No"}
                        </button>
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
