import type { Request, Response } from "express";
import type { AuthUser } from "../../../middlewares/authMiddleware.js";
import { ConsultaIa } from "../../desarrollo-humano/models/ConsultaIa.js";
import {
  recomendarEventos,
  responderOrientacion,
  type FuenteIa,
} from "../services/asistenteService.js";
import { mensajeChatSchema } from "../validators.js";

async function registrarConsultaIa(params: {
  usuarioId: string;
  consultaClinica: boolean;
  fuente: FuenteIa;
}): Promise<void> {
  try {
    await ConsultaIa.create({
      usuario_id: params.usuarioId,
      consulta_clinica: params.consultaClinica,
      fuente: params.fuente,
    });
  } catch {
    // El chat no debe fallar si el conteo del dashboard no se pudo guardar.
  }
}

function usuarioAutenticado(req: Request, res: Response): AuthUser | null {
  const usuario = req.user;
  if (!usuario) {
    res.status(401).json({ message: "No autenticado." });
    return null;
  }
  return usuario;
}

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

  const resultado = await responderOrientacion({
    mensaje: parsed.data.mensaje,
    historial: parsed.data.historial ?? [],
    usuario: { id: usuario.id, email: usuario.email, rol: usuario.rol },
  });

  await registrarConsultaIa({
    usuarioId: usuario.id,
    consultaClinica: resultado.consulta_clinica,
    fuente: resultado.fuente,
  });

  res.status(200).json(resultado);
}

export async function consultarRecomendaciones(
  req: Request,
  res: Response,
): Promise<void> {
  const usuario = usuarioAutenticado(req, res);
  if (!usuario) {
    return;
  }

  const resultado = await recomendarEventos({
    id: usuario.id,
    email: usuario.email,
    rol: usuario.rol,
  });

  res.status(200).json(resultado);
}
