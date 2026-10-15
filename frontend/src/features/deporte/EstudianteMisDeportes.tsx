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
import { Button, Card, EmptyState, ErrorState, Skeleton } from "./ui";
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
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
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
        <EmptyState
          title="Aún no estás en ningún deporte"
          description="Explora el catálogo e inscríbete en una disciplina."
        />
        <Button onClick={() => onNavegar("catalogo")}>Ir al catálogo</Button>
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
      <h1 className="text-2xl font-bold">Mis deportes</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {inscripciones.map((inscripcion) => (
          <Card key={inscripcion.id} className="flex flex-col gap-2">
            <p className="text-lg font-semibold">{inscripcion.deporte?.nombre ?? "Deporte"}</p>
            <p className="text-xs text-slate-400">
              Inscrito desde {fechaLocal(new Date(inscripcion.fecha_inscripcion))}
            </p>
            <Button
              variant="secondary"
              disabled={enviandoId === inscripcion.id}
              onClick={() => void cancelar(inscripcion)}
            >
              Cancelar inscripción
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
