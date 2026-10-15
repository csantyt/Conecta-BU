import { useEffect, useState } from "react";
import { obtenerInscritosDeporte } from "../../api/deporte";
import { obtenerMisClasesDocente } from "../../api/deporte";
import { mensajeError } from "./utils";


export default function GestionGrupoDocente({ onError }: { onError: (v: string) => void }) {
  const [clases, setClases] = useState<Array<{ id: string; deporte?: { id: string; nombre: string } }>>([]);
  const [deporteId, setDeporteId] = useState("");
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [data, setData] = useState<Awaited<ReturnType<typeof obtenerInscritosDeporte>> | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const c = await obtenerMisClasesDocente();
        setClases(c.map((x) => ({ id: x.id, deporte: (x as unknown as { deporte?: { id: string; nombre: string } }).deporte })));
        if (c[0]) setDeporteId(c[0].deporte ? (c[0] as unknown as { deporte: { id: string } }).deporte.id : "");
      } catch (err) {
        onError(mensajeError(err));
      }
    })();
  }, []);

  useEffect(() => {
    if (!deporteId) return;
    setCargando(true);
    void obtenerInscritosDeporte(deporteId, { q, categoria })
      .then(setData)
      .catch((err) => onError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, [deporteId, q, categoria]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" value={deporteId} onChange={(e) => setDeporteId(e.target.value)}>
          {clases.map((c) => (
            <option key={c.id} value={c.deporte?.id ?? ""}>{c.deporte?.nombre ?? "Grupo"}</option>
          ))}
        </select>
        <input className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" />
        <select className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Todas</option>
          <option value="Pregrado">Pregrado</option>
          <option value="Postgrado">Postgrado</option>
          <option value="Egresado">Egresado</option>
        </select>
      </div>

      <p className="text-sm text-slate-300">{data?.total ?? 0} estudiantes inscritos</p>

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : !data || data.filas.length === 0 ? (
        <p className="text-sm text-slate-400">Sin estudiantes.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Asistencia</th>
                <th className="px-4 py-3">Inasistencias</th>
              </tr>
            </thead>
            <tbody>
              {data.filas.map((f) => {
                const alerta = (f.porcentaje_asistencia !== null && f.porcentaje_asistencia < 70) || f.inasistencias / Math.max(1, f.asistencias_total) > 0.3;
                return (
                  <tr key={f.id} className={`border-t border-white/5 ${alerta ? "bg-orange-500/10" : ""}`}>
                    <td className="px-4 py-3">{f.nombre}</td>
                    <td className="px-4 py-3 text-slate-300">{f.documento ?? "—"}</td>
                    <td className="px-4 py-3">{f.categoria ?? "—"}</td>
                    <td className="px-4 py-3">{f.porcentaje_asistencia === null ? "Sin datos" : `${f.porcentaje_asistencia}%`}</td>
                    <td className="px-4 py-3">{f.inasistencias}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <button className="rounded-full bg-orange-500 text-black px-4 py-2 text-xs font-semibold" onClick={() => { /* Llamar a lista */ }}>
        Llamar a lista
      </button>
    </section>
  );
}