import type { NextFunction, Request, Response } from "express";
import { Asistencia } from "../models/Asistencia.js";
import { AsistenciaDetalle } from "../models/AsistenciaDetalle.js";
import { HorarioDeporte } from "../models/HorarioDeporte.js";
import { asegurarClaseDelDocente } from "../services/docenteService.js";
import type { UsuarioPisuSesion } from "./tipos.js";

type PerfilRequest = Request & { usuarioPisu?: UsuarioPisuSesion };

function responder(res: Response, status: number, message: string): void {
  res.status(status).json({ message });
}

async function middlewarePorHorario(
  horarioId: string | null,
  perfil: UsuarioPisuSesion | undefined,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!perfil) {
    responder(res, 401, "No autenticado.");
    return;
  }
  if (!horarioId) {
    responder(res, 400, "Identificador de clase inválido.");
    return;
  }
  try {
    await asegurarClaseDelDocente({ perfil, horarioId });
    next();
  } catch (error) {
    const mensaje =
      error instanceof Error ? error.message : "Recurso no encontrado.";
    if (mensaje.toLowerCase().includes("no existe")) {
      responder(res, 404, mensaje);
      return;
    }
    responder(res, 403, mensaje);
  }
}

export function propiedadClaseMiddleware(paramName = "horarioId") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const perfil = (req as PerfilRequest).usuarioPisu;
    const valor = req.params[paramName];
    const horarioId = Array.isArray(valor) ? valor[0] ?? null : (valor ?? null);
    await middlewarePorHorario(horarioId, perfil, res, next);
  };
}

export function propiedadClaseBodyMiddleware() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const perfil = (req as PerfilRequest).usuarioPisu;
    const raw = req.body as Record<string, unknown> | undefined;
    const horarioId =
      typeof raw?.["horarioId"] === "string"
        ? raw["horarioId"]
        : typeof raw?.["horario_id"] === "string"
          ? raw["horario_id"]
          : null;
    await middlewarePorHorario(horarioId, perfil, res, next);
  };
}

export async function propiedadAsistenciaMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const perfil = (req as PerfilRequest).usuarioPisu;
  if (!perfil) {
    responder(res, 401, "No autenticado.");
    return;
  }
  const valor = req.params["asistenciaId"];
  const asistenciaId = Array.isArray(valor) ? valor[0] ?? null : valor ?? null;
  if (!asistenciaId) {
    responder(res, 400, "Identificador de asistencia inválido.");
    return;
  }
  const detalle = await AsistenciaDetalle.findByPk(asistenciaId, {
    include: [{ model: Asistencia, as: "asistencia" }],
  });
  if (!detalle) {
    responder(res, 404, "La asistencia no existe.");
    return;
  }
  const asistencia = (detalle as { asistencia?: Asistencia }).asistencia;
  if (!asistencia || asistencia.docente_id !== perfil.id) {
    responder(res, 403, "No puedes gestionar una asistencia que no te pertenece.");
    return;
  }
  next();
}