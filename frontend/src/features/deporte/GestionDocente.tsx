import { useEffect, useState } from "react";
import {
  actualizarDeporteGestion,
  actualizarEstudianteGestion,

  crearHorarioGestion,
  eliminarDeporteGestion,
  eliminarEstudianteGestion,
  eliminarHorarioGestion,
  listarEstudiantesGestion,
  obtenerCatalogoDeportes,
  obtenerHorariosAdmin,
} from "../../api/deporte";
import { mensajeError } from "./utils";

type Estudiante = {
  id: string;
  nombre: string;
  correo: string;
  categoria: string | null;
  estado: boolean;
  documento?: string | null;
};

type Deporte = {
  id: string;
  nombre: string;
  descripcion: string | null;
  cupo_maximo: number;
  estado: boolean;
};

type Horario = {
  id: string;
  deporte_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  estado: boolean;
};

export default function GestionDocente({
  onAviso,
  onError,
}: {
  onAviso: (valor: string) => void;
  onError: (valor: string) => void;
}) {
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [filtro, setFiltro] = useState("");
  const [cargando, setCargando] = useState(true);

  async function cargar() {
    setCargando(true);
    try {
      const cat = await obtenerCatalogoDeportes();
      setDeportes(cat.deportes as unknown as Deporte[]);
      const est = await listarEstudiantesGestion();
      setEstudiantes(est as Estudiante[]);
      const hor = await obtenerHorariosAdmin();
      setHorarios(hor as unknown as Horario[]);
    } catch (error) {
      onError(mensajeError(error));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargar();
  }, []);

  async function editarEstudiante(item: Estudiante) {
    const nuevoNombre = window.prompt("Nombre", item.nombre);
    if (nuevoNombre === null) return;
    try {
      await actualizarEstudianteGestion(item.id, { ...item, nombre: nuevoNombre });
      onAviso("Estudiante actualizado.");
      await cargar();
    } catch (error) {
      onError(mensajeError(error));
    }
  }

  async function eliminar(row: Estudiante) {
    if (!window.confirm(`¿Desactivar a ${row.nombre}?`)) return;
    try {
      await eliminarEstudianteGestion(row.id);
      onAviso("Estudiante desactivado (soft delete).");
      await cargar();
    } catch (error) {
      onError(mensajeError(error));
    }
  }

  async function editarDeporte(row: Deporte) {
    const nuevoNombre = window.prompt("Nombre del deporte", row.nombre);
    if (nuevoNombre === null) return;
    try {
      await actualizarDeporteGestion(row.id, { ...row, nombre: nuevoNombre });
      onAviso("Deporte actualizado.");
      await cargar();
    } catch (error) {
      onError(mensajeError(error));
    }
  }

  async function eliminarDeporte(row: Deporte) {
    if (!window.confirm(`¿Desactivar el deporte ${row.nombre}?`)) return;
    try {
      await eliminarDeporteGestion(row.id);
      onAviso("Deporte desactivado.");
      await cargar();
    } catch (error) {
      onError(mensajeError(error));
    }
  }

  async function crearHorario(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await crearHorarioGestion({
        deporte_id: fd.get("deporte_id"),
        dia_semana: Number(fd.get("dia_semana")),
        hora_inicio: fd.get("hora_inicio"),
        hora_fin: fd.get("hora_fin"),
        lugar: fd.get("lugar"),
      });
      onAviso("Horario creado.");
      form.reset();
      await cargar();
    } catch (error) {
      onError(mensajeError(error));
    }
  }

  if (cargando) return <p className="mt-4 text-sm text-slate-500">Cargando gestión...</p>;

  const estudiantesFiltrados = estudiantes.filter((row) =>
    `${row.nombre} ${row.correo}`.toLowerCase().includes(filtro.toLowerCase()),
  );

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900">
        <h2 className="text-lg font-semibold">Gestión Docente</h2>
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Filtrar estudiantes por nombre o correo..."
          className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2"
        />

        <h3 className="mt-5 font-semibold">Estudiantes inscritos</h3>
        <table className="mt-2 min-w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs uppercase text-slate-500">
              <th className="py-2">Nombre</th>
              <th className="py-2">Correo</th>
              <th className="py-2">Categoría</th>
              <th className="py-2">Estado</th>
              <th className="py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {estudiantesFiltrados.map((row) => (
              <tr key={row.id} className="border-b border-slate-100">
                <td className="py-2">{row.nombre}</td>
                <td className="py-2 text-xs text-slate-500">{row.correo}</td>
                <td className="py-2">{row.categoria ?? "—"}</td>
                <td className="py-2">{row.estado ? "Activo" : "Inactivo"}</td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    onClick={() => void editarEstudiante(row)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => void eliminar(row)}
                    className="ml-2 rounded-full bg-rose-600 px-3 py-1 text-xs text-white"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 className="mt-6 font-semibold">Deportes</h3>
        <div className="mt-2 space-y-2">
          {deportes.map((row) => (
            <div key={row.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2">
              <div>
                <p className="font-medium">{row.nombre}</p>
                <p className="text-xs text-slate-500">{row.descripcion ?? "Sin descripción"}</p>
              </div>
              <div className="space-x-2">
                <button type="button" onClick={() => void editarDeporte(row)} className="rounded-full border px-3 py-1 text-xs">
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => void eliminarDeporte(row)}
                  className="rounded-full bg-rose-600 px-3 py-1 text-xs text-white"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        <h3 className="mt-6 font-semibold">Crear programa / horario</h3>
        <form onSubmit={(e) => void crearHorario(e)} className="mt-2 grid gap-3 sm:grid-cols-2">
          <select name="deporte_id" className="rounded-xl border border-slate-200 px-3 py-2" required>
            <option value="">Deporte</option>
            {deportes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
          <select name="dia_semana" className="rounded-xl border border-slate-200 px-3 py-2" required>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                Día {d}
              </option>
            ))}
          </select>
          <input name="hora_inicio" type="time" className="rounded-xl border border-slate-200 px-3 py-2" required />
          <input name="hora_fin" type="time" className="rounded-xl border border-slate-200 px-3 py-2" required />
          <input name="lugar" placeholder="Lugar / sede" className="rounded-xl border border-slate-200 px-3 py-2 sm:col-span-2" required />
          <button type="submit" className="rounded-full bg-slate-900 px-4 py-2 text-white sm:col-span-2">
            Crear horario / programa
          </button>
        </form>

        <h3 className="mt-6 font-semibold">Horarios actuales</h3>
        <div className="mt-2 space-y-2">
          {horarios.map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-2 text-xs">
              <div>
                <p className="font-medium">Día {h.dia_semana} · {h.hora_inicio} - {h.hora_fin}</p>
                <p className="text-slate-500">{h.lugar}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm("¿Eliminar horario?")) return;
                  try {
                    await eliminarHorarioGestion(h.id);
                    onAviso("Horario eliminado.");
                    await cargar();
                  } catch (error) {
                    onError(mensajeError(error));
                  }
                }}
                className="rounded-full bg-rose-600 px-3 py-1 text-white"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}