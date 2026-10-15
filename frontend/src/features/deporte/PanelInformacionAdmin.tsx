import { useEffect, useState } from "react";
import { obtenerAlertasAdmin, obtenerDashboardAdmin, obtenerDeportesAdmin, obtenerEventosAdmin, obtenerHorariosAdmin, obtenerResumenPisu } from "../../api/deporte";
import type { AlertaPisu, DeportePisu, EventoPisu, HorarioAdminPisu, ResumenPisu } from "../../types/deporte";
import { mensajeError } from "./utils";

type DashboardAdminData = {
  docentesActivos: number;
  estudiantesPorCategoria: { Pregrado: number; Postgrado: number; Egresado: number };
  totalEstudiantes: number;
  deportes: Array<{ id: string; nombre: string; cupo_maximo: number; inscritos: number; ocupacion: number }>;
  deporteMasOcupado: { nombre: string; ocupacion: number } | null;
  deporteMenosOcupado: { nombre: string; ocupacion: number } | null;
  inscripciones30Dias?: Array<{ fecha: string; total: number }>;
};

type Props = {
  deportes: DeportePisu[];
  usuario: { nombre_completo?: string; email: string };
  onError: (v: string) => void;
  onNavegar: (v: string) => void;
};

export default function PanelInformacionAdmin({ usuario, onError, onNavegar }: Props) {
  const [resumen, setResumen] = useState<ResumenPisu | null>(null);
  const [dashboard, setDashboard] = useState<DashboardAdminData | null>(null);
  const [alertas, setAlertas] = useState<AlertaPisu[]>([]);
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [horarios, setHorarios] = useState<HorarioAdminPisu[]>([]);
  const [deportesAdmin, setDeportesAdmin] = useState<DeportePisu[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    void Promise.all([
      obtenerResumenPisu(),
      obtenerDashboardAdmin(),
      obtenerAlertasAdmin(),
      obtenerEventosAdmin(),
      obtenerHorariosAdmin(),
      obtenerDeportesAdmin(),
    ]).then(([r, d, a, ev, h, dep]) => {
      setResumen(r as ResumenPisu);
      setDashboard(d as DashboardAdminData);
      setAlertas(a as AlertaPisu[]);
      setEventos(ev as EventoPisu[]);
      setHorarios(h as HorarioAdminPisu[]);
      setDeportesAdmin(dep as DeportePisu[]);
    }).catch((err) => onError(mensajeError(err))).finally(() => setCargando(false));
  }, [onError]);

  const horariosPorDeporte = (id: string) => horarios.filter((h) => h.deporte?.id === id || h.deporte_id === id);
  const deportesSinHorario = deportesAdmin.filter((d) => d.estado && horariosPorDeporte(d.id).length === 0);
  const deportesAlta = (dashboard?.deportes ?? []).filter((d) => d.ocupacion >= 90);
  const deportesSinInscritos = (dashboard?.deportes ?? []).filter((d) => d.inscritos === 0);
  const ahora = new Date();
  const en7 = new Date(ahora.getTime() + 7 * 86400000);
  const eventosProximos = (eventos ?? []).filter((e) => e.estado && new Date(e.fecha) >= ahora && new Date(e.fecha) <= en7);
  const alertasAtencion = [
    ...deportesSinHorario.map((d) => ({ texto: `Deporte ${d.nombre} sin horarios asignados`, accion: "horarios" })),
    ...deportesAlta.map((d) => ({ texto: `Deporte ${d.nombre} con ocupación ${d.ocupacion}%`, accion: "deportes" })),
    ...deportesSinInscritos.map((d) => ({ texto: `Deporte ${d.nombre} sin inscritos`, accion: "deportes" })),
    ...eventosProximos.map((e) => ({ texto: `Evento próximo: ${e.nombre}`, accion: "eventos" })),
  ];

  const totalCupos = (dashboard?.deportes ?? []).reduce((a, d) => a + d.cupo_maximo, 0);
  const totalInscritos = (dashboard?.deportes ?? []).reduce((a, d) => a + d.inscritos, 0);
  const ocupacionGlobal = totalCupos > 0 ? Math.round((totalInscritos / totalCupos) * 100) : 0;

  const disponibles = [...(dashboard?.deportes ?? [])].sort((a, b) => a.ocupacion - b.ocupacion).slice(0, 3);
  const masOcupados = [...(dashboard?.deportes ?? [])].sort((a, b) => b.ocupacion - a.ocupacion).slice(0, 3);

  return (
    <section className="space-y-6">
      <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h1 className="text-xl font-semibold">Hola, {usuario.nombre_completo || usuario.email}</h1>
        <p className="mt-1 text-sm text-slate-400">{new Date().toLocaleDateString("es-CO", { dateStyle: "full" })}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="banda-uni rounded-full px-4 py-2 text-sm font-bold text-uni-noche" onClick={() => onNavegar("deportes")}>Crear deporte</button>
          <button className="rounded-full border border-white/15 px-4 py-2 text-sm" onClick={() => onNavegar("docentes")}>Crear docente</button>
          <button className="rounded-full border border-white/15 px-4 py-2 text-sm" onClick={() => onNavegar("eventos")}>Crear evento</button>
          <button className="rounded-full border border-white/15 px-4 py-2 text-sm" onClick={() => onNavegar("comunicados")}>Enviar comunicado</button>
        </div>
      </article>

      <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Requiere tu atención</h2>
        {alertasAtencion.length === 0 ? (
          <p className="mt-3 text-sm text-emerald-300">Todo en orden. No hay alertas pendientes.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {alertasAtencion.map((a, idx) => (
              <li key={idx} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2 text-sm">
                <span>{a.texto}</span>
                <button className="text-xs text-sky-300" onClick={() => onNavegar(a.accion)}>Resolver</button>
              </li>
            ))}
          </ul>
        )}
      </article>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Deportes activos", dashboard?.deportes.length ?? 0],
          ["Eventos próximos 7d", eventosProximos.length],
          ["Docentes activos", dashboard?.docentesActivos ?? 0],
          ["Estudiantes registrados", dashboard?.totalEstudiantes ?? 0],
          ["Ocupación global (%)", `${ocupacionGlobal}%`],
          ["Inscritos vs sin inscripción", `${resumen?.inscripciones_activas ?? 0} / ${Math.max(0, (dashboard?.totalEstudiantes ?? 0))}`],
          ["Inscripciones últimos 7d", resumen ? (resumen.inscripciones_activas ?? 0) : 0],
        ].map(([label, val]) => (
          <article key={String(label)} className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-100">{val}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold">Ocupación por deporte</h3>
          <div className="mt-4 space-y-3">
            {(dashboard?.deportes ?? []).length === 0 ? <p className="text-xs text-slate-400">Sin datos.</p> : (dashboard?.deportes ?? []).map((d) => (
              <div key={d.id}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-300"><span>{d.nombre}</span><span>{d.inscritos}/{d.cupo_maximo}</span></div>
                <div className="h-3 rounded-full bg-white/10"><div className="h-3 rounded-full bg-sky-400" style={{ width: `${Math.min(100, d.ocupacion)}%` }} /></div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold">Estudiantes por categoría</h3>
          <div className="mt-4 space-y-3">
            {(["Pregrado", "Postgrado", "Egresado"] as const).map((cat) => {
              const val = dashboard?.estudiantesPorCategoria?.[cat] ?? 0;
              const max = Math.max(1, dashboard?.totalEstudiantes ?? 1);
              return <div key={cat}>
                <div className="mb-1 flex items-center justify-between text-xs text-slate-300"><span>{cat}</span><span>{val}</span></div>
                <div className="h-3 rounded-full bg-white/10"><div className="h-3 rounded-full bg-orange-400" style={{ width: `${Math.min(100, (val / max) * 100)}%` }} /></div>
              </div>;
            })}
          </div>
        </article>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold">Top 3 más ocupados</h3>
          <ul className="mt-3 space-y-2">{masOcupados.map((d) => <li key={d.id} className="text-sm">{d.nombre} · {d.ocupacion}%</li>)}</ul>
        </article>
        <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <h3 className="text-sm font-semibold">Top 3 con más cupos libres</h3>
          <ul className="mt-3 space-y-2">{disponibles.map((d) => <li key={d.id} className="text-sm">{d.nombre} · {d.cupo_maximo - d.inscritos} disponibles</li>)}</ul>
        </article>
      </div>

      <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold">Últimos comunicados</h3>
        {alertas.length === 0 ? <p className="mt-3 text-sm text-slate-400">No hay comunicados.</p> : <ul className="mt-3 space-y-2">{alertas.slice(0, 5).map((a) => <li key={a.id} className="text-sm">{a.titulo}</li>)}</ul>}
      </article>

      <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold">Evolución de inscripciones en 30 días</h3>
        <div className="mt-4 flex items-end gap-1 h-24">
          {(dashboard?.inscripciones30Dias ?? []).map((d, idx) => {
            const max = Math.max(1, ...(dashboard?.inscripciones30Dias ?? []).map((x) => x.total));
            return <div key={idx} className="flex-1 bg-orange-400/80 rounded-t" style={{ height: `${(d.total / max) * 100}%` }} title={`${d.fecha}: ${d.total}`} />;
          })}
        </div>
      </article>
      {cargando ? <p className="text-sm text-slate-400">Cargando...</p> : null}
    </section>
  );
}