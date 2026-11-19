/**
 * Eventos destacados del inicio (módulo Deporte PISU).
 *
 * Muestra los próximos eventos reales publicados por los docentes, con un
 * diseño acorde a la identidad institucional (azul noche, cian y banda
 * amarillo→naranja). Sustituye la antigua tarjeta de recomendaciones por IA,
 * que quedaba vacía cuando no había sugerencias.
 *
 * Consume `GET /deportes/eventos` (catálogo real con cupos).
 */

import { useEffect, useState } from "react";
import { obtenerEventosPisu } from "../api/deporte";
import type { EventoPisu } from "../types/deporte";

type EventosDestacadosProps = {
  onIrAEventos: () => void;
};

const MESES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function partesFecha(valor: string): { dia: string; mes: string; semana: string } | null {
  const soloFecha = valor.slice(0, 10);
  const [anio, mes, dia] = soloFecha.split("-").map(Number);
  if (!anio || !mes || !dia) return null;
  const fecha = new Date(anio, mes - 1, dia);
  return {
    dia: String(dia).padStart(2, "0"),
    mes: MESES[mes - 1] ?? "",
    semana: DIAS[fecha.getDay()] ?? "",
  };
}

function hora12(hora?: string | null): string {
  if (!hora) return "";
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  const sufijo = (h ?? 0) >= 12 ? "p. m." : "a. m.";
  const h12 = (h ?? 0) % 12 === 0 ? 12 : (h ?? 0) % 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${sufijo}`;
}

function cuposDe(evento: EventoPisu): { disponibles: number; ocupados: number; total: number } {
  const total = Math.max(1, evento.cupo_maximo);
  const disponibles =
    evento.cupo_disponible ??
    evento.cupos_libres ??
    Math.max(0, total - (evento.inscritos ?? 0));
  return { disponibles, ocupados: Math.min(total, total - disponibles), total };
}

function esVisible(evento: EventoPisu): boolean {
  return evento.estado !== false && evento.estado_evento !== "cancelado" && !evento.finalizado;
}

export default function EventosDestacados({ onIrAEventos }: EventosDestacadosProps) {
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    void obtenerEventosPisu()
      .then((lista) => {
        if (!activo) return;
        const proximos = lista
          .filter(esVisible)
          .sort((a, b) => a.fecha.localeCompare(b.fecha))
          .slice(0, 6);
        setEventos(proximos);
      })
      .catch(() => {
        if (activo) setEventos([]);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, []);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-uni-noche/70 p-5 sm:p-8">
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-uni-cian/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-uni-mandarina/10 blur-3xl" />

      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-uni-cian">
            <span className="h-1.5 w-1.5 rounded-full bg-uni-mandarina" />
            Agenda deportiva PISU
          </p>
          <h2 className="mt-2 text-2xl font-black uppercase leading-tight tracking-tight text-white sm:text-3xl">
            Próximos eventos
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
            Torneos, masterclasses y encuentros abiertos para la comunidad
            universitaria. Inscríbete desde el módulo de Deporte.
          </p>
        </div>
        <button
          type="button"
          onClick={onIrAEventos}
          className="group inline-flex items-center gap-2 rounded-full border border-uni-cian/50 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-uni-cian transition hover:bg-uni-cian hover:text-uni-noche"
        >
          Ver todos los eventos
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </button>
      </div>

      {cargando ? (
        <div className="relative mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-52 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]"
            />
          ))}
        </div>
      ) : eventos.length === 0 ? (
        <div className="relative mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-uni-cian/10 text-uni-cian">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" />
              <path d="m9.5 15 2 2 3.5-3.5" />
            </svg>
          </span>
          <p className="text-base font-bold text-white">La agenda está tomando forma</p>
          <p className="max-w-md text-sm leading-6 text-slate-400">
            Aún no hay eventos publicados. Cuando un docente cree un torneo o una
            masterclass, aparecerá aquí con su fecha, lugar y cupos disponibles.
          </p>
        </div>
      ) : (
        <div className="relative mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {eventos.map((evento) => {
            const fecha = partesFecha(evento.fecha);
            const { disponibles, ocupados, total } = cuposDe(evento);
            const porcentaje = Math.round((ocupados / total) * 100);
            return (
              <article
                key={evento.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-uni-marino/80 to-uni-noche transition duration-300 hover:-translate-y-1 hover:border-uni-cian/40 hover:shadow-2xl hover:shadow-black/40"
              >
                <div className="h-1 w-full banda-uni" />
                <div className="flex flex-1 gap-4 p-4">
                  <div className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-uni-cian/10 text-uni-cian ring-1 ring-inset ring-uni-cian/25">
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {fecha?.semana ?? ""}
                    </span>
                    <span className="text-2xl font-black leading-none text-white">
                      {fecha?.dia ?? "—"}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {fecha?.mes ?? ""}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-sm font-bold leading-5 text-white">
                        {evento.nombre}
                      </h3>
                      <span className="shrink-0 rounded-full bg-uni-mandarina/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-uni-mandarina">
                        {evento.tipo ?? "General"}
                      </span>
                    </div>

                    <p className="mt-1 truncate text-xs font-semibold text-uni-cian">
                      {evento.deporte?.nombre ?? "Bienestar universitario"}
                    </p>

                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-300">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="text-uni-cian"
                      >
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>
                      {hora12(evento.hora_inicio) || "Hora por confirmar"}
                      {evento.hora_fin ? ` – ${hora12(evento.hora_fin)}` : ""}
                    </p>

                    <p className="mt-1 inline-flex items-center gap-1.5 truncate text-xs text-slate-300">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="shrink-0 text-uni-cian"
                      >
                        <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" />
                        <circle cx="12" cy="9.5" r="2.5" />
                      </svg>
                      <span className="truncate">{evento.lugar}</span>
                    </p>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide">
                    <span className={disponibles > 0 ? "text-emerald-300" : "text-rose-300"}>
                      {disponibles > 0
                        ? `${disponibles} cupo${disponibles === 1 ? "" : "s"} disponible${disponibles === 1 ? "" : "s"}`
                        : "Cupos agotados"}
                    </span>
                    <span className="text-slate-400">
                      {ocupados}/{evento.cupo_maximo}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all ${
                        disponibles <= 0 ? "bg-rose-400" : "banda-uni"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
