/**
 * \"Mis deportes\" del rol Estudiante (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Muestra las disciplinas en las que el estudiante está inscrito y permite
 * cancelar la inscripción. Si no tiene ninguna, invita a ir al catálogo.
 *
 * ¿Cómo se relaciona con los demás?
 * Usa `obtenerInscripcionesPisu` y `cancelarInscripcionPisu`. El catálogo se
 * muestra en la pantalla `catalogo`. Arriba muestra la tarjeta \"Mi perfil\"
 * (`CompletarPerfilPisu`) para ver los datos verificados y completar la
 * categoría académica (sección 10.1).
 */

import { useCallback, useEffect, useState } from "react";
import { cancelarInscripcionPisu, obtenerInscripcionesPisu } from "../../api/deporte";
import type { InscripcionPisu, PerfilPisu } from "../../types/deporte";
import CompletarPerfilPisu from "./CompletarPerfilPisu";
import { CoverDeporte } from "./estudianteUI";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Skeleton,
} from "./ui";
import { fechaLocal, mensajeError } from "./utils";

type Props = {
  perfil: PerfilPisu | null;
  onAviso: (mensaje: string, accion?: string) => void;
  onError: (mensaje: string) => void;
  onNavegar: (vista: string) => void;
  onRecargar: () => Promise<void>;
};

/** Muestra la tarjeta "Mi perfil" solo cuando el servidor ya entregó el perfil. */
function PerfilPisuCard({
  perfil,
  onAviso,
  onError,
  onRecargar,
}: {
  perfil: PerfilPisu | null;
  onAviso: (mensaje: string, accion?: string) => void;
  onError: (mensaje: string) => void;
  onRecargar: () => Promise<void>;
}) {
  if (!perfil) {
    return null;
  }
  return (
    <CompletarPerfilPisu
      perfil={perfil}
      onAviso={onAviso}
      onError={onError}
      onRecargar={onRecargar}
    />
  );
}

export default function EstudianteMisDeportes({
  perfil,
  onAviso,
  onError,
  onNavegar,
  onRecargar,
}: Props) {
  const [inscripciones, setInscripciones] = useState<InscripcionPisu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [porCancelar, setPorCancelar] = useState<InscripcionPisu | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga(null);
    try {
      const lista = await obtenerInscripcionesPisu();
      setInscripciones(lista.filter((item) => item.estado === "Activa"));
    } catch (err) {
      setErrorCarga(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function cancelar(inscripcion: InscripcionPisu) {
    setEnviandoId(inscripcion.id);
    try {
      await cancelarInscripcionPisu(inscripcion.id);
      onAviso(`Cancelaste tu inscripción a ${inscripcion.deporte?.nombre ?? "el deporte"}.`);
      await cargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setEnviandoId(null);
    }
  }

  if (cargando) {
    return (
      <div className="space-y-4">
        <PerfilPisuCard
          perfil={perfil}
          onAviso={onAviso}
          onError={onError}
          onRecargar={onRecargar}
        />
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
            >
              <Skeleton className="h-32 w-full rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (errorCarga) {
    return (
      <div className="space-y-4">
        <PerfilPisuCard
          perfil={perfil}
          onAviso={onAviso}
          onError={onError}
          onRecargar={onRecargar}
        />
        <ErrorState message={errorCarga} onRetry={() => void cargar()} />
      </div>
    );
  }

  if (inscripciones.length === 0) {
    return (
      <div className="space-y-4">
        <PerfilPisuCard
          perfil={perfil}
          onAviso={onAviso}
          onError={onError}
          onRecargar={onRecargar}
        />
        <PageHeader
          title="Mis deportes"
          description="Aquí verás las disciplinas en las que estás inscrito."
        />
        <EmptyState
          title="Aún no estás en ningún deporte"
          description="Explora el catálogo, revisa horarios y cupos, e inscríbete en la disciplina que más te guste."
          icono="deportes"
          action={
            <Button onClick={() => onNavegar("catalogo")}>
              <Icon nombre="catalogo" className="h-4 w-4" />
              Ir al catálogo
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PerfilPisuCard
        perfil={perfil}
        onAviso={onAviso}
        onError={onError}
        onRecargar={onRecargar}
      />
      <PageHeader
        title="Mis deportes"
        description="Tus disciplinas activas, con acceso directo a tu horario semanal."
        action={
          <Badge tone="success">
            <Icon nombre="check" className="h-3.5 w-3.5" />
            {inscripciones.length} activa{inscripciones.length === 1 ? "" : "s"}
          </Badge>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {inscripciones.map((inscripcion) => {
          const nombre = inscripcion.deporte?.nombre ?? "Deporte";
          return (
            <article
              key={inscripcion.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition-all duration-300 hover:border-uni-cian/30 hover:shadow-lg hover:shadow-black/20"
            >
              <CoverDeporte nombre={nombre} className="h-32 rounded-none">
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-4">
                  <p className="truncate text-lg font-bold text-white">{nombre}</p>
                  <Badge tone="success">Activa</Badge>
                </div>
              </CoverDeporte>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <p className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                  <Icon nombre="calendario" className="h-3.5 w-3.5 text-uni-cian" />
                  Inscrito desde {fechaLocal(new Date(inscripcion.fecha_inscripcion))}
                </p>
                <div className="mt-auto flex flex-wrap gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => onNavegar("horario")}
                  >
                    <Icon nombre="horario" className="h-4 w-4" />
                    Ver horario
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    loading={enviandoId === inscripcion.id}
                    onClick={() => setPorCancelar(inscripcion)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(porCancelar)}
        message={`¿Deseas cancelar tu inscripción a ${porCancelar?.deporte?.nombre ?? "este deporte"}? Podrás volver a inscribirte si hay cupo disponible.`}
        confirmLabel="Cancelar inscripción"
        onCancel={() => setPorCancelar(null)}
        onConfirm={() => {
          const inscripcion = porCancelar;
          setPorCancelar(null);
          if (inscripcion) void cancelar(inscripcion);
        }}
      />
    </div>
  );
}
