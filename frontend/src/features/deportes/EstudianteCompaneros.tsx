import { useEffect, useState } from "react";
import { obtenerCatalogoDeportes, obtenerInscritosDeporte } from "../../api/deporte";
import { mensajeError } from "./utils";
import type { DeportePisu } from "../../types/deporte";

export default function EstudianteCompaneros({ onError }: { onError: (v: string) => void }) {
  const [deportes, setDeportes] = useState<DeportePisu[]>([]);
  const [deporteId, setDeporteId] = useState("");
  const [companeros, setCompaneros] = useState<Array<{ nombre: string; categoria: string | null }>>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    void (async () => {
      try {
        const d = await obtenerCatalogoDeportes();
        setDeportes(d.deportes.filter((x) => x.inscrito));
        if (d.deportes.find((x) => x.inscrito)) setDeporteId(d.deportes.find((x) => x.inscrito)!.id);
      } catch (err) {
        onError(mensajeError(err));
      }
    })();
  }, []);

  useEffect(() => {
    if (!deporteId) return;
    void obtenerInscritosDeporte(deporteId, {})
      .then((r) => {
        setCompaneros(r.filas.map((f) => ({ nombre: f.nombre, categoria: f.categoria })));
        setTotal(r.total);
      })
      .catch((err) => onError(mensajeError(err)));
  }, [deporteId]);

  const deporte = deportes.find((d) => d.id === deporteId);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <select className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white" value={deporteId} onChange={(e) => setDeporteId(e.target.value)}>
          {deportes.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
      </div>
      <p className="text-sm text-slate-300">{total} compañeros inscritos · {deporte ? `${deporte.cupo_maximo - (deporte.cupo_disponible ?? 0)} cupos libres de ${deporte.cupo_maximo}` : ""}</p>
      {companeros.length === 0 ? (
        <p className="text-sm text-slate-400">Sin compañeros.</p>
      ) : (
        <ul className="space-y-2">
          {companeros.map((c, i) => (
            <li key={i} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
              <span className="font-medium">{c.nombre}</span>
              <span className="ml-2 text-xs text-slate-400">{c.categoria ?? ""}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}