import { useMemo, useState } from "react";
import { autoinscribirseDeporte, cancelarInscripcionPisu } from "../../api/deporte";
import type { DeportePisu, PerfilPisu } from "../../types/deporte";
import CompletarPerfilPisu from "./CompletarPerfilPisu";
import { CoverDeporte } from "./estudianteUI";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Icon,
  PageHeader,
  ProgressBar,
  SearchBar,
  Select,
  SkeletonCard,
} from "./ui";
import { DIAS, etiquetaHorario, mensajeError } from "./utils";

type CatalogoDeportesProps = {
  deportes: DeportePisu[];
  perfil: PerfilPisu | null;
  cargando: boolean;
  onAviso: (valor: string, accion?: string) => void;
  onError: (valor: string) => void;
  onRecargar: () => Promise<void>;
};

function tonoCupo(deporte: DeportePisu): "success" | "warning" | "danger" {
  if (deporte.cupo_disponible <= 0) return "danger";
  if (deporte.cupo_disponible <= Math.max(1, Math.ceil(deporte.cupo_maximo * 0.2))) {
    return "warning";
  }
  return "success";
}

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

  // El servidor es la autoridad: sin categoría académica no se puede inscribir
  // (sección 10.1, no se inventan datos personales).
  const faltaCategoria = perfil?.rol === "Estudiante" && !perfil.categoria;
  const puedeInscribirse = perfil?.rol === "Estudiante" && Boolean(perfil.categoria);

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

  const hayFiltros = nombre.trim().length > 0 || dia !== "";

  return (
    <section>
      <PageHeader
        title="Catálogo de deportes"
        description="Explora las disciplinas PISU, revisa horarios y cupos, e inscríbete en segundos."
        action={
          <Badge tone="info">
            <Icon nombre="deportes" className="h-3.5 w-3.5" />
            {deportes.length} disciplinas
          </Badge>
        }
      />

      {perfil?.rol === "Estudiante" ? (
        <div className="mb-5">
          <CompletarPerfilPisu
            perfil={perfil}
            onAviso={onAviso}
            onError={onError}
            onRecargar={onRecargar}
          />
        </div>
      ) : null}

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
          <div>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Buscar
            </span>
            <SearchBar
              value={nombre}
              onChange={setNombre}
              placeholder="Busca por nombre: fútbol, voleibol..."
            />
          </div>
          <Select
            label="Día de la semana"
            value={dia === "" ? "" : String(dia)}
            onChange={(event) =>
              setDia(event.target.value === "" ? "" : Number(event.target.value))
            }
          >
            <option value="">Todos los días</option>
            {DIAS.map((etiqueta, indice) => (
              <option key={etiqueta} value={indice}>
                {etiqueta}
              </option>
            ))}
          </Select>
        </div>

        <div
          className="mt-3 flex flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Filtrar por día"
        >
          <button
            type="button"
            aria-pressed={dia === ""}
            onClick={() => setDia("")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              dia === ""
                ? "banda-uni text-uni-noche"
                : "border border-white/15 text-slate-300 hover:bg-white/10"
            }`}
          >
            Todos
          </button>
          {DIAS.slice(1).map((etiqueta, indice) => {
            const valor = indice + 1;
            return (
              <button
                key={etiqueta}
                type="button"
                aria-pressed={dia === valor}
                onClick={() => setDia(dia === valor ? "" : valor)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  dia === valor
                    ? "banda-uni text-uni-noche"
                    : "border border-white/15 text-slate-300 hover:bg-white/10"
                }`}
              >
                {etiqueta.slice(0, 3)}
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-slate-400" role="status" aria-live="polite">
          {cargando
            ? "Cargando disciplinas…"
            : `${filtrados.length} de ${deportes.length} disciplinas`}
        </p>
      </div>

      {cargando ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          title="No encontramos disciplinas"
          description="Prueba con otro nombre o cambia el día. Si ya estás inscrito, revisa «Mis deportes»."
          icono="buscar"
          action={
            hayFiltros ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setNombre("");
                  setDia("");
                }}
              >
                Limpiar filtros
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((deporte) => {
            const maximo = Math.max(1, deporte.cupo_maximo);
            const ocupados = Math.max(0, maximo - deporte.cupo_disponible);
            const tono = tonoCupo(deporte);
            return (
              <article
                key={deporte.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-300 hover:-translate-y-0.5 hover:border-uni-cian/30 hover:shadow-xl hover:shadow-black/20"
              >
                <CoverDeporte
                  nombre={deporte.nombre}
                  imagen={deporte.imagen_url ?? deporte.imagen}
                  className="h-40 rounded-none"
                >
                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-white">
                        {deporte.nombre}
                      </h2>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-300">
                        {deporte.cupo_disponible} cupos libres
                      </p>
                    </div>
                    {deporte.inscrito ? (
                      <Badge tone="success">
                        <Icon nombre="check" className="h-3 w-3" />
                        Inscrito
                      </Badge>
                    ) : (
                      <Badge
                        tone={
                          tono === "danger"
                            ? "danger"
                            : tono === "warning"
                              ? "warning"
                              : "info"
                        }
                      >
                        {tono === "danger"
                          ? "Lleno"
                          : tono === "warning"
                            ? "Últimos cupos"
                            : "Disponible"}
                      </Badge>
                    )}
                  </div>
                </CoverDeporte>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <p className="line-clamp-2 text-sm leading-6 text-slate-300">
                    {deporte.descripcion || "Disciplina del programa PISU."}
                  </p>

                  <ProgressBar
                    value={ocupados}
                    max={maximo}
                    label={`Cupos ocupados · ${ocupados}/${deporte.cupo_maximo}`}
                    tone={tono}
                  />

                  {deporte.categorias_permitidas.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {deporte.categorias_permitidas.map((categoria) => (
                        <span
                          key={categoria}
                          className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-200"
                        >
                          {categoria}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {deporte.horarios.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {deporte.horarios.map((horario) => (
                        <li
                          key={horario.id}
                          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-uni-noche/60 px-2.5 py-1 text-[11px] font-medium text-slate-200"
                        >
                          <Icon nombre="reloj" className="h-3 w-3 text-uni-cian" />
                          {etiquetaHorario(horario)}
                          {horario.docente ? ` · ${horario.docente.nombre}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <Icon nombre="info" className="h-3.5 w-3.5" />
                      Aún no hay horarios publicados.
                    </p>
                  )}

                  <div className="mt-auto pt-1">
                    {deporte.inscrito ? (
                      <Button
                        variant="secondary"
                        className="w-full"
                        loading={enviandoId === deporte.id}
                        onClick={() => void cancelar(deporte)}
                      >
                        Cancelar inscripción
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        loading={enviandoId === deporte.id}
                        disabled={deporte.cupo_disponible <= 0 || !puedeInscribirse}
                        title={
                          faltaCategoria
                            ? "Completa tu categoría en tu perfil para inscribirte."
                            : !puedeInscribirse
                              ? "Solo estudiantes pueden inscribirse."
                              : deporte.cupo_disponible <= 0
                                ? "No hay cupos disponibles."
                                : "Inscribirme"
                        }
                        onClick={() => setPendiente(deporte)}
                      >
                        {deporte.cupo_disponible <= 0
                          ? "Sin cupo"
                          : faltaCategoria
                            ? "Completa tu perfil"
                            : puedeInscribirse
                              ? "Inscribirme"
                              : "Solo estudiantes"}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendiente)}
        message={`¿Deseas inscribirte en ${pendiente?.nombre ?? "esta disciplina"}? Se validarán cupo, categoría y cruces de horario.`}
        confirmLabel="Inscribirme"
        onCancel={() => setPendiente(null)}
        onConfirm={() => void confirmarInscripcion()}
      />
    </section>
  );
}
