import { useEffect, useState } from "react";
import { obtenerDashboardAdmin, obtenerResumenPisu } from "../../api/deporte";
import type { ResumenPisu } from "../../types/deporte";
import { mensajeError } from "./utils";

type Props = {
  onError: (v: string) => void;
};

export default function DashboardAdmin({ onError }: Props) {
  const [resumen, setResumen] = useState<ResumenPisu | null>(null);
  const [dashboard, setDashboard] = useState<{
    docentesActivos: number;
    estudiantesPorCategoria: { Pregrado: number; Postgrado: number; Egresado: number };
    totalEstudiantes: number;
    deportes: Array<{ id: string; nombre: string; cupo_maximo: number; inscritos: number; ocupacion: number }>;
    deporteMasOcupado: { nombre: string; ocupacion: number } | null;
    deporteMenosOcupado: { nombre: string; ocupacion: number } | null;
  } | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    void Promise.all([obtenerResumenPisu(), obtenerDashboardAdmin()])
      .then(([r, d]) => {
        setResumen(r);
        setDashboard(d as typeof dashboard);
      })
      .catch((err) => onError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, [onError]);

  const totalCupos = (dashboard?.deportes ?? []).reduce((a, d) => a + d.cupo_maximo, 0);
  const totalInscritos = (dashboard?.deportes ?? []).reduce((a, d) => a + d.inscritos, 0);
  const ocupacionGlobal = totalCupos > 0 ? Math.round((totalInscritos / totalCupos) * 100) : 0;

  const cards = resumen
    ? [
        ["Usuarios PISU", resumen.usuarios, "text-sky-300"],
        ["Deportes activos", resumen.deportes_activos, "text-emerald-300"],
        ["Inscripciones", resumen.inscripciones_activas, "text-cyan-300"],
        ["Horarios", resumen.horarios_activos, "text-violet-300"],
        ["Eventos", resumen.eventos_activos, "text-amber-300"],
        ["Asistencias", resumen.asistencias, "text-rose-300"],
        ["Alertas", resumen.alertas, "text-slate-200"],
        ["Docentes activos", dashboard?.docentesActivos ?? 0, "text-orange-300"],
        ["Ocupacion global (%)", `${ocupacionGlobal}%`, "text-orange-300"],
      ]
    : [];

  return (
    <section className="space-y-6">
      {cargando ? (
        <p className="text-sm text-slate-400">Cargando metricas...</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(([label, valor, color]) => (
              <article key={String(label)} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] p-5">
                <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
                <p className={`mt-2 text-3xl font-semibold tabular-nums ${color}`}>{valor}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold">Cupos vs Inscritos por deporte</h3>
              <div className="mt-4 space-y-3">
                {(dashboard?.deportes ?? []).length === 0 ? (
                  <p className="text-xs text-slate-400">Sin datos. Todo se muestra en cero.</p>
                ) : (
                  (dashboard?.deportes ?? []).map((d) => (
                    <div key={d.id}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                        <span>{d.nombre}</span>
                        <span>{d.inscritos}/{d.cupo_maximo}</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/10">
                        <div className="h-3 rounded-full bg-sky-400" style={{ width: `${Math.min(100, d.cupo_maximo > 0 ? (d.inscritos / d.cupo_maximo) * 100 : 0)}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold">Estudiantes por categoria</h3>
              <div className="mt-4 space-y-3">
                {(["Pregrado", "Postgrado", "Egresado"] as const).map((cat) => {
                  const val = dashboard?.estudiantesPorCategoria?.[cat] ?? 0;
                  const max = Math.max(1, dashboard?.totalEstudiantes ?? 1);
                  return (
                    <div key={cat}>
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
                        <span>{cat}</span>
                        <span>{val}</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/10">
                        <div className="h-3 rounded-full bg-orange-400" style={{ width: `${Math.min(100, (val / max) * 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400">Deporte mas ocupado</p>
              <p className="mt-2 text-xl font-semibold text-emerald-300">
                {dashboard?.deporteMasOcupado?.nombre ?? "Sin datos"}
              </p>
              <p className="text-xs text-slate-400">
                {dashboard?.deporteMasOcupado ? `${dashboard.deporteMasOcupado.ocupacion}%` : "—"}
              </p>
            </article>
            <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs uppercase tracking-wide text-slate-400">Deporte menos ocupado</p>
              <p className="mt-2 text-xl font-semibold text-sky-300">
                {dashboard?.deporteMenosOcupado?.nombre ?? "Sin datos"}
              </p>
              <p className="text-xs text-slate-400">
                {dashboard?.deporteMenosOcupado ? `${dashboard.deporteMenosOcupado.ocupacion}%` : "—"}
              </p>
            </article>
          </div>
        </>
      )}
    </section>
  );
}