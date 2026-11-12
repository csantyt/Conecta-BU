import { useEffect, useState } from "react";
import { obtenerMisAsistenciasPisu, obtenerMisHorariosPisu } from "../../api/deporte";
import type {
  AsistenciaEstudiantePisu,
  HorarioEstudiantePisu,
  ResumenAsistenciaPisu,
} from "../../types/deporte";
import { DIAS, horaCorta, mensajeError } from "./utils";

type MiActividadPisuProps = {
  onError: (valor: string) => void;
};

export default function MiActividadPisu({ onError }: MiActividadPisuProps) {
  const [horarios, setHorarios] = useState<HorarioEstudiantePisu[]>([]);
  const [asistencias, setAsistencias] = useState<AsistenciaEstudiantePisu[]>([]);
  const [resumen, setResumen] = useState<ResumenAsistenciaPisu[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    void Promise.all([obtenerMisHorariosPisu(), obtenerMisAsistenciasPisu()])
      .then(([listaHorarios, historial]) => {
        if (!activo) {
          return;
        }
        setHorarios(listaHorarios);
        setAsistencias(historial.asistencias);
        setResumen(historial.resumen);
      })
      .catch((err) => onError(mensajeError(err)))
      .finally(() => {
        if (activo) {
          setCargando(false);
        }
      });
    return () => {
      activo = false;
    };
  }, [onError]);

  if (cargando) {
    return <p className="text-sm text-slate-400">Cargando tu actividad...</p>;
  }

  const diasConClase = DIAS.map((etiqueta, indice) => ({
    etiqueta,
    clases: horarios.filter((horario) => horario.dia_semana === indice),
  })).filter((dia) => dia.clases.length > 0);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">Mi horario semanal</h2>
        {diasConClase.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
            Aún no tienes clases. Inscríbete a un deporte desde el catálogo.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {diasConClase.map((dia) => (
              <article
                key={dia.etiqueta}
                className="rounded-2xl border border-white/10 bg-white p-4 text-slate-900"
              >
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                  {dia.etiqueta}
                </p>
                <ul className="mt-2 space-y-2">
                  {dia.clases.map((clase) => (
                    <li key={clase.id} className="text-sm">
                      <p className="font-medium">{clase.deporte?.nombre ?? "Deporte"}</p>
                      <p className="text-xs text-slate-600">
                        {horaCorta(clase.hora_inicio)}–{horaCorta(clase.hora_fin)} ·{" "}
                        {clase.lugar}
                        {clase.docente ? ` · ${clase.docente.nombre}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Mi asistencia</h2>
        {resumen.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
            Todavía no hay asistencias registradas.
          </p>
        ) : (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {resumen.map((fila) => (
                <article
                  key={fila.deporte_id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="font-medium text-white">{fila.deporte}</p>
                  <p
                    className={`mt-1 text-2xl font-semibold ${
                      fila.porcentaje >= 80
                        ? "text-emerald-300"
                        : fila.porcentaje >= 60
                          ? "text-amber-300"
                          : "text-rose-300"
                    }`}
                  >
                    {fila.porcentaje}%
                  </p>
                  <p className="text-xs text-slate-400">
                    {fila.presentes} asistencias · {fila.ausentes} inasistencias
                  </p>
                </article>
              ))}
            </div>

            <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
              {asistencias.slice(0, 20).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 bg-white/[0.03] px-4 py-2.5 text-sm"
                >
                  <span className="text-slate-200">
                    {item.fecha} · {item.horario?.deporte?.nombre ?? "Clase"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      item.presente
                        ? "bg-emerald-400/15 text-emerald-200"
                        : "bg-rose-400/15 text-rose-200"
                    }`}
                  >
                    {item.presente ? "Presente" : "Ausente"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
