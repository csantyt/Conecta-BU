import { api } from "./http";

export type MensajeChat = {
  rol: "usuario" | "asistente";
  contenido: string;
};

export type RespuestaOrientacion = {
  respuesta: string;
  consulta_clinica: boolean;
  fuente: "n8n" | "local";
};

export type EventoSugerido = {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  cupo_disponible: number;
  motivo: string;
};

export async function consultarOrientacion(
  mensaje: string,
  historial: MensajeChat[],
): Promise<RespuestaOrientacion> {
  const { data } = await api.post<RespuestaOrientacion>("/ia/orientacion", {
    mensaje,
    historial,
  });
  return data;
}

export async function consultarRecomendaciones(): Promise<{
  recomendaciones: EventoSugerido[];
  fuente: "n8n" | "local";
}> {
  const { data } = await api.post<{
    recomendaciones: EventoSugerido[];
    fuente: "n8n" | "local";
  }>("/ia/recomendaciones");
  return data;
}
