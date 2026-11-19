import { useEffect, useState } from "react";
import { obtenerAlertasAdmin, obtenerDashboardAdmin, obtenerDeportesAdmin, obtenerEventosAdmin, obtenerHorariosAdmin, obtenerResumenPisu, obtenerVerificacion } from "../../api/deporte";
import type { AlertaPisu, DeportePisu, EventoPisu, HorarioAdminPisu, ResumenPisu } from "../../types/deporte";
import PanelHero from "./PanelHero";
import { Badge, Button, Card, Icon, ProgressBar, Spinner, StatCard } from "./ui";
import { mensajeError } from "./utils";

type DashboardAdminData = {
  docentesActivos: number;
  estudiantesPorCategoria: { Pregrado: number; Postgrado: number; Egresado: number };
  totalEstudiantes: number;
  deportes: Array<{ id: string; nombre: string; cupo_maximo: number; inscritos: number; ocupacion: number; estado: boolean }>;
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

const TITULO_SECCION =
  "flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300";

export default function PanelInformacionAdmin({ usuario, onError, onNavegar }: Props) {
  const [resumen, setResumen] = useState<ResumenPisu | null>(null);
  const [dashboard, setDashboard] = useState<DashboardAdminData | null>(null);
  const [alertas, setAlertas] = useState<AlertaPisu[]>([]);
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [horarios, setHorarios] = useState<HorarioAdminPisu[]>([]);
  const [deportesAdmin, setDeportesAdmin] = useState<DeportePisu[]>([]);
  const [verificacion, setVerificacion] = useState<Awaited<ReturnType<typeof obtenerVerificacion>> | null>(null);
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
      obtenerVerificacion(),
    ]).then(([r, d, a, ev, h, dep, ver]) => {
      setResumen(r as ResumenPisu);
      setDashboard(d as DashboardAdminData);
      setAlertas(a as AlertaPisu[]);
      setEventos(ev as EventoPisu[]);
      setHorarios(h as HorarioAdminPisu[]);
      setDeportesAdmin(dep as DeportePisu[]);
      setVerificacion(ver);
    }).catch((err) => onError(mensajeError(err))).finally(() => setCargando(false));
  }, [onError]);

  const deportesActivos = (dashboard?.deportes ?? []).filter((d) => d.estado);
  const horariosPorDeporte = (id: string) => horarios.filter((h) => h.deporte?.id === id || h.deporte_id === id);
  const deportesSinHorario = deportesAdmin.filter((d) => d.estado && horariosPorDeporte(d.id).length === 0);
  const deportesAlta = deportesActivos.filter((d) => d.ocupacion >= 90);
  const deportesSinInscritos = deportesActivos.filter((d) => d.inscritos === 0);
  const ahora = new Date();
  const en7 = new Date(ahora.getTime() + 7 * 86400000);
  const eventosProximos = (eventos ?? []).filter((e) => e.estado && new Date(e.fecha) >= ahora && new Date(e.fecha) <= en7);
  const inscripciones7dias = verificacion?.indicadores.inscripciones7dias ?? 0;
  const alertasAtencion = [
    ...deportesSinHorario.map((d) => ({ texto: `Deporte ${d.nombre} sin horarios asignados`, accion: "horarios" })),
    ...deportesAlta.map((d) => ({ texto: `Deporte ${d.nombre} con ocupación ${d.ocupacion}%`, accion: "deportes" })),
    ...deportesSinInscritos.map((d) => ({ texto: `Deporte ${d.nombre} sin inscritos`, accion: "deportes" })),
    ...eventosProximos.map((e) => ({ texto: `Evento próximo: ${e.nombre}`, accion: "eventos" })),
  ];

  const totalCupos = deportesActivos.reduce((a, d) => a + d.cupo_maximo, 0);
  const totalInscritos = deportesActivos.reduce((a, d) => a + d.inscritos, 0);
  const ocupacionGlobal = totalCupos > 0 ? Math.round((totalInscritos / totalCupos) * 100) : 0;

  const disponibles = [...deportesActivos].sort((a, b) => a.ocupacion - b.ocupacion).slice(0, 3);
  const masOcupados = [...deportesActivos].sort((a, b) => b.ocupacion - a.ocupacion).slice(0, 3);

  const nombre = usuario.nombre_completo || usuario.email;
  const chipClass =
    "inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-100 ring-1 ring-white/10";

  return (
    <section className="space-y-5">
      <PanelHero
        nombre={nombre}
        rol="Administrador"
        descripcion="Administra los deportes, horarios, eventos y personas de Deporte PISU."
        chips={
          <>
            <span className={chipClass}>
              <Icon nombre="deportes" className="h-3.5 w-3.5 text-uni-cian" />
              {deportesActivos.length} deportes activos
            </span>
            <span className={chipClass}>
              <Icon nombre="eventos" className="h-3.5 w-3.5 text-uni-amarillo" />
              {eventosProximos.length} eventos próximos
            </span>
            <span className={chipClass}>
              <Icon nombre="usuarios" className="h-3.5 w-3.5 text-emerald-300" />
              {dashboard?.docentesActivos ?? 0} docentes activos
            </span>
          </>
        }
        acciones={
          <>
            <Button onClick={() => onNavegar("deportes")}>Crear deporte</Button>
            <Button variant="secondary" onClick={() => onNavegar("docentes")}>Crear docente</Button>
            <Button variant="secondary" onClick={() => onNavegar("eventos")}>Crear evento</Button>
            <Button variant="secondary" onClick={() => onNavegar("comunicados")}>Enviar comunicado</Button>
          </>
        }
      />

      <Card>
        <h2 className={TITULO_SECCION}>
          <Icon nombre="alerta" className="h-4 w-4 text-uni-amarillo" />
          Requiere tu atención
        </h2>
        {alertasAtencion.length === 0 ? (
          <p className="mt-3 rounded-xl bg-white/5 px-4 py-5 text-center text-sm text-emerald-300">
            Todo en orden. No hay alertas pendientes.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {alertasAtencion.map((a, idx) => (
              <li
                key={idx}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm"
              >
                <span className="text-slate-200">{a.texto}</span>
                <button
                  type="button"
                  onClick={() => onNavegar(a.accion)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-uni-cian transition hover:text-white"
                >
                  Resolver <Icon nombre="flecha" className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={deportesActivos.length}
          label="Deportes activos"
          description="Disciplinas habilitadas"
          icono="deportes"
          acento="text-uni-cian"
        />
        <StatCard
          value={eventosProximos.length}
          label="Eventos próximos 7d"
          description="Torneos y masterclasses"
          icono="eventos"
          acento="text-uni-amarillo"
        />
        <StatCard
          value={dashboard?.docentesActivos ?? 0}
          label="Docentes activos"
          description="Con deportes asignados"
          icono="usuarios"
          acento="text-emerald-300"
        />
        <StatCard
          value={dashboard?.totalEstudiantes ?? 0}
          label="Estudiantes registrados"
          description="En el sistema PISU"
          icono="medalla"
          acento="text-uni-mandarina"
        />
        <StatCard
          value={`${ocupacionGlobal}%`}
          label="Ocupación global"
          description={`${totalInscritos} de ${totalCupos} cupos`}
          icono="racha"
          acento="text-uni-cian"
        />
        <StatCard
          value={`${resumen?.inscripciones_activas ?? 0} / ${Math.max(0, dashboard?.totalEstudiantes ?? 0)}`}
          label="Inscritos vs sin inscripción"
          description="Cobertura de inscripciones"
          icono="trofeo"
          acento="text-uni-amarillo"
        />
        <StatCard
          value={inscripciones7dias}
          label="Inscripciones últimos 7d"
          description="Ritmo de participación"
          icono="horario"
          acento="text-emerald-300"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className={TITULO_SECCION}>
            <Icon nombre="deportes" className="h-4 w-4 text-uni-cian" />
            Ocupación por deporte
          </h3>
          <div className="mt-4 space-y-3">
            {deportesActivos.length === 0 ? (
              <p className="text-xs text-slate-400">Sin datos.</p>
            ) : (
              deportesActivos.map((d) => (
                <ProgressBar
                  key={d.id}
                  value={d.ocupacion}
                  label={`${d.nombre} · ${d.inscritos}/${d.cupo_maximo}`}
                />
              ))
            )}
          </div>
        </Card>

        <Card>
          <h3 className={TITULO_SECCION}>
            <Icon nombre="usuarios" className="h-4 w-4 text-uni-mandarina" />
            Estudiantes por categoría
          </h3>
          <div className="mt-4 space-y-3">
            {(["Pregrado", "Postgrado", "Egresado"] as const).map((cat) => {
              const val = dashboard?.estudiantesPorCategoria?.[cat] ?? 0;
              const max = Math.max(1, dashboard?.totalEstudiantes ?? 1);
              return (
                <ProgressBar
                  key={cat}
                  value={val}
                  max={max}
                  label={`${cat} · ${val}`}
                  tone="success"
                />
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className={TITULO_SECCION}>
            <Icon nombre="trofeo" className="h-4 w-4 text-uni-amarillo" />
            Top 3 más ocupados
          </h3>
          {masOcupados.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Sin datos.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {masOcupados.map((d, idx) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm"
                >
                  <span className="truncate text-slate-200">
                    <span className="font-black text-slate-500">#{idx + 1}</span> {d.nombre}
                  </span>
                  <Badge tone="warning">{d.ocupacion}%</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className={TITULO_SECCION}>
            <Icon nombre="chispa" className="h-4 w-4 text-emerald-300" />
            Top 3 con más cupos libres
          </h3>
          {disponibles.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Sin datos.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {disponibles.map((d, idx) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm"
                >
                  <span className="truncate text-slate-200">
                    <span className="font-black text-slate-500">#{idx + 1}</span> {d.nombre}
                  </span>
                  <Badge tone="success">{d.cupo_maximo - d.inscritos} libres</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card>
        <h3 className={TITULO_SECCION}>
          <Icon nombre="campana" className="h-4 w-4 text-uni-amarillo" />
          Últimos comunicados
        </h3>
        {alertas.length === 0 ? (
          <p className="mt-3 rounded-xl bg-white/5 px-4 py-5 text-center text-sm text-slate-400">
            No hay comunicados.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {alertas.slice(0, 5).map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-slate-200"
              >
                <Icon nombre="campana" className="h-3.5 w-3.5 shrink-0 text-uni-cian" />
                {a.titulo}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className={TITULO_SECCION}>
          <Icon nombre="racha" className="h-4 w-4 text-uni-cian" />
          Evolución de inscripciones en 30 días
        </h3>
        <div className="mt-4 flex h-24 items-end gap-1">
          {(dashboard?.inscripciones30Dias ?? []).map((d, idx) => {
            const max = Math.max(1, ...(dashboard?.inscripciones30Dias ?? []).map((x) => x.total));
            return (
              <div
                key={idx}
                className="flex-1 rounded-t bg-uni-mandarina/80"
                style={{ height: `${(d.total / max) * 100}%` }}
                title={`${d.fecha}: ${d.total}`}
              />
            );
          })}
        </div>
      </Card>

      {cargando ? (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Spinner /> Cargando…
        </p>
      ) : null}
    </section>
  );
}
