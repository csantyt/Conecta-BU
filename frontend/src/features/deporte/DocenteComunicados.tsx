/**
 * Pantalla "Comunicados" del rol Docente (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Centro de notificaciones del docente: alertas dirigidas a "Docentes" y "Todos"
 * (con su badge en el menú) y los próximos eventos activos.
 */

import { useCallback, useEffect, useState } from "react";
import { obtenerAlertasPisu, obtenerEventosPisu } from "../../api/deporte";
import type { AlertaPisu, EventoPisu } from "../../types/deporte";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Skeleton } from "./ui";
import { mensajeError } from "./utils";

type Props = {
  onError: (mensaje: string) => void;
};

export default function DocenteComunicados({ onError }: Props) {
  const [alertas, setAlertas] = useState<AlertaPisu[]>([]);
  const [eventos, setEventos] = useState<EventoPisu[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [listaAlertas, listaEventos] = await Promise.all([
        obtenerAlertasPisu(),
        obtenerEventosPisu(),
      ]);
      setAlertas(listaAlertas);
      setEventos(listaEventos);
    } catch (err) {
      const mensaje = mensajeError(err);
      setError(mensaje);
      onError(mensaje);
    } finally {
      setCargando(false);
    }
  }, [onError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (cargando) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void cargar()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicados"
        description="Alertas y eventos dirigidos a los docentes."
      />

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Alertas</h2>
        {alertas.length === 0 ? (
          <EmptyState title="Sin alertas por ahora" />
        ) : (
          alertas.map((alerta) => (
            <Card key={alerta.id} className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{alerta.titulo}</p>
                <Badge tone={alerta.audiencia === "Docentes" ? "warning" : "neutral"}>
                  {alerta.audiencia}
                </Badge>
              </div>
              <p className="text-sm text-slate-300">{alerta.mensaje}</p>
              <p className="text-xs text-slate-500">
                {new Date(alerta.fecha_creacion).toLocaleDateString("es-CO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Próximos eventos</h2>
        {eventos.length === 0 ? (
          <EmptyState title="Sin eventos próximos" />
        ) : (
          eventos.map((evento) => (
            <Card key={evento.id} className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{evento.nombre}</p>
                <Badge>{new Date(evento.fecha).toLocaleDateString("es-CO")}</Badge>
              </div>
              <p className="text-sm text-slate-300">{evento.descripcion ?? "Sin descripción"}</p>
              <p className="text-xs text-slate-500">{evento.lugar}</p>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
