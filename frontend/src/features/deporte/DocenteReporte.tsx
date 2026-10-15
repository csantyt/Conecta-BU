/**
 * Pantalla "Reporte final" del rol Docente (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Muestra el resumen de aprobación de un deporte (clases dictadas, aprobados,
 * reprobados, promedio) y permite descargar el mismo reporte en Excel. La
 * descarga pasa por una confirmación y los números vienen de la misma fuente
 * que la pantalla.
 */

import { useCallback, useEffect, useState } from "react";
import { descargarReporteExcelDocente, obtenerMisDeportesDocente, obtenerReporteDocente } from "../../api/deporte";
import type { MiDeporteDocente, ReporteDocente } from "../../types/deporte";
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, PageHeader, Select, Skeleton } from "./ui";
import { mensajeError } from "./utils";

type Props = {
  deporteInicial?: string;
  onAviso: (mensaje: string) => void;
  onError: (mensaje: string) => void;
};

function tonoEstado(estado: string): "neutral" | "success" | "warning" | "danger" {
  if (estado === "Al día") return "success";
  if (estado === "En riesgo") return "warning";
  if (estado === "Reprobaría") return "danger";
  return "neutral";
}

export default function DocenteReporte({ deporteInicial, onAviso, onError }: Props) {
  const [deportes, setDeportes] = useState<MiDeporteDocente[]>([]);
  const [deporteId, setDeporteId] = useState(deporteInicial ?? "");
  const [reporte, setReporte] = useState<ReporteDocente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [generando, setGenerando] = useState(false);

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
          setReporte(null);
          return;
        }
        setReporte(await obtenerReporteDocente(objetivo));
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

  async function descargar(): Promise<void> {
    if (!reporte) return;
    setGenerando(true);
    try {
      await descargarReporteExcelDocente(reporte.deporte.id, reporte.deporte.nombre);
      onAviso("Reporte descargado.");
      setConfirmar(false);
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setGenerando(false);
    }
  }

  if (cargando && !reporte && deportes.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error && !reporte) {
    return <ErrorState message={error} onRetry={() => void cargar(deporteId)} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporte final del curso"
        description="Aprueba quien alcanza el mínimo de asistencia configurado."
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="w-56">
          <Select label="Deporte" value={deporteId} onChange={(e) => setDeporteId(e.target.value)}>
            {deportes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="secondary" onClick={() => void cargar(deporteId)}>
          Actualizar
        </Button>
        {reporte ? (
          <Button disabled={generando} onClick={() => setConfirmar(true)}>
            Generar reporte (Excel)
          </Button>
        ) : null}
      </div>

      {!reporte ? (
        <EmptyState title="No hay deportes para reportar" />
      ) : (
        <>
          <Card className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{reporte.deporte.nombre}</p>
              <p className="text-xs text-slate-400">
                Docente: {reporte.docente} · Periodo: {reporte.periodo}
              </p>
            </div>
            <Badge tone={reporte.semestre_finalizado ? "success" : "warning"}>{reporte.tipo}</Badge>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Card>
              <p className="text-3xl font-semibold text-orange-300">{reporte.dictadas}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Clases dictadas</p>
            </Card>
            <Card>
              <p className="text-3xl font-semibold text-orange-300">{reporte.total_estudiantes}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Estudiantes</p>
            </Card>
            <Card>
              <p className="text-3xl font-semibold text-emerald-300">{reporte.aprobados}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Aprobados</p>
            </Card>
            <Card>
              <p className="text-3xl font-semibold text-rose-300">{reporte.reprobados}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Reprobados</p>
            </Card>
            <Card>
              <p className="text-3xl font-semibold text-orange-300">{reporte.promedio}%</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Asistencia promedio</p>
            </Card>
          </div>

          <p className="text-xs text-slate-400">
            Mínimo para aprobar: {reporte.minimo}%. Generado: {new Date(reporte.generado).toLocaleString("es-CO")}.
          </p>

          <Card className="overflow-x-auto p-0">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Estudiante</th>
                  <th className="px-4 py-3">Categoría</th>
                  <th className="px-4 py-3">Asistidas</th>
                  <th className="px-4 py-3">Faltas</th>
                  <th className="px-4 py-3">%</th>
                  <th className="px-4 py-3">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {reporte.estudiantes.map((estudiante) => (
                  <tr key={estudiante.estudiante_id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{estudiante.nombre}</p>
                      <p className="text-xs text-slate-400">{estudiante.correo ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-300">{estudiante.categoria ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">{estudiante.presentes}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">{estudiante.faltas}</td>
                    <td className="px-4 py-3 text-xs text-slate-300">
                      {estudiante.dictadas > 0 ? `${estudiante.porcentaje}%` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {estudiante.dictadas === 0 ? (
                        <Badge tone="warning">Sin clases registradas</Badge>
                      ) : (
                        <Badge tone={estudiante.aprobado ? "success" : "danger"}>
                          {estudiante.aprobado ? "Aprobó" : "Reprobó"}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-slate-400">Horarios</p>
            <div className="flex flex-wrap gap-2">
              {reporte.horarios.map((h, i) => (
                <Badge key={`${h.dia}-${h.hora_inicio}-${i}`}>
                  {h.dia} {h.hora_inicio.slice(0, 5)}–{h.hora_fin.slice(0, 5)} · {h.lugar}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmar}
        message="¿Generar el reporte final del deporte? Se descargará un archivo Excel con las hojas Resumen, Estudiantes y Asistencia por fecha."
        onConfirm={() => void descargar()}
        onCancel={() => setConfirmar(false)}
      />

      {reporte && reporte.estudiantes.some((e) => tonoEstado(e.estado) === "danger") ? (
        <p className="text-xs text-rose-300">
          Hay estudiantes en riesgo de reprobar por inasistencias.
        </p>
      ) : null}
    </div>
  );
}
