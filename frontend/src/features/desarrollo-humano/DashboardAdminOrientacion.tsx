import { useEffect, useMemo, useState } from "react";
import { listarUsuarios } from "../../api/auth";
import {
  obtenerDashboardAdmin,
  registrarAsistencia,
  type DashboardDesarrolloHumano,
} from "../../api/desarrolloHumano";
import type { Usuario } from "../../types/auth";
import type { Cita } from "../../types/desarrolloHumano";
import {
  esMismaFecha,
  fechaLocal,
  formatearFecha,
  mensajeError,
} from "./utils";

type DashboardAdminOrientacionProps = {
  citas: Cita[];
  onAviso: (valor: string) => void;
  onError: (valor: string) => void;
  onRecargar: () => Promise<void>;
};

const kpiMeta = [
  {
    clave: "citas_mes_actual" as const,
    etiqueta: "Citas del mes",
    detalle: "Agendadas, atendidas y canceladas",
    acento: "from-sky-400/20 to-sky-500/5 border-sky-400/30",
    valorClass: "text-sky-300",
    sufijo: "",
  },
  {
    clave: "porcentaje_asistencia" as const,
    etiqueta: "Asistencia efectiva",
    detalle: "Atendidas / (Atendidas + No asistió)",
    acento: "from-emerald-400/20 to-emerald-500/5 border-emerald-400/30",
    valorClass: "text-emerald-300",
    sufijo: "%",
  },
  {
    clave: "eventos_activos" as const,
    etiqueta: "Eventos activos",
    detalle: "Próximos con inscripción abierta",
    acento: "from-violet-400/20 to-violet-500/5 border-violet-400/30",
    valorClass: "text-violet-300",
    sufijo: "",
  },
  {
    clave: "consultas_ia" as const,
    etiqueta: "Consultas IA",
    detalle: "Atendidas por el asistente",
    acento: "from-amber-400/20 to-amber-500/5 border-amber-400/30",
    valorClass: "text-amber-300",
    sufijo: "",
  },
];

export default function DashboardAdminOrientacion({
  citas,
  onAviso,
  onError,
  onRecargar,
}: DashboardAdminOrientacionProps) {
  const [dashboard, setDashboard] = useState<DashboardDesarrolloHumano | null>(
    null,
  );
  const [cargandoKpi, setCargandoKpi] = useState(true);
  const [dia, setDia] = useState(fechaLocal(new Date()));
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [marcandoId, setMarcandoId] = useState<string | null>(null);

  const delDia = useMemo(
    () =>
      citas
        .filter((cita) => esMismaFecha(cita.fecha_hora, dia))
        .sort(
          (a, b) =>
            new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime(),
        ),
    [citas, dia],
  );

  async function cargarDashboard() {
    setCargandoKpi(true);
    try {
      setDashboard(await obtenerDashboardAdmin());
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setCargandoKpi(false);
    }
  }

  useEffect(() => {
    void cargarDashboard();
    void listarUsuarios()
      .then(setUsuarios)
      .catch(() => setUsuarios([]));
  }, []);

  function nombreDe(usuarioId: string): string {
    const persona = usuarios.find((item) => item.id === usuarioId);
    return persona?.nombre_completo || persona?.email || usuarioId.slice(0, 8);
  }

  async function marcarAsistencia(
    citaId: string,
    estado: "ASISTIO" | "NO_ASISTIO",
  ) {
    setMarcandoId(citaId);
    try {
      await registrarAsistencia(citaId, estado);
      onAviso(
        estado === "ASISTIO"
          ? "Asistencia registrada."
          : "Inasistencia registrada.",
      );
      await onRecargar();
      await cargarDashboard();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setMarcandoId(null);
    }
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Dashboard administrativo
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Indicadores de Desarrollo humano y control de asistencia (RF-015).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void cargarDashboard()}
          className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-white"
        >
          Actualizar KPIs
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpiMeta.map((kpi) => {
          const valor = dashboard?.[kpi.clave];
          return (
            <article
              key={kpi.clave}
              className={`rounded-3xl border bg-gradient-to-br p-5 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.8)] ${kpi.acento}`}
            >
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                {kpi.etiqueta}
              </p>
              <p className={`mt-3 text-3xl font-semibold tabular-nums ${kpi.valorClass}`}>
                {cargandoKpi || valor === undefined
                  ? "—"
                  : `${valor}${kpi.sufijo}`}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{kpi.detalle}</p>
            </article>
          );
        })}
      </div>

      {dashboard ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["Atendidas", dashboard.detalle_asistencia.atendidas, "bg-emerald-500/15 text-emerald-300 border-emerald-400/25"],
              ["No asistió", dashboard.detalle_asistencia.no_asistio, "bg-rose-500/15 text-rose-300 border-rose-400/25"],
              ["Agendadas", dashboard.detalle_asistencia.agendadas, "bg-sky-500/15 text-sky-300 border-sky-400/25"],
              ["Canceladas", dashboard.detalle_asistencia.canceladas, "bg-slate-500/15 text-slate-300 border-slate-400/25"],
            ] as const
          ).map(([label, n, clases]) => (
            <span
              key={label}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${clases}`}
            >
              {label}: {n}
            </span>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold">Control de citas y asistencia</h3>
            <p className="mt-1 text-xs text-slate-400">
              Marca Asistió o No asistió en las citas del día seleccionado.
            </p>
          </div>
          <label className="text-xs text-slate-400">
            Fecha
            <input
              type="date"
              className="mt-1 block rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
              value={dia}
              onChange={(event) => setDia(event.target.value)}
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3 font-medium">Estudiante</th>
                <th className="px-5 py-3 font-medium">Servicio</th>
                <th className="px-5 py-3 font-medium">Fecha</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {delDia.map((cita) => (
                <tr
                  key={cita.id}
                  className="border-t border-white/5 transition hover:bg-white/[0.03]"
                >
                  <td className="px-5 py-4 text-slate-200">
                    {nombreDe(cita.usuario_id)}
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {cita.servicio?.nombre ?? "Servicio"}
                  </td>
                  <td className="px-5 py-4 text-slate-400">
                    {formatearFecha(cita.fecha_hora)}
                  </td>
                  <td className="px-5 py-4">
                    <EstadoBadge estado={cita.estado} />
                  </td>
                  <td className="px-5 py-4">
                    {cita.estado === "AGENDADA" ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={marcandoId === cita.id}
                          onClick={() => void marcarAsistencia(cita.id, "ASISTIO")}
                          className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_8px_20px_-10px_rgba(16,185,129,0.9)] transition hover:brightness-110 disabled:opacity-50"
                        >
                          Asistió
                        </button>
                        <button
                          type="button"
                          disabled={marcandoId === cita.id}
                          onClick={() =>
                            void marcarAsistencia(cita.id, "NO_ASISTIO")
                          }
                          className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-rose-400/40 hover:bg-rose-500/15 hover:text-rose-200 disabled:opacity-50"
                        >
                          No asistió
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Sin acciones</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {delDia.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-400">
              No hay citas para esta fecha.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function EstadoBadge({ estado }: { estado: Cita["estado"] }) {
  const estilos: Record<Cita["estado"], string> = {
    AGENDADA: "bg-sky-500/15 text-sky-300 border-sky-400/30",
    ASISTIO: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    NO_ASISTIO: "bg-rose-500/15 text-rose-300 border-rose-400/30",
    CANCELADA: "bg-slate-500/15 text-slate-300 border-slate-400/30",
  };
  const etiquetas: Record<Cita["estado"], string> = {
    AGENDADA: "Agendada",
    ASISTIO: "Asistió",
    NO_ASISTIO: "No asistió",
    CANCELADA: "Cancelada",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${estilos[estado]}`}
    >
      {etiquetas[estado]}
    </span>
  );
}
