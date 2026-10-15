/**
 * Pantalla "Historial de asistencia" del rol Docente (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Muestra las sesiones ya registradas (fecha, deporte, presentes/ausentes) y
 * permite alternar a una MATRIZ de estudiantes por fechas. Desde una sesión se
 * puede abrir la edición si aún está dentro de las 24 horas.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { obtenerHistorialDocente, obtenerMisDeportesDocente } from "../../api/deporte";
import type { MiDeporteDocente, SesionHistorialDocente } from "../../types/deporte";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Select, Skeleton } from "./ui";
import { horaCorta, mensajeError } from "./utils";

type Props = {
  onError: (mensaje: string) => void;
  onNavegar: (vista: string) => void;
};

export default function DocenteHistorial({ onError, onNavegar }: Props) {
  const [deportes, setDeportes] = useState<MiDeporteDocente[]>([]);
  const [deporteId, setDeporteId] = useState("");
  const [sesiones, setSesiones] = useState<SesionHistorialDocente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modo, setModo] = useState<"lista" | "matriz">("lista");
  const [abierta, setAbierta] = useState<string | null>(null);

  const cargar = useCallback(
    async (filtro: string) => {
      setCargando(true);
      setError(null);
      try {
        const [misDeportes, historial] = await Promise.all([
          obtenerMisDeportesDocente(),
          obtenerHistorialDocente(filtro || undefined),
        ]);
        setDeportes(misDeportes);
        setSesiones(historial);
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
    void cargar(deporteId);
  }, [cargar, deporteId]);

  const matriz = useMemo(() => {
    const columnas = [...new Set(sesiones.map((s) => `${s.horario_id}|${s.fecha}`))].sort((a, b) =>
      a.localeCompare(b),
    );
    const filas = new Map<string, { nombre: string; marcas: Record<string, boolean> }>();
    for (const sesion of sesiones) {
      const clave = `${sesion.horario_id}|${sesion.fecha}`;
      for (const detalle of sesion.detalle) {
        if (!filas.has(detalle.estudiante_id)) {
          filas.set(detalle.estudiante_id, { nombre: detalle.nombre, marcas: {} });
        }
        filas.get(detalle.estudiante_id)!.marcas[clave] = detalle.presente;
      }
    }
    return { columnas, filas: [...filas.entries()] };
  }, [sesiones]);

  if (cargando && sesiones.length === 0 && deportes.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error && sesiones.length === 0) {
    return <ErrorState message={error} onRetry={() => void cargar(deporteId)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de asistencia"
        description="Sesiones registradas, con detalle por estudiante y matriz por fecha."
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="w-64">
          <Select
            label="Deporte"
            value={deporteId}
            onChange={(e) => setDeporteId(e.target.value)}
          >
            <option value="">Todos mis deportes</option>
            {deportes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </Select>
        </div>
        <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-xs">
          <button
            type="button"
            onClick={() => setModo("lista")}
            className={`rounded-full px-4 py-1.5 font-semibold ${modo === "lista" ? "bg-white/15 text-white" : "text-slate-300"}`}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => setModo("matriz")}
            className={`rounded-full px-4 py-1.5 font-semibold ${modo === "matriz" ? "bg-white/15 text-white" : "text-slate-300"}`}
          >
            Matriz
          </button>
        </div>
      </div>

      {sesiones.length === 0 ? (
        <EmptyState
          title="Todavía no has registrado asistencia"
          description="Cuando llames a lista aparecerá aquí cada sesión."
        />
      ) : modo === "lista" ? (
        <div className="space-y-3">
          {sesiones.map((sesion) => {
            const clave = `${sesion.horario_id}|${sesion.fecha}`;
            const expandida = abierta === clave;
            return (
              <Card key={clave} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold capitalize">{sesion.fecha_larga}</p>
                    <p className="text-xs text-slate-400">
                      {sesion.deporte.nombre} · {horaCorta(sesion.hora_inicio)}–{horaCorta(sesion.hora_fin)} · {sesion.lugar}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="success">{sesion.presentes} P</Badge>
                    <Badge tone="danger">{sesion.ausentes} A</Badge>
                    <Badge>{sesion.porcentaje}%</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setAbierta(expandida ? null : clave)}>
                    {expandida ? "Ocultar detalle" : "Ver detalle"}
                  </Button>
                  {sesion.puede_editar ? (
                    <Button onClick={() => onNavegar(`lista:${sesion.horario_id}:${sesion.fecha}`)}>
                      Editar
                    </Button>
                  ) : null}
                </div>
                {expandida ? (
                  <ul className="divide-y divide-white/10 rounded-xl border border-white/10">
                    {sesion.detalle.map((detalle) => (
                      <li key={detalle.asistencia_id} className="flex items-center justify-between px-3 py-2 text-xs">
                        <span>{detalle.nombre}</span>
                        <Badge tone={detalle.presente ? "success" : "danger"}>
                          {detalle.presente ? "Presente" : "Ausente"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-xs">
            <thead className="bg-white/5 text-left">
              <tr>
                <th className="sticky left-0 bg-slate-900 px-3 py-2">Estudiante</th>
                {matriz.columnas.map((clave) => (
                  <th key={clave} className="px-3 py-2 text-center">
                    {clave.split("|")[1]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matriz.filas.map(([id, fila]) => (
                <tr key={id} className="border-t border-white/10">
                  <td className="sticky left-0 bg-slate-900 px-3 py-2">{fila.nombre}</td>
                  {matriz.columnas.map((clave) => {
                    const marca = fila.marcas[clave];
                    return (
                      <td key={clave} className="px-3 py-2 text-center">
                        <span
                          className={
                            marca === undefined
                              ? "text-slate-600"
                              : marca
                                ? "font-bold text-emerald-300"
                                : "font-bold text-rose-300"
                          }
                        >
                          {marca === undefined ? "—" : marca ? "P" : "A"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
