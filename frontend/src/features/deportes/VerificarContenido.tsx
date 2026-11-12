import { useEffect, useState } from "react";
import { obtenerVerificacion } from "../../api/deporte";
import { mensajeError } from "./utils";

type Verif = {
  conteos: { deportes: number; horarios: number; eventos: number; docentes: number; estudiantes: number; inscripciones: number; comunicados: number };
  checklist: Array<{ key: string; label: string; ok: boolean }>;
  progreso: { completados: number; total: number };
  alertas: { deportesSinHorario: number; deportesSinDocente: number; deportesOcupacionAlta: number; deportesSinInscritos: number; eventosProximos7: number };
  timeline: Array<{ tipo: string; nombre: string; fecha: string; id: string }>;
  previews: { deportes: Array<{ id: string; nombre: string; inscritos: number; cupo_maximo: number; ocupacion: number }>; eventosProximos: Array<{ id: string; nombre: string; fecha: string }>; clases: Array<{ id: string; deporte?: { nombre: string }; docente?: { nombre: string }; dia_semana: number; hora_inicio: string; hora_fin: string; lugar: string }> };
  indicadores: { deportesActivos: number; docentesActivos: number; totalEstudiantes: number; totalInscripciones: number; inscripciones7dias: number; ocupacionPromedio: number; estudiantesSinInscripcion: number };
};

export default function VerificarContenido({ onError }: { onError: (v: string) => void }) {
  const [data, setData] = useState<Verif | null>(null);
  const [cargando, setCargando] = useState(true);

  async function recargar() {
    setCargando(true);
    try {
      const d = await obtenerVerificacion();
      setData(d as Verif);
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { void recargar(); }, []);

  if (cargando) return <p className="text-sm text-slate-400">Cargando verificacion...</p>;
  if (!data) return <p className="text-sm text-slate-400">Sin datos.</p>;

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Verificar contenido</h2>
        <button className="rounded-full border border-white/15 px-4 py-2 text-xs" onClick={() => void recargar()}>Actualizar</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Object.entries(data.conteos).map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs uppercase text-slate-400">{k}</p>
            <p className="mt-1 text-2xl font-semibold text-orange-300">{v}</p>
            <p className="mt-1 text-[11px] text-slate-400">{v > 0 ? "Con contenido" : "Vacio"}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h3 className="text-sm font-semibold">Lista de verificacion</h3>
        <p className="mt-1 text-xs text-slate-400">{data.progreso.completados} de {data.progreso.total} completado</p>
        <div className="mt-3 h-2 rounded-full bg-white/10">
          <div className="h-2 rounded-full bg-orange-400" style={{ width: `${(data.progreso.completados / Math.max(1, data.progreso.total)) * 100}%` }} />
        </div>
        <ul className="mt-4 space-y-2">
          {data.checklist.map((c) => (
            <li key={c.key} className="flex items-center gap-2 text-sm">
              <span>{c.ok ? "✓" : "!"}</span>
              <span className={c.ok ? "text-emerald-300" : "text-amber-300"}>{c.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h3 className="text-sm font-semibold">Contenido reciente</h3>
        {data.timeline.length === 0 ? <p className="mt-2 text-xs text-slate-400">Sin actividad.</p> : (
          <ul className="mt-3 space-y-2">
            {data.timeline.map((t, idx) => (
              <li key={idx} className="text-xs text-slate-300">{t.tipo} · {t.nombre} · {new Date(t.fecha).toLocaleString("es-CO")}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <h3 className="text-sm font-semibold">Vista previa como estudiante</h3>
        <p className="mt-1 text-xs text-slate-400">Vista previa: los botones estan deshabilitados.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {data.previews.deportes.map((d) => (
            <div key={d.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <p className="font-medium">{d.nombre}</p>
              <p className="text-xs text-slate-400">{d.inscritos}/{d.cupo_maximo} inscritos · {d.ocupacion}%</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}