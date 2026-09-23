import { useEffect, useState } from "react";
import { consultarRecomendaciones, type EventoSugerido } from "../api/ia";

function formatearFecha(valor: string): string {
  return new Date(valor).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type EventosSugeridosIAProps = {
  onIrAEventos: () => void;
};

export default function EventosSugeridosIA({ onIrAEventos }: EventosSugeridosIAProps) {
  const [eventos, setEventos] = useState<EventoSugerido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fuente, setFuente] = useState<"n8n" | "local" | null>(null);

  useEffect(() => {
    void consultarRecomendaciones()
      .then((data) => {
        setEventos(data.recomendaciones.slice(0, 3));
        setFuente(data.fuente);
      })
      .catch(() => setEventos([]))
      .finally(() => setCargando(false));
  }, []);

  return (
    <section className="mb-8 rounded-3xl border border-sky-200/40 bg-white p-4 text-slate-900 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">
            RF-013 · Recomendador inteligente
          </p>
          <h2 className="mt-1 text-lg font-semibold">Eventos sugeridos por IA</h2>
        </div>
        <button
          type="button"
          onClick={onIrAEventos}
          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white"
        >
          Ver eventos
        </button>
      </div>

      {cargando ? (
        <p className="mt-4 text-sm text-slate-500">Consultando talleres disponibles...</p>
      ) : null}

      {!cargando && eventos.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Aún no hay eventos con cupo para recomendar. Cuando un administrador publique
          talleres, aparecerán aquí.
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {eventos.map((evento) => (
          <article key={evento.id} className="rounded-2xl border border-slate-200 p-4">
            <h3 className="font-semibold">{evento.titulo}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {formatearFecha(evento.fecha_inicio)} · {evento.cupo_disponible} cupos
            </p>
            <p className="mt-2 text-sm leading-5 text-slate-600">{evento.motivo}</p>
          </article>
        ))}
      </div>

      {fuente === "local" && eventos.length > 0 ? (
        <p className="mt-4 text-[11px] text-slate-400">
          Sugerencias locales mientras se configura el webhook de n8n.
        </p>
      ) : null}
    </section>
  );
}
