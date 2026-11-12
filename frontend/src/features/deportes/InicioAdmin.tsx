import { useEffect, useState } from "react";
import { obtenerAlertasAdmin } from "../../api/deporte";
import type { AlertaPisu } from "../../types/deporte";
import { mensajeError } from "./utils";

type Props = {
  onIr: (vista: string) => void;
  onError: (v: string) => void;
};

export default function InicioAdmin({ onIr, onError }: Props) {
  const [alertas, setAlertas] = useState<AlertaPisu[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setCargando(true);
    void obtenerAlertasAdmin()
      .then(setAlertas)
      .catch((err) => onError(mensajeError(err)))
      .finally(() => setCargando(false));
  }, [onError]);

  return (
    <section className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <button type="button" className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left" onClick={() => onIr("deportes")}>
          <p className="text-sm font-semibold">Crear deporte</p>
          <p className="mt-1 text-xs text-slate-400">Gestiona deportes, cupos y categorias.</p>
        </button>
        <button type="button" className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left" onClick={() => onIr("docentes")}>
          <p className="text-sm font-semibold">Crear docente</p>
          <p className="mt-1 text-xs text-slate-400">Alta con contrasena temporal.</p>
        </button>
        <button type="button" className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 text-left" onClick={() => onIr("eventos")}>
          <p className="text-sm font-semibold">Crear evento</p>
          <p className="mt-1 text-xs text-slate-400">Torneos, masterclass y mas.</p>
        </button>
      </div>

      <article className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-lg font-semibold">Ultimos comunicados</h2>
        {cargando ? (
          <p className="mt-3 text-sm text-slate-400">Cargando...</p>
        ) : alertas.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">No hay comunicados.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {alertas.slice(0, 5).map((a) => (
              <li key={a.id} className="rounded-xl border border-white/10 px-3 py-2">
                <p className="font-medium">{a.titulo}</p>
                <p className="text-xs text-slate-400">{a.mensaje}</p>
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}