/**
 * Pantalla "Inicio" del rol Estudiante (módulo Deporte PISU).
 *
 * Reúne en un solo vistazo el estado del estudiante: bienvenida, métricas,
 * próxima clase, asistencia, insignias y accesos rápidos. Solo consume los
 * endpoints existentes del rol estudiante; no modifica reglas del backend.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  obtenerMisAsistenciasPisu,
  obtenerMisEventosPisu,
  obtenerMisHorariosPisu,
  obtenerMisInscripcionesCompletas,
} from "../../api/deporte";
import type {
  EventoPisu,
  HorarioEstudiantePisu,
  PerfilPisu,
  ResumenAsistenciaPisu,
} from "../../types/deporte";
import {
  AnilloProgreso,
  CoverDeporte,
  Logro,
  fechaLargaHoy,
  saludoActual,
} from "./estudianteUI";
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
  StatCard,
} from "./ui";
import { DIAS, horaCorta, mensajeError } from "./utils";

type InscripcionCompleta = Awaited<
  ReturnType<typeof obtenerMisInscripcionesCompletas>
>[number];

type Props = {
  perfil: PerfilPisu | null;
  usuario: { nombre_completo?: string; email: string };
  onNavegar: (vista: string) => void;
  onError: (mensaje: string) => void;
};

type ProximaClase = {
  horario: HorarioEstudiantePisu;
  fecha: Date;
  etiquetaDia: string;
};

/** Busca la siguiente clase dentro de los próximos 7 días. */
function calcularProximaClase(horarios: HorarioEstudiantePisu[]): ProximaClase | null {
  const ahora = new Date();
  let mejor: ProximaClase | null = null;
  for (const horario of horarios) {
    for (let salto = 0; salto < 8; salto += 1) {
      const fecha = new Date(ahora);
      fecha.setDate(ahora.getDate() + salto);
      if (fecha.getDay() !== horario.dia_semana) continue;
      const [h, m] = horaCorta(horario.hora_inicio).split(":").map(Number);
      fecha.setHours(h ?? 0, m ?? 0, 0, 0);
      if (fecha.getTime() <= ahora.getTime()) continue;
      if (!mejor || fecha < mejor.fecha) {
        const etiquetaDia =
          salto === 0
            ? "Hoy"
            : salto === 1
              ? "Mañana"
              : (DIAS[fecha.getDay()] ?? "").toLowerCase();
        mejor = { horario, fecha, etiquetaDia };
      }
      break;
    }
  }
  return mejor;
}

function SkeletonInicio() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-56 w-full rounded-3xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function EstudianteInicio({
  perfil,
  usuario,
  onNavegar,
  onError,
}: Props) {
  const [inscripciones, setInscripciones] = useState<InscripcionCompleta[]>([]);
  const [resumen, setResumen] = useState<ResumenAsistenciaPisu[]>([]);
  const [horarios, setHorarios] = useState<HorarioEstudiantePisu[]>([]);
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const [listaInscripciones, historial, listaHorarios, misEventos] =
        await Promise.all([
          obtenerMisInscripcionesCompletas(),
          obtenerMisAsistenciasPisu(),
          obtenerMisHorariosPisu(),
          obtenerMisEventosPisu(),
        ]);
      setInscripciones(listaInscripciones);
      setResumen(historial.resumen);
      setHorarios(listaHorarios.filter((h) => h.estado !== false));
      setEventos(misEventos);
    } catch (error) {
      const mensaje = mensajeError(error);
      setErrorCarga(mensaje);
      onError(mensaje);
    } finally {
      setCargando(false);
    }
  }, [onError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const nombre = perfil?.nombre ?? usuario.nombre_completo ?? usuario.email;

  const totales = useMemo(() => {
    const presentes = resumen.reduce((suma, fila) => suma + fila.presentes, 0);
    const ausentes = resumen.reduce((suma, fila) => suma + fila.ausentes, 0);
    const total = presentes + ausentes;
    return {
      presentes,
      ausentes,
      total,
      porcentaje: total > 0 ? Math.round((presentes / total) * 100) : 0,
    };
  }, [resumen]);

  const eventosActivos = useMemo(
    () =>
      eventos.filter(
        (evento) =>
          evento.inscrito &&
          !evento.finalizado &&
          evento.estado_evento !== "cancelado",
      ),
    [eventos],
  );

  const proximaClase = useMemo(() => calcularProximaClase(horarios), [horarios]);

  const logros = useMemo(
    () => [
      {
        icono: "chispa" as const,
        titulo: "Primer paso",
        descripcion: "Inscríbete en tu primera disciplina.",
        desbloqueado: inscripciones.length >= 1,
      },
      {
        icono: "racha" as const,
        titulo: "Constancia",
        descripcion: "Mantén al menos 80% de asistencia.",
        desbloqueado: totales.total > 0 && totales.porcentaje >= 80,
      },
      {
        icono: "catalogo" as const,
        titulo: "Explorador",
        descripcion: "Participa en dos disciplinas o más.",
        desbloqueado: inscripciones.length >= 2,
      },
      {
        icono: "medalla" as const,
        titulo: "En comunidad",
        descripcion: "Inscríbete en un evento PISU.",
        desbloqueado: eventosActivos.length >= 1,
      },
      {
        icono: "perfil" as const,
        titulo: "Perfil completo",
        descripcion: "Registra tu categoría académica.",
        desbloqueado: Boolean(perfil?.categoria),
      },
      {
        icono: "corazon" as const,
        titulo: "Bienestar activo",
        descripcion: "Acumula 5 asistencias registradas.",
        desbloqueado: totales.presentes >= 5,
      },
    ],
    [inscripciones.length, totales, eventosActivos.length, perfil?.categoria],
  );

  const desbloqueados = logros.filter((logro) => logro.desbloqueado).length;

  if (cargando) {
    return <SkeletonInicio />;
  }

  if (errorCarga) {
    return <ErrorState message={errorCarga} onRetry={() => void cargar()} />;
  }

  return (
    <div className="animar-entrada space-y-5">
      {/* Bienvenida */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-uni-marino via-uni-noche to-uni-noche p-5 sm:p-7">
        <div
          aria-hidden="true"
          className="absolute -right-6 -top-10 h-52 w-52 rounded-full bg-uni-cian/20 blur-3xl sm:h-64 sm:w-64"
        />
        <img
          src="/ilustraciones/estudiante-hero.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 hidden h-52 w-auto opacity-90 sm:block lg:h-64"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-xl">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-uni-cian">
              {fechaLargaHoy()}
            </p>
            <h1 className="mt-2 text-2xl font-black leading-tight text-white sm:text-4xl">
              {saludoActual()}, <span className="text-uni-amarillo">{nombre.split(" ")[0]}</span>
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">
              Este es tu espacio de Bienestar. Revisa tus clases, la asistencia y
              los eventos disponibles para hoy.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-100 ring-1 ring-white/10">
                <Icon nombre="deportes" className="h-3.5 w-3.5 text-uni-cian" />
                {inscripciones.length} disciplina{inscripciones.length === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-100 ring-1 ring-white/10">
                <Icon nombre="campana" className="h-3.5 w-3.5 text-uni-amarillo" />
                {eventosActivos.length} evento{eventosActivos.length === 1 ? "" : "s"}{" "}
                {eventosActivos.length === 1 ? "inscrito" : "inscritos"}
              </span>
              {perfil?.categoria ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-slate-100 ring-1 ring-white/10">
                  <Icon nombre="medalla" className="h-3.5 w-3.5 text-emerald-300" />
                  {perfil.categoria}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavegar("mis-deportes")}
                  className="inline-flex items-center gap-1.5 rounded-full bg-uni-amarillo/15 px-3 py-1 text-[11px] font-semibold text-uni-amarillo ring-1 ring-uni-amarillo/30 transition hover:bg-uni-amarillo/25"
                >
                  <Icon nombre="alerta" className="h-3.5 w-3.5" />
                  Completa tu perfil
                </button>
              )}
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex lg:mr-40">
            <Avatar nombre={nombre} size="lg" />
            <div className="text-right">
              <p className="max-w-[12rem] truncate text-sm font-bold text-white">{nombre}</p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-uni-cian">
                Estudiante PISU
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Métricas */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          value={inscripciones.length}
          label="Disciplinas activas"
          description={inscripciones.length ? "Sigue así" : "Explora el catálogo"}
          icono="deportes"
          acento="text-uni-cian"
        />
        <StatCard
          value={`${totales.porcentaje}%`}
          label="Asistencia general"
          description={
            totales.total
              ? `${totales.presentes} de ${totales.total} clases`
              : "Aún sin registros"
          }
          icono="racha"
          acento="text-emerald-300"
        />
        <StatCard
          value={horarios.length}
          label="Clases por semana"
          description="Según tu horario"
          icono="horario"
          acento="text-uni-amarillo"
        />
        <StatCard
          value={eventosActivos.length}
          label="Eventos inscritos"
          description="Torneos y masterclasses"
          icono="trofeo"
          acento="text-uni-mandarina"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        {/* Próxima clase + asistencia */}
        <div className="space-y-4">
          <Card className="relative overflow-hidden">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300">
                <Icon nombre="reloj" className="h-4 w-4 text-uni-cian" />
                Tu próxima clase
              </h2>
              <button
                type="button"
                onClick={() => onNavegar("horario")}
                className="inline-flex items-center gap-1 text-xs font-semibold text-uni-cian transition hover:text-white"
              >
                Ver horario <Icon nombre="flecha" className="h-3.5 w-3.5" />
              </button>
            </div>

            {proximaClase ? (
              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <CoverDeporte
                  nombre={proximaClase.horario.deporte?.nombre ?? "Deporte"}
                  className="h-28 w-full sm:h-24 sm:w-36"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full banda-uni px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-uni-noche">
                      {proximaClase.etiquetaDia}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">
                      {horaCorta(proximaClase.horario.hora_inicio)} –{" "}
                      {horaCorta(proximaClase.horario.hora_fin)}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-lg font-bold text-white">
                    {proximaClase.horario.deporte?.nombre ?? "Clase PISU"}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                    <Icon nombre="ubicacion" className="h-3.5 w-3.5" />
                    {proximaClase.horario.lugar}
                    {proximaClase.horario.docente
                      ? ` · ${proximaClase.horario.docente.nombre}`
                      : ""}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-6 text-center">
                <Icon nombre="calendario" className="h-8 w-8 text-slate-500" />
                <p className="text-sm font-semibold text-white">Aún no tienes clases programadas</p>
                <p className="text-xs text-slate-400">
                  Inscríbete a una disciplina para ver aquí tu próxima sesión.
                </p>
                <Button onClick={() => onNavegar("catalogo")}>Explorar catálogo</Button>
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300">
                <Icon nombre="racha" className="h-4 w-4 text-emerald-300" />
                Tu asistencia
              </h2>
              <button
                type="button"
                onClick={() => onNavegar("horario")}
                className="text-xs font-semibold text-uni-cian transition hover:text-white"
              >
                Historial
              </button>
            </div>
            {totales.total === 0 ? (
              <p className="mt-3 rounded-xl bg-white/5 px-4 py-5 text-center text-sm text-slate-400">
                Todavía no hay asistencias registradas. ¡Tu primera clase sumará aquí!
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap items-center gap-5">
                <AnilloProgreso
                  valor={totales.porcentaje}
                  etiqueta="Asistencia"
                  detalle={`${totales.presentes}/${totales.total}`}
                />
                <div className="min-w-[10rem] flex-1 space-y-2">
                  {resumen.map((fila) => (
                    <div key={fila.deporte_id}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate font-medium text-slate-200">{fila.deporte}</span>
                        <span className="tabular-nums text-slate-400">{fila.porcentaje}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full transition-[width] duration-700 ${
                            fila.porcentaje >= 80
                              ? "bg-emerald-400"
                              : fila.porcentaje >= 60
                                ? "bg-amber-400"
                                : "bg-rose-400"
                          }`}
                          style={{ width: `${Math.min(100, fila.porcentaje)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Logros */}
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300">
              <Icon nombre="trofeo" className="h-4 w-4 text-uni-amarillo" />
              Tus logros
            </h2>
            <span className="rounded-full bg-uni-amarillo/15 px-2.5 py-0.5 text-[11px] font-bold text-uni-amarillo">
              {desbloqueados}/{logros.length}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full banda-uni transition-[width] duration-700"
              style={{ width: `${(desbloqueados / logros.length) * 100}%` }}
            />
          </div>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {logros.map((logro) => (
              <Logro key={logro.titulo} {...logro} />
            ))}
          </div>
        </Card>
      </div>

      {/* Mis disciplinas */}
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-slate-300">
            <Icon nombre="deportes" className="h-4 w-4 text-uni-cian" />
            Tus disciplinas
          </h2>
          <button
            type="button"
            onClick={() => onNavegar("mis-deportes")}
            className="inline-flex items-center gap-1 text-xs font-semibold text-uni-cian transition hover:text-white"
          >
            Gestionar <Icon nombre="flecha" className="h-3.5 w-3.5" />
          </button>
        </div>
        {inscripciones.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Tu aventura PISU empieza aquí"
              description="Elige una disciplina y te mostraremos horarios, docentes y cupos disponibles."
              icono="deportes"
              action={<Button onClick={() => onNavegar("catalogo")}>Ver catálogo</Button>}
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {inscripciones.map((inscripcion) => {
              const nombreDeporte = inscripcion.deporte?.nombre ?? "Disciplina";
              const asistencia = inscripcion.asistencia;
              return (
                <article
                  key={inscripcion.inscripcion_id}
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition hover:border-uni-cian/40 hover:bg-white/[0.06]"
                >
                  <CoverDeporte
                    nombre={nombreDeporte}
                    className="h-16 w-16 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{nombreDeporte}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {inscripcion.horarios.length
                        ? `${DIAS[inscripcion.horarios[0]?.dia_semana ?? 0]} ${horaCorta(
                            inscripcion.horarios[0]?.hora_inicio ?? "",
                          )}`
                        : "Sin horario publicado"}
                    </p>
                    {asistencia && asistencia.total > 0 ? (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-uni-cian"
                            style={{ width: `${Math.min(100, asistencia.porcentaje ?? 0)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold tabular-nums text-slate-300">
                          {asistencia.porcentaje ?? 0}%
                        </span>
                      </div>
                    ) : (
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">
                        Asistencia sin registrar
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      {/* Accesos rápidos */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { id: "catalogo", titulo: "Explorar catálogo", texto: "Encuentra tu próximo deporte", icono: "buscar" as const },
          { id: "eventos", titulo: "Eventos", texto: "Torneos y masterclasses", icono: "eventos" as const },
          { id: "horario", titulo: "Mi horario", texto: "Clases y asistencia", icono: "calendario" as const },
          { id: "mis-deportes", titulo: "Mi perfil", texto: "Categoría y datos", icono: "perfil" as const },
        ].map((acceso) => (
          <button
            key={acceso.id}
            type="button"
            onClick={() => onNavegar(acceso.id)}
            className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-uni-cian/50 hover:bg-white/[0.07]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-uni-cian/15 text-uni-cian transition group-hover:bg-uni-cian group-hover:text-uni-noche">
              <Icon nombre={acceso.icono} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white">{acceso.titulo}</span>
              <span className="block truncate text-xs text-slate-400">{acceso.texto}</span>
            </span>
            <Icon
              nombre="flecha"
              className="ml-auto h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-uni-cian"
            />
          </button>
        ))}
      </section>
    </div>
  );
}
