import { useEffect, useState } from "react";
import { obtenerAlertasPisu, obtenerEventosPisu } from "../../api/deporte";
import type { AlertaPisu, EventoPisu } from "../../types/deporte";
import { mensajeError } from "./utils";

type EventosAlertasPisuProps = {
  onError: (valor: string) => void;
};

export default function EventosAlertasPisu({ onError }: EventosAlertasPisuProps) {
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [alertas, setAlertas] = useState<AlertaPisu[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    void Promise.all([obtenerEventosPisu(), obtenerAlertasPisu()])
      .then(([listaEventos, listaAlertas]) => {
        if (!activo) {
          return;
        }
        setEventos(listaEventos.filter((e) => e.estado !== false));
        setAlertas(listaAlertas);
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
    return (
      <p className="mb-5 text-sm text-slate-400">Cargando eventos y alertas...</p>
    );
  }

  if (eventos.length === 0 && alertas.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-4">
      {alertas.length > 0 ? (
        <div className="space-y-2">
          {alertas.slice(0, 3).map((alerta) => (
            <article
              key={alerta.id}
              className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3"
            >
              <p className="text-sm font-semibold text-amber-100">{alerta.titulo}</p>
              <p className="mt-1 text-sm text-amber-50/90">{alerta.mensaje}</p>
              <p className="mt-1 text-[11px] text-amber-200/70">
                Audiencia: {alerta.audiencia}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      {eventos.length > 0 ? (
        <section>
          <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-400">
            Eventos deportivos
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {eventos.slice(0, 4).map((evento) => (
              <article
                key={evento.id}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <p className="font-medium text-white">{evento.nombre}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {new Date(evento.fecha).toLocaleString("es-CO")} · {evento.lugar}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Cupo {evento.cupo_maximo}
                  {evento.descripcion ? ` · ${evento.descripcion}` : ""}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
