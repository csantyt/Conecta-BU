import { useMemo, useState } from "react";
import { autoinscribirseDeporte, cancelarInscripcionPisu } from "../../api/deporte";
import type { DeportePisu, PerfilPisu } from "../../types/deporte";
import { DIAS, estiloDeporte, etiquetaHorario, mensajeError } from "./utils";

type CatalogoDeportesProps = {
  deportes: DeportePisu[];
  perfil: PerfilPisu | null;
  cargando: boolean;
  onAviso: (valor: string) => void;
  onError: (valor: string) => void;
  onRecargar: () => Promise<void>;
};

export default function CatalogoDeportes({
  deportes,
  perfil,
  cargando,
  onAviso,
  onError,
  onRecargar,
}: CatalogoDeportesProps) {
  const [nombre, setNombre] = useState("");
  const [dia, setDia] = useState<number | "">("");
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [pendiente, setPendiente] = useState<DeportePisu | null>(null);

  const filtrados = useMemo(() => {
    const texto = nombre.trim().toLowerCase();
    return deportes.filter((deporte) => {
      const coincideNombre =
        texto.length === 0 || deporte.nombre.toLowerCase().includes(texto);
      const coincideDia =
        dia === "" ||
        deporte.horarios.some((horario) => horario.dia_semana === dia);
      return coincideNombre && coincideDia;
    });
  }, [deportes, nombre, dia]);

  const puedeInscribirse = perfil?.rol === "Estudiante";

  async function confirmarInscripcion() {
    if (!pendiente) {
      return;
    }
    const deporte = pendiente;
    setPendiente(null);
    setEnviandoId(deporte.id);
    try {
      await autoinscribirseDeporte(deporte.id);
      onAviso(`Quedaste inscrito en ${deporte.nombre}.`);
      await onRecargar();
    } catch (error) {
      onError(mensajeError(error));
    } finally {
      setEnviandoId(null);
    }
  }

  async function cancelar(deporte: DeportePisu) {
    if (!deporte.inscripcion_id) {
      return;
    }
    setEnviandoId(deporte.id);
    try {
      await cancelarInscripcionPisu(deporte.inscripcion_id);
      onAviso(`Se canceló tu inscripción a ${deporte.nombre}.`);
      await onRecargar();
    } catch (error) {
      onError(mensajeError(error));
    } finally {
      setEnviandoId(null);
    }
  }

  return (
    <section>
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_12rem]">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
            Buscar por nombre
          </span>
          <input
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Fútbol, voleibol..."
            className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white outline-none ring-sky-400 placeholder:text-slate-500 focus:ring-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
            Día
          </span>
          <select
            value={dia === "" ? "" : String(dia)}
            onChange={(event) =>
              setDia(event.target.value === "" ? "" : Number(event.target.value))
            }
            className="w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none ring-sky-400 focus:ring-2"
          >
            <option value="">Todos los días</option>
            {DIAS.map((etiqueta, indice) => (
              <option key={etiqueta} value={indice}>
                {etiqueta}
              </option>
            ))}
          </select>
        </label>
      </div>

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando disciplinas...</p>
      ) : filtrados.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300">
          No hay deportes que coincidan con el filtro.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((deporte) => {
            const visual = estiloDeporte(deporte.nombre);
            const ocupados = Math.max(
              0,
              deporte.cupo_maximo - deporte.cupo_disponible,
            );
            return (
              <article
                key={deporte.id}
                className="flex flex-col rounded-2xl border border-white/10 bg-white p-5 text-slate-900"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${visual.clase}`}
                  >
                    {visual.emoji}
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold">{deporte.nombre}</h2>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      Cupos {deporte.cupo_disponible}/{deporte.cupo_maximo}
                      <span className="text-slate-400"> · {ocupados} inscritos</span>
                    </p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                  {deporte.descripcion || "Disciplina del programa PISU."}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {deporte.categorias_permitidas.map((categoria) => (
                    <span
                      key={categoria}
                      className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-700"
                    >
                      {categoria}
                    </span>
                  ))}
                </div>

                {deporte.horarios.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-xs text-slate-600">
                    {deporte.horarios.map((horario) => (
                      <li key={horario.id}>{etiquetaHorario(horario)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-slate-400">
                    Aún no hay horarios publicados.
                  </p>
                )}

                <div className="mt-auto pt-4">
                  {deporte.inscrito ? (
                    <button
                      type="button"
                      disabled={enviandoId === deporte.id}
                      onClick={() => void cancelar(deporte)}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm disabled:opacity-50"
                    >
                      Cancelar inscripción
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        enviandoId === deporte.id ||
                        deporte.cupo_disponible <= 0 ||
                        !puedeInscribirse
                      }
                      onClick={() => setPendiente(deporte)}
                      className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {deporte.cupo_disponible <= 0
                        ? "Sin cupo"
                        : puedeInscribirse
                          ? "Inscribirme"
                          : "Solo estudiantes"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pendiente ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/70 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmar-inscripcion"
            className="w-full max-w-md rounded-2xl bg-white p-5 text-slate-900 shadow-2xl"
          >
            <h3 id="confirmar-inscripcion" className="text-lg font-semibold">
              Confirmar inscripción
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              ¿Deseas inscribirte en <strong>{pendiente.nombre}</strong>? Se
              validarán cupo, categoría y cruces de horario.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPendiente(null)}
                className="flex-1 rounded-xl border px-4 py-2.5 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarInscripcion()}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
