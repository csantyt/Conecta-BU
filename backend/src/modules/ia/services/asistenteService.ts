import {
  listarEventosDisponiblesParaIa,
  SERVICIOS_CONTEXTO_IA,
  type EventoDisponible,
} from "../contextoDesarrolloHumano.js";
import {
  extraerRecomendaciones,
  extraerTextoAsistente,
  postWebhookN8n,
  webhookN8nConfigurado,
  type RecomendacionIa,
} from "../n8nClient.js";
import { promptOrientacion, promptRecomendaciones } from "../prompts.js";
import {
  completarChat,
  configuracionIa,
  extraerJson,
  type MensajeIa,
} from "../proveedorIa.js";
import {
  motivoLocal,
  pareceConsultaClinica,
  pareceCrisis,
  RESPUESTA_CRISIS,
  RESPUESTA_RN011,
  responderLocalmente,
} from "../respuestasLocales.js";

export type FuenteIa = "ia" | "n8n" | "local";

export type MensajeHistorial = { rol: "usuario" | "asistente"; contenido: string };

export type UsuarioAsistente = { id: string; email: string; rol: string };

export type DependenciasAsistente = {
  listarEventos: () => Promise<EventoDisponible[]>;
  completar: (mensajes: MensajeIa[]) => Promise<string>;
  iaConfigurada: () => boolean;
  n8nConfigurado: (tipo: "orientacion" | "recomendaciones") => boolean;
  llamarN8n: typeof postWebhookN8n;
  avisar: (mensaje: string) => void;
};

const dependenciasReales: DependenciasAsistente = {
  listarEventos: listarEventosDisponiblesParaIa,
  completar: (mensajes) => completarChat(mensajes),
  iaConfigurada: () => configuracionIa() !== null,
  n8nConfigurado: webhookN8nConfigurado,
  llamarN8n: postWebhookN8n,
  avisar: (mensaje) => console.warn(mensaje),
};

function motivoDeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function eventosSinFallar(deps: DependenciasAsistente): Promise<EventoDisponible[]> {
  try {
    return await deps.listarEventos();
  } catch {
    return [];
  }
}

export type RespuestaOrientacion = {
  respuesta: string;
  consulta_clinica: boolean;
  fuente: FuenteIa;
};

export async function responderOrientacion(
  entrada: { mensaje: string; historial: MensajeHistorial[]; usuario: UsuarioAsistente },
  deps: DependenciasAsistente = dependenciasReales,
): Promise<RespuestaOrientacion> {
  const { mensaje, historial, usuario } = entrada;

  // RN-011: lo clínico nunca se envía a un servicio externo.
  if (pareceCrisis(mensaje)) {
    return { respuesta: RESPUESTA_CRISIS, consulta_clinica: true, fuente: "local" };
  }
  if (pareceConsultaClinica(mensaje)) {
    return { respuesta: RESPUESTA_RN011, consulta_clinica: true, fuente: "local" };
  }

  if (deps.iaConfigurada()) {
    try {
      const eventos = await eventosSinFallar(deps);
      const respuesta = await deps.completar([
        { role: "system", content: promptOrientacion(eventos) },
        ...historial.map<MensajeIa>((item) => ({
          role: item.rol === "usuario" ? "user" : "assistant",
          content: item.contenido,
        })),
        { role: "user", content: mensaje },
      ]);
      return { respuesta, consulta_clinica: false, fuente: "ia" };
    } catch (error) {
      deps.avisar(`Asistente IA no disponible (${motivoDeError(error)}). Se usa el respaldo.`);
    }
  }

  if (deps.n8nConfigurado("orientacion")) {
    try {
      const payload = await deps.llamarN8n("orientacion", {
        mensaje,
        historial,
        consulta_clinica: false,
        regla_rn011: true,
        usuario: { id: usuario.id, email: usuario.email, rol: usuario.rol },
        servicios: SERVICIOS_CONTEXTO_IA,
      });
      const respuesta = extraerTextoAsistente(payload);
      if (respuesta) {
        return { respuesta, consulta_clinica: false, fuente: "n8n" };
      }
    } catch (error) {
      deps.avisar(`n8n no disponible (${motivoDeError(error)}). Se usa el respaldo local.`);
    }
  }

  return { respuesta: responderLocalmente(mensaje), consulta_clinica: false, fuente: "local" };
}

export type EventoRecomendado = {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: Date;
  cupo_disponible: number;
  motivo: string;
};

function armarRecomendaciones(
  eventos: EventoDisponible[],
  seleccion: RecomendacionIa[],
): EventoRecomendado[] {
  const resultado: EventoRecomendado[] = [];
  for (const item of seleccion) {
    const evento = eventos.find((fila) => fila.id === item.evento_id);
    if (!evento || resultado.some((fila) => fila.id === evento.id)) {
      continue;
    }
    resultado.push({
      id: evento.id,
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      fecha_inicio: evento.fecha_inicio,
      cupo_disponible: evento.cupo_disponible,
      motivo: item.motivo?.trim() || motivoLocal(evento),
    });
  }
  return resultado.slice(0, 3);
}

export async function recomendarEventos(
  usuario: UsuarioAsistente,
  deps: DependenciasAsistente = dependenciasReales,
): Promise<{ recomendaciones: EventoRecomendado[]; fuente: FuenteIa }> {
  const eventos = await deps.listarEventos();
  if (eventos.length === 0) {
    return { recomendaciones: [], fuente: "local" };
  }

  if (deps.iaConfigurada()) {
    try {
      const texto = await deps.completar([
        { role: "system", content: promptRecomendaciones(eventos) },
        { role: "user", content: `Recomienda eventos para un usuario con rol ${usuario.rol}.` },
      ]);
      const recomendaciones = armarRecomendaciones(
        eventos,
        extraerRecomendaciones(extraerJson(texto)),
      );
      if (recomendaciones.length > 0) {
        return { recomendaciones, fuente: "ia" };
      }
      deps.avisar("La IA no devolvió recomendaciones válidas. Se usa el respaldo.");
    } catch (error) {
      deps.avisar(`Recomendador IA no disponible (${motivoDeError(error)}). Se usa el respaldo.`);
    }
  }

  if (deps.n8nConfigurado("recomendaciones")) {
    try {
      const payload = await deps.llamarN8n("recomendaciones", {
        usuario: { id: usuario.id, email: usuario.email, rol: usuario.rol },
        instruccion:
          "Selecciona 2 o 3 eventos o talleres más pertinentes. Devuelve JSON { recomendaciones: [{ evento_id, motivo }] } usando solo ids de la lista. No diagnostiques ni indiques tratamiento (RN-011).",
        eventos: eventos.map((evento) => ({
          id: evento.id,
          titulo: evento.titulo,
          descripcion: evento.descripcion,
          fecha_inicio: evento.fecha_inicio,
          cupo_disponible: evento.cupo_disponible,
        })),
      });
      const recomendaciones = armarRecomendaciones(eventos, extraerRecomendaciones(payload));
      if (recomendaciones.length > 0) {
        return { recomendaciones, fuente: "n8n" };
      }
    } catch (error) {
      deps.avisar(`n8n no disponible (${motivoDeError(error)}). Se usa el respaldo local.`);
    }
  }

  return {
    recomendaciones: armarRecomendaciones(
      eventos,
      eventos.slice(0, 3).map((evento) => ({ evento_id: evento.id })),
    ),
    fuente: "local",
  };
}
