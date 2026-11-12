import { useEffect, useState } from "react";
import {
  actualizarEstudianteAdmin,
  listarEstudiantesAdmin,
} from "../../api/deporte";
import { mensajeError } from "./utils";

type Estudiante = {
  id: string;
  nombre: string;
  correo: string;
  documento?: string | null;
  categoria: string | null;
  estado: boolean;
};

type Props = {
  onAviso: (v: string, accion?: string) => void;
  onError: (v: string) => void;
};

export default function GestionEstudiantes({ onAviso, onError }: Props) {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [cargando, setCargando] = useState(true);

  async function recargar() {
    setCargando(true);
    try {
      const data = await listarEstudiantesAdmin();
      setEstudiantes(data);
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void recargar();
  }, []);

  async function onChangeCategoria(id: string, categoria: string) {
    try {
      await actualizarEstudianteAdmin(id, { categoria });
      onAviso("Categoría actualizada.", "estudiantes");
      await recargar();
    } catch (err) {
      onError(mensajeError(err));
    }
  }

  const filtrados = estudiantes.filter((e) => {
    const q = busqueda.trim().toLowerCase();
    const pasaBusqueda =
      !q ||
      e.nombre.toLowerCase().includes(q) ||
      (e.documento ?? "").toLowerCase().includes(q);
    const pasaCategoria = !categoriaFiltro || e.categoria === categoriaFiltro;
    return pasaBusqueda && pasaCategoria;
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
          placeholder="Buscar por nombre o documento"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          <option value="Pregrado">Pregrado</option>
          <option value="Postgrado">Postgrado</option>
          <option value="Egresado">Egresado</option>
        </select>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando estudiantes...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-slate-400">No hay estudiantes registrados.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Categoría</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((e) => (
                <tr key={e.id} className="border-t border-white/5">
                  <td className="px-4 py-3">{e.nombre}</td>
                  <td className="px-4 py-3 text-slate-300">{e.documento ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{e.correo}</td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-white/15 bg-slate-950 px-2 py-1 text-xs text-white"
                      value={e.categoria ?? "Pregrado"}
                      onChange={(ev) =>
                        void onChangeCategoria(e.id, ev.target.value)
                      }
                    >
                      <option value="Pregrado">Pregrado</option>
                      <option value="Postgrado">Postgrado</option>
                      <option value="Egresado">Egresado</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}