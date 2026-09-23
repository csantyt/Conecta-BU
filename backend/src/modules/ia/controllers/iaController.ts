import type { Request, Response } from "express";
import type { AuthUser } from "../../../middlewares/authMiddleware.js";
import {
  listarEventosDisponiblesParaIa,
  SERVICIOS_CONTEXTO_IA,
} from "../contextoDesarrolloHumano.js";
import {
  extraerRecomendaciones,
  extraerTextoAsistente,
  pareceConsultaClinica,
  postWebhookN8n,
  type RecomendacionIa,
} from "../n8nClient.js";
import { mensajeChatSchema } from "../validators.js";

function usuarioAutenticado(req: Request, res: Response): AuthUser | null {
  const usuario = req.user;
  if (!usuario) {
    res.status(401).json({ message: "No autenticado." });
    return null;
  }
  return usuario;
}

const RESPUESTA_RN011 =
  "No puedo dar diagnósticos psicológicos, prescripciones ni atención clínica. Si necesitas acompañamiento profesional, agenda una cita de orientación en Desarrollo humano y orientación → Citas.";

export async function consultarOrientacion(req: Request, res: Response): Promise<void> {
  const usuario = usuarioAutenticado(req, res);
  if (!usuario) {
    return;
  }

  const parsed = mensajeChatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos.", errors: parsed.error.flatten() });
    return;
  }

  const consultaClinica = pareceConsultaClinica(parsed.data.mensaje);

  try {
    const payloadN8n = await postWebhookN8n("orientacion", {
      mensaje: parsed.data.mensaje,
      historial: parsed.data.historial ?? [],
      consulta_clinica: consultaClinica,
      regla_rn011: true,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      },
      servicios: SERVICIOS_CONTEXTO_IA,
    });

    const respuesta =
      extraerTextoAsistente(payloadN8n) ??
      (consultaClinica ? RESPUESTA_RN011 : null);

    if (!respuesta) {
      res.status(502).json({
        message: "El asistente no devolvió una respuesta válida.",
      });
      return;
    }

    res.status(200).json({
      respuesta,
      consulta_clinica: consultaClinica,
      fuente: "n8n",
    });
  } catch (error) {
    const motivo = error instanceof Error ? error.message : "ERROR";
    if (motivo === "WEBHOOK_NO_CONFIGURADO") {
      res.status(200).json({
        respuesta: consultaClinica
          ? RESPUESTA_RN011
          : "El asistente de orientación aún no está conectado a n8n. Mientras tanto puedes agendar una cita o inscribirte a un evento en Desarrollo humano y orientación.",
        consulta_clinica: consultaClinica,
        fuente: "local",
      });
      return;
    }

    res.status(502).json({
      message: "No se pudo contactar al asistente de orientación. Inténtalo de nuevo.",
    });
  }
}

export async function consultarRecomendaciones(
  req: Request,
  res: Response,
): Promise<void> {
  const usuario = usuarioAutenticado(req, res);
  if (!usuario) {
    return;
  }

  const eventos = await listarEventosDisponiblesParaIa();
  if (eventos.length === 0) {
    res.status(200).json({ recomendaciones: [], fuente: "local" });
    return;
  }

  try {
    const payloadN8n = await postWebhookN8n("recomendaciones", {
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      },
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

    const idsValidos = new Set(eventos.map((evento) => evento.id));
    const ordenadas = extraerRecomendaciones(payloadN8n)
      .filter((item) => idsValidos.has(item.evento_id))
      .slice(0, 3);

    const seleccion: RecomendacionIa[] =
      ordenadas.length > 0
        ? ordenadas
        : eventos.slice(0, 3).map((evento) => ({ evento_id: evento.id }));

    const recomendaciones = [];
    for (const item of seleccion) {
      const evento = eventos.find((fila) => fila.id === item.evento_id);
      if (!evento) {
        continue;
      }
      recomendaciones.push({
        id: evento.id,
        titulo: evento.titulo,
        descripcion: evento.descripcion,
        fecha_inicio: evento.fecha_inicio,
        cupo_disponible: evento.cupo_disponible,
        motivo:
          item.motivo ??
          "Actividad de Desarrollo humano con cupo disponible en las próximas fechas.",
      });
    }

    res.status(200).json({
      recomendaciones,
      fuente: ordenadas.length > 0 ? "n8n" : "local",
    });
  } catch {
    const recomendaciones = [];
    for (const evento of eventos.slice(0, 3)) {
      recomendaciones.push({
        id: evento.id,
        titulo: evento.titulo,
        descripcion: evento.descripcion,
        fecha_inicio: evento.fecha_inicio,
        cupo_disponible: evento.cupo_disponible,
        motivo:
          "Evento próximo con cupo disponible. Conecta n8n para recomendaciones personalizadas.",
      });
    }
    res.status(200).json({ recomendaciones, fuente: "local" });
  }
}
