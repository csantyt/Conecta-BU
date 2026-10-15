/**
 * Pantalla "Mis estudiantes" del rol Docente (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Muestra los estudiantes con inscripción activa en cada deporte del docente,
 * con su porcentaje de asistencia y su estado (Al día / En riesgo / Reprobaría).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { obtenerEstudiantesDeporteDocente, obtenerMisDeportesDocente } from "../../api/deporte";
import type { EstudianteDeporteDocente, MiDeporteDocente } from "../../types/deporte";
import { Badge, Card, EmptyState, ErrorState, PageHeader, SearchBar, Select, Skeleton } from "./ui";
import { mensajeError } from "./utils";

type Props = {
  deporteInicial?: string;
  onError: (mensaje: string) => void;
};

function tonoEstado(estado: string): "neutral" | "success" | "warning" | "danger" {
  if (estado === "Al día") return "success";
  if (estado === "En riesgo") return "warning";
  if (estado === "Reprobaría") return "danger";
  return "neutral";
}

export default function DocenteEstudiantes({ deporteInicial, onError }: Props) {
  const [deportes, setDeportes] = useState<MiDeporteDocente[]>([]);
  const [deporteId, setDeporteId] = useState(deporteInicial ?? "");
  const [estudiantes, setEstudiantes] = useState<EstudianteDeporteDocente[]>([]);
  const [dictadas, setDictadas] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");

  const cargar = useCallback(
    async (id: string) => {
      setCargando(true);
      setError(null);
      try {
        const misDeportes = await obtenerMisDeportesDocente();
        setDeportes(misDeportes);
        const objetivo = id || misDeportes[0]?.id || "";
        if (!id && objetivo) setDeporteId(objetivo);
        if (!objetivo) {
          setEstudiantes([]);
          setDictadas(0);
          return;
        }
        const data = await obtenerEstudiantesDeporteDocente(objetivo);
        setEstudiantes(data.estudiantes);
        setDictadas(data.dictadas);
      } catch (err) {
        const mensaje = mensajeError(err);
        setError(mensaje);
        onError(mensaje);
      } finally {
        setCargando(false);
      }
    },
    [onError],
  );

  useEffect(() => {
    void cargar(deporteInicial ?? "");
  }, [cargar, deporteInicial]);

  const filtrados = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return estudiantes.filter((e) => {
      const coincideTexto =
        texto.length === 0 ||
        e.nombre.toLowerCase().includes(texto) ||
        (e.documento ?? "").toLowerCase().includes(texto);
      const coincideCategoria = categoria === "" || e.categoria === categoria;
      return coincideTexto && coincideCategoria;
    });
  }, [estudiantes, q, categoria]);

  if (cargando && estudiantes.length === 0 && deportes.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error && deportes.length === 0) {
    return <ErrorState message={error} onRetry={() => void cargar(deporteId)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis estudiantes"
        description="Estudiantes inscritos y su porcentaje de asistencia por deporte."
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="w-56">
          <Select label="Deporte" value={deporteId} onChange={(e) => { setDeporteId(e.target.value); }}>
            {deportes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <Select label="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas</option>
            <option value="Pregrado">Pregrado</option>
            <option value="Postgrado">Postgrado</option>
            <option value="Egresado">Egresado</option>
          </Select>
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="block text-xs text-slate-300">
            <span className="mb-1 block">Buscar</span>
            <SearchBar value={q} onChange={setQ} placeholder="Nombre o documento" />
          </label>
        </div>
        <button
          type="button"
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200"
          onClick={() => void cargar(deporteId)}
        >
          Actualizar
        </button>
      </div>

      <p className="text-xs text-slate-400">
        {dictadas > 0 ? `${dictadas} clases registradas en el deporte.` : "Aún no hay clases registradas en el deporte."}
      </p>

      {filtrados.length === 0 ? (
        <EmptyState
          title="Sin estudiantes para mostrar"
          description="Ajusta los filtros o revisa otra disciplina."
        />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Estudiante</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Asistencia</th>
                <th className="px-4 py-3">%</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filtrados.map((estudiante) => (
                <tr key={estudiante.estudiante_id}>
                  <td className="px-4 py-3">
                    <p className="font-medium">{estudiante.nombre}</p>
                    <p className="text-xs text-slate-400">{estudiante.correo ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">{estudiante.documento ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">{estudiante.categoria ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {estudiante.presentes}/{estudiante.dictadas}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300">
                    {estudiante.dictadas > 0 ? `${estudiante.porcentaje}%` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={tonoEstado(estudiante.estado)}>{estudiante.estado}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
