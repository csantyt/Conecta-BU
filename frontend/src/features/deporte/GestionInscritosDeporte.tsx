import { useEffect, useState } from "react";
import {
  inscribirEstudianteManualAdmin,
  obtenerDeportesAdmin,
  obtenerEstudiantesGeneral,
  obtenerInscritosAgrupados,
  obtenerInscritosDeporte,
  retirarInscripcionManualAdmin,
} from "../../api/deporte";
import type { GrupoInscritosDeporte } from "../../types/deporte";
import { mensajeError } from "./utils";
import { formatearFecha } from "./utils/formato";

type Deporte = { id: string; nombre: string };

export default function GestionInscritosDeporte({
  onAviso,
  onError,
}: {
  onAviso: (v: string, accion?: string) => void;
  onError: (v: string) => void;
}) {
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [deporteId, setDeporteId] = useState("");
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [orden, setOrden] = useState("nombre");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [data, setData] = useState<Awaited<ReturnType<typeof obtenerInscritosDeporte>> | null>(null);
  const [cargando, setCargando] = useState(false);

  const [manualId, setManualId] = useState("");
  const [estudiantes, setEstudiantes] = useState<Array<{ id: string; nombre: string; documento?: string | null }>>([]);

  const [vista, setVista] = useState<"agrupado" | "individual">("agrupado");
  const [grupos, setGrupos] = useState<GrupoInscritosDeporte[]>([]);
  const [cargandoGrupos, setCargandoGrupos] = useState(false);

  async function recargarGrupos() {
    setCargandoGrupos(true);
    try {
      const data = await obtenerInscritosAgrupados({ q: q || undefined, categoria: categoria || undefined });
      setGrupos(data);
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setCargandoGrupos(false);
    }
  }

  useEffect(() => {
    if (vista !== "agrupado") return;
    void recargarGrupos();
  }, [vista, q, categoria]);

  async function recargar() {
    if (!deporteId) return;
    setCargando(true);
    try {
      const res = await obtenerInscritosDeporte(deporteId, { q, categoria, orden, page, pageSize });
      setData(res);
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const d = await obtenerDeportesAdmin();
        setDeportes(d.map((x) => ({ id: x.id, nombre: x.nombre })));
        if (d[0]) setDeporteId(d[0].id);
      } catch (err) {
        onError(mensajeError(err));
      }
    })();
  }, []);

  useEffect(() => {
    void recargar();
  }, [deporteId, q, categoria, orden, page]);

  useEffect(() => {
    void (async () => {
      const est = await obtenerEstudiantesGeneral({ q: q || undefined });
      setEstudiantes(est.map((e) => ({ id: e.id, nombre: e.nombre, documento: e.documento })));
    })();
  }, [q]);

  async function inscribirManual() {
    if (!manualId || !deporteId) return;
    try {
      await inscribirEstudianteManualAdmin({ estudiante_id: manualId, deporte_id: deporteId });
      onAviso("Inscripción registrada.", "inscritos");
      setManualId("");
      await recargar();
    } catch (err) {
      onError(mensajeError(err));
    }
  }

  async function retirar(inscripcionId: string) {
    if (!window.confirm("Retirar al estudiante de este deporte?")) return;
    try {
      await retirarInscripcionManualAdmin(inscripcionId);
      onAviso("Inscripción retirada.", "inscritos");
      await recargar();
    } catch (err) {
      onError(mensajeError(err));
    }
  }

  function exportarCsv() {
    if (!data) return;
    const rows = [["Nombre", "Documento", "Correo", "Categoria", "Fecha", "Asistencia %", "Inasistencias"]];
    for (const f of data.filas) {
      rows.push([
        f.nombre,
        f.documento ?? "",
        f.correo ?? "",
        f.categoria ?? "",
        new Date(f.fecha_inscripcion).toLocaleDateString("es-CO"),
        f.porcentaje_asistencia === null ? "Sin datos" : String(f.porcentaje_asistencia),
        String(f.inasistencias),
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "inscritos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const resumenCategorias = data
    ? data.filas.reduce(
        (acc, f) => {
          const c = f.categoria ?? "Sin categoria";
          acc[c] = (acc[c] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      )
    : {};

  if (vista === "agrupado") {
    return (
      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-full px-4 py-2 text-xs font-semibold banda-uni sombra-uni text-uni-noche"
            onClick={() => setVista("agrupado")}
          >
            Por deporte
          </button>
          <button
            className="rounded-full px-4 py-2 text-xs font-semibold border border-white/15 text-slate-300"
            onClick={() => setVista("individual")}
          >
            Registro individual
          </button>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <input className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre/documento" />
          <select className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">Todas las categorías</option>
            <option value="Pregrado">Pregrado</option>
            <option value="Postgrado">Postgrado</option>
            <option value="Egresado">Egresado</option>
          </select>
        </div>

        {cargandoGrupos ? (
          <p className="text-sm text-slate-400">Cargando inscritos por deporte...</p>
        ) : grupos.length === 0 ? (
          <p className="text-sm text-slate-400">No hay deportes activos.</p>
        ) : (
          <div className="space-y-4">
            {grupos.map((grupo) => (
              <article key={grupo.deporte.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-base font-semibold text-white">{grupo.deporte.nombre}</h3>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                    {grupo.total} inscritos · cupo {grupo.deporte.cupo_maximo}
                  </span>
                </div>

                {grupo.total === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">Sin estudiantes inscritos.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Nombre</th>
                          <th className="px-4 py-3">Documento</th>
                          <th className="px-4 py-3">Correo</th>
                          <th className="px-4 py-3">Categoría</th>
                          <th className="px-4 py-3">Fecha</th>
                          <th className="px-4 py-3">Asistencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {grupo.inscritos.map((f, idx) => (
                          <tr key={`${f.correo ?? f.nombre}-${idx}`} className="border-t border-white/5">
                            <td className="px-4 py-3">{f.nombre}</td>
                            <td className="px-4 py-3 text-slate-300">{f.documento ?? "—"}</td>
                            <td className="px-4 py-3 text-slate-400">{f.correo ?? "—"}</td>
                            <td className="px-4 py-3">{f.categoria ?? "—"}</td>
                            <td className="px-4 py-3 text-slate-400">{formatearFecha(f.fecha_inscripcion)}</td>
                            <td className="px-4 py-3">
                              {f.porcentaje_asistencia === null ? "Sin datos" : `${f.porcentaje_asistencia}%`} ({f.inasistencias} inasist.)
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-full px-4 py-2 text-xs font-semibold border border-white/15 text-slate-300"
          onClick={() => setVista("agrupado")}
        >
          Por deporte
        </button>
        <button
          className="rounded-full px-4 py-2 text-xs font-semibold banda-uni sombra-uni text-uni-noche"
          onClick={() => setVista("individual")}
        >
          Registro individual
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" value={deporteId} onChange={(e) => { setDeporteId(e.target.value); setPage(1); }}>
          {deportes.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
        <input className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Buscar nombre/documento" />
        <select className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" value={categoria} onChange={(e) => { setCategoria(e.target.value); setPage(1); }}>
          <option value="">Todas</option>
          <option value="Pregrado">Pregrado</option>
          <option value="Postgrado">Postgrado</option>
          <option value="Egresado">Egresado</option>
        </select>
        <select className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" value={orden} onChange={(e) => setOrden(e.target.value)}>
          <option value="nombre">Nombre</option>
          <option value="fecha">Fecha</option>
          <option value="inasistencias">Inasistencias</option>
        </select>
        <button className="rounded-full border border-white/15 px-4 py-2 text-xs" onClick={exportarCsv}>Exportar CSV</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.entries(resumenCategorias).map(([cat, n]) => (
          <button key={cat} className="rounded-full bg-white/10 px-3 py-1 text-xs" onClick={() => setCategoria(cat === "Sin categoria" ? "" : cat)}>
            {cat}: {n}
          </button>
        ))}
        {data ? <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Total: {data.total}</span> : null}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" value={manualId} onChange={(e) => setManualId(e.target.value)}>
          <option value="">Inscribir estudiante...</option>
          {estudiantes.map((e) => <option key={e.id} value={e.id}>{e.nombre} {e.documento ? `· ${e.documento}` : ""}</option>)}
        </select>
        <button className="rounded-full bg-orange-500 text-black px-4 py-2 text-xs font-semibold" onClick={() => void inscribirManual()}>Inscribir manual</button>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando inscritos...</p>
      ) : !data || data.filas.length === 0 ? (
        <p className="text-sm text-slate-400">Sin inscritos.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Asistencia</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {data.filas.map((f) => (
                <tr key={f.id} className="border-t border-white/5">
                  <td className="px-4 py-3">{f.nombre}</td>
                  <td className="px-4 py-3 text-slate-300">{f.documento ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{f.correo ?? "—"}</td>
                  <td className="px-4 py-3">{f.categoria ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">{formatearFecha(f.fecha_inscripcion)}</td>
                  <td className="px-4 py-3">{f.porcentaje_asistencia === null ? "Sin datos" : `${f.porcentaje_asistencia}%`} ({f.inasistencias} inasist.)</td>
                  <td className="px-4 py-3">
                    <button className="text-xs text-rose-300" onClick={() => void retirar(f.id)}>Retirar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2 text-xs">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-full border border-white/15 px-3 py-1 disabled:opacity-50">Anterior</button>
        <button disabled={!!data && page * pageSize >= data.total} onClick={() => setPage((p) => p + 1)} className="rounded-full border border-white/15 px-3 py-1 disabled:opacity-50">Siguiente</button>
      </div>
    </section>
  );
}

