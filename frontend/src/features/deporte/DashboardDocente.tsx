import { useEffect, useState } from "react";
import { obtenerMisClasesHoyDocente } from "../../api/deporte";
import type { ClaseDocente, ComunicadoPisu } from "../../types/deporte";
import { etiquetaHorario, mensajeError } from "./utils";

type DashboardDocenteProps = {
  onAviso: (valor: string) => void;
  onError: (valor: string) => void;
};

export default function DashboardDocente({
  onError,
}: DashboardDocenteProps) {
  const [clases, setClases] = useState<ClaseDocente[]>([]);
  const [comunicados, setComunicados] = useState<ComunicadoPisu[]>([]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    void obtenerMisClasesHoyDocente()
      .then((data) => {
        if (!activo) return;
        setClases(data.clases);
        setComunicados(data.comunicados);
        setMensaje(data.mensaje ?? null);
      })
      .catch((error) => onError(mensajeError(error)))
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [onError]);

  if (cargando) {
    return <p className="mt-4 text-sm text-slate-500">Cargando clases de hoy...</p>;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900 sm:p-6">
      <h2 className="text-lg font-semibold">Dashboard docente · Hoy</h2>
      {mensaje ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {mensaje}
        </p>
      ) : null}
      <div className="mt-4 grid gap-3">
        {clases.map((clase) => (
          <article
            key={clase.id}
            className="rounded-xl border border-slate-200 px-4 py-3"
          >
            <p className="font-medium">
              {clase.deporte?.nombre ?? "Deporte"} · {etiquetaHorario(clase)}
            </p>
            <p className="text-xs text-slate-500">{clase.lugar}</p>
          </article>
        ))}
      </div>
      {comunicados.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Comunicados para docentes</h3>
          <ul className="mt-2 space-y-2">
            {comunicados.map((item) => (
              <li
                key={item.id}
                className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
              >
                <p className="font-medium">{item.titulo}</p>
                <p>{item.mensaje}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}