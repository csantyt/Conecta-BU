import { useCallback, useEffect, useState } from "react";
import {
  cancelarInscripcionEventoPisu,
  inscribirseEventoPisu,
  obtenerAlertasPisu,
  obtenerEventosPisu,
} from "../../api/deporte";
import type { AlertaPisu, EventoPisu, PerfilPisu } from "../../types/deporte";
import { mensajeError } from "./utils";

type EventosAlertasPisuProps = {
  perfil: PerfilPisu | null;
  onAviso: (valor: string) => void;
  onError: (valor: string) => void;
};

export default function EventosAlertasPisu({
  perfil,
  onAviso,
  onError,
}: EventosAlertasPisuProps) {
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [alertas, setAlertas] = useState<AlertaPisu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    const [listaEventos, listaAlertas] = await Promise.all([
      obtenerEventosPisu(),
      obtenerAlertasPisu(),
    ]);
    setEventos(listaEventos.filter((e) => e.estado !== false));
    setAlertas(listaAlertas);
  }, []);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    void recargar()
      .catch((err) => onError(mensajeError(err)))
      .finally(() => {
        if (activo) {
          setCargando(false);
        }
      });
    return () => {
      activo = false;
    };
  }, [recargar, onError]);

  const esEstudiante = perfil?.rol === "Estudiante";

  async function alternarInscripcion(evento: EventoPisu) {
    setEnviandoId(evento.id);
    try {
      if (evento.inscrito) {
        await cancelarInscripcionEventoPisu(evento.id);
        onAviso(`Cancelaste tu inscripción a ${evento.nombre}.`);
      } else {
        await inscribirseEventoPisu(evento.id);
        onAviso(`Quedaste inscrito en ${evento.nombre}.`);
      }
      await recargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setEnviandoId(null);
    }
  }

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
              className={`rounded-2xl border px-4 py-3 ${
                alerta.estudiante_id
                  ? "border-rose-400/40 bg-rose-400/10"
                  : "border-amber-400/30 bg-amber-400/10"
              }`}
            >
              <p className="text-sm font-semibold text-amber-100">{alerta.titulo}</p>
              <p className="mt-1 text-sm text-amber-50/90">{alerta.mensaje}</p>
              <p className="mt-1 text-[11px] text-amber-200/70">
                {alerta.estudiante_id
                  ? "Aviso personal"
                  : `Audiencia: ${alerta.audiencia}`}
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
            {eventos.slice(0, 6).map((evento) => {
              const disponibles = evento.cupo_disponible ?? evento.cupo_maximo;
              const abierto = evento.abierto !== false;
              return (
                <article
                  key={evento.id}
                  className="flex flex-col rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <p className="font-medium text-white">{evento.nombre}</p>
                  <p className="mt-1 text-sm text-slate-300">
                    {new Date(evento.fecha).toLocaleString("es-CO")} · {evento.lugar}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Cupos {disponibles}/{evento.cupo_maximo}
                    {evento.descripcion ? ` · ${evento.descripcion}` : ""}
                  </p>
                  {esEstudiante ? (
                    <button
                      type="button"
                      disabled={
                        enviandoId === evento.id ||
                        (!evento.inscrito && (disponibles <= 0 || !abierto))
                      }
                      onClick={() => void alternarInscripcion(evento)}
                      className={`mt-3 self-start rounded-full px-4 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                        evento.inscrito
                          ? "border border-white/20 text-slate-200 hover:bg-white/10"
                          : "bg-sky-400 text-slate-950 hover:bg-sky-300"
                      }`}
                    >
                      {evento.inscrito
                        ? "Cancelar inscripción"
                        : !abierto
                          ? "Finalizado"
                          : disponibles <= 0
                            ? "Sin cupo"
                            : "Inscribirme"}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
