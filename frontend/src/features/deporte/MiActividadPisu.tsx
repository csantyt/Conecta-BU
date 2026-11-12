import { useEffect, useState } from "react";
import { obtenerMisAsistenciasPisu, obtenerMisHorariosPisu } from "../../api/deporte";
import type {
  AsistenciaEstudiantePisu,
  HorarioEstudiantePisu,
  ResumenAsistenciaPisu,
} from "../../types/deporte";
import { AnilloProgreso } from "./estudianteUI";
import {
  Badge,
  Button,
  EmptyState,
  Icon,
  PageHeader,
  ProgressBar,
  Skeleton,
} from "./ui";
import { DIAS, horaCorta, mensajeError } from "./utils";

type MiActividadPisuProps = {
  onError: (valor: string) => void;
  onNavegar?: (vista: string) => void;
};

export default function MiActividadPisu({ onError, onNavegar }: MiActividadPisuProps) {
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
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  const diasConClase = DIAS.map((etiqueta, indice) => ({
    etiqueta,
    indice,
    clases: horarios.filter((horario) => horario.dia_semana === indice),
  })).filter((dia) => dia.clases.length > 0);
  const hoy = new Date().getDay();
  const promedio =
    resumen.length > 0
      ? Math.round(
          resumen.reduce((total, fila) => total + fila.porcentaje, 0) /
            resumen.length,
        )
      : 0;
  const totalPresentes = resumen.reduce((total, fila) => total + fila.presentes, 0);
  const totalAusentes = resumen.reduce((total, fila) => total + fila.ausentes, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mi actividad"
        description="Tu horario semanal y el historial de asistencia a las clases PISU."
      />

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
            <Icon nombre="calendario" className="h-5 w-5 text-uni-cian" />
            Mi horario semanal
          </h2>
          <Badge tone="info">
            {horarios.length} clase{horarios.length === 1 ? "" : "s"}
          </Badge>
        </div>
        {diasConClase.length === 0 ? (
          <EmptyState
            title="Aún no tienes clases"
            description="Inscríbete a un deporte desde el catálogo y tu horario aparecerá aquí."
            icono="horario"
            action={
              onNavegar ? (
                <Button onClick={() => onNavegar("catalogo")}>
                  <Icon nombre="catalogo" className="h-4 w-4" />
                  Ver catálogo
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {diasConClase.map((dia) => {
              const esHoy = dia.indice === hoy;
              return (
                <article
                  key={dia.etiqueta}
                  className={`rounded-2xl border p-4 transition-colors ${
                    esHoy
                      ? "border-uni-cian/40 bg-uni-cian/[0.07] shadow-lg shadow-uni-cian/5"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold uppercase tracking-wide text-uni-cian">
                      {dia.etiqueta}
                    </p>
                    {esHoy ? <Badge tone="info">Hoy</Badge> : null}
                  </div>
                  <ul className="mt-3 space-y-3">
                    {dia.clases.map((clase) => (
                      <li
                        key={clase.id}
                        className="rounded-xl border border-white/10 bg-uni-noche/50 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-white">
                            {clase.deporte?.nombre ?? "Deporte"}
                          </p>
                          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-200">
                            {horaCorta(clase.hora_inicio)}–{horaCorta(clase.hora_fin)}
                          </span>
                        </div>
                        <p className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-400">
                          <Icon nombre="ubicacion" className="h-3.5 w-3.5 text-uni-cian" />
                          {clase.lugar}
                        </p>
                        {clase.docente ? (
                          <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                            <Icon nombre="perfil" className="h-3.5 w-3.5 text-uni-cian" />
                            {clase.docente.nombre}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-white">
            <Icon nombre="check" className="h-5 w-5 text-uni-cian" />
            Mi asistencia
          </h2>
          {resumen.length > 0 ? (
            <p className="text-xs text-slate-400">
              {totalPresentes} asistencias · {totalAusentes} inasistencias
            </p>
          ) : null}
        </div>
        {resumen.length === 0 ? (
          <EmptyState
            title="Todavía no hay asistencias registradas"
            description="Cuando tu docente llame a lista, verás aquí tu historial por disciplina."
            icono="medalla"
          />
        ) : (
          <>
            <div className="mb-4 flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:flex-row">
              <AnilloProgreso
                valor={promedio}
                etiqueta="Promedio"
                detalle={`${resumen.length} disciplina${resumen.length === 1 ? "" : "s"}`}
                tamano={124}
              />
              <div className="flex-1 space-y-3">
                {resumen.map((fila) => (
                  <div key={fila.deporte_id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-200">{fila.deporte}</span>
                      <span className="text-slate-400">
                        {fila.presentes}/{fila.presentes + fila.ausentes}
                      </span>
                    </div>
                    <ProgressBar
                      value={fila.porcentaje}
                      tone={
                        fila.porcentaje >= 80
                          ? "success"
                          : fila.porcentaje >= 60
                            ? "warning"
                            : "danger"
                      }
                    />
                  </div>
                ))}
              </div>
            </div>

            <ul className="divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10">
              {asistencias.slice(0, 20).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 bg-white/[0.03] px-4 py-2.5 text-sm transition-colors hover:bg-white/[0.06]"
                >
                  <span className="inline-flex items-center gap-2 text-slate-200">
                    <Icon nombre="calendario" className="h-4 w-4 text-slate-500" />
                    {item.fecha} · {item.horario?.deporte?.nombre ?? "Clase"}
                  </span>
                  <Badge tone={item.presente ? "success" : "danger"}>
                    {item.presente ? "Presente" : "Ausente"}
                  </Badge>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
