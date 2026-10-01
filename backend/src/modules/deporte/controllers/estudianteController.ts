import type { Request, Response } from "express";
import {
  listarAsistenciasEstudiante,
  listarHorariosDeInscripciones,
  listarInscripcionesEstudiante,
} from "../services/estudianteService.js";
import {
  CupoEventoAgotadoError,
  EventoCerradoError,
  EventoNoEncontradoError,
  NoInscritoEventoError,
  OperacionEventoNoPermitidaError,
  YaInscritoEventoError,
  cancelarInscripcionAEvento,
  inscribirseAEvento,
} from "../services/eventosService.js";
import {
  CategoriaNoPermitidaError,
  CruceHorarioError,
  CupoAgotadoError,
  DatosInvalidosError,
  OperacionNoPermitidaError,
  RecursoNoEncontradoError,
  YaInscritoError,
  autoinscribirseADeporte,
  cancelarInscripcionDeporte,
} from "../services/inscripcionesService.js";
import { autoinscripcionSchema, uuidSchema } from "../validators.js";

export async function getPerfilEstudiante(
  req: Request,
  res: Response,
): Promise<void> {
  res.status(200).json({ perfil: req.usuarioPisu });
}

export async function getInscripciones(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const inscripciones = await listarInscripcionesEstudiante(perfil);
  res.status(200).json({ inscripciones });
}

export async function getHorariosEstudiante(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const horarios = await listarHorariosDeInscripciones(perfil);
  res.status(200).json({ horarios });
}

export async function getAsistenciasEstudiante(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const resultado = await listarAsistenciasEstudiante(perfil);
  res.status(200).json(resultado);
}

function idDeRuta(req: Request): string | null {
  const valor = req.params["id"];
  const id = Array.isArray(valor) ? valor[0] : valor;
  return id || null;
}

function responderErrorEvento(res: Response, error: unknown): boolean {
  if (error instanceof EventoNoEncontradoError) {
    res.status(404).json({ message: error.message });
    return true;
  }
  if (error instanceof OperacionEventoNoPermitidaError) {
    res.status(403).json({ message: error.message });
    return true;
  }
  if (error instanceof EventoCerradoError) {
    res.status(400).json({ message: error.message });
    return true;
  }
  if (
    error instanceof CupoEventoAgotadoError ||
    error instanceof YaInscritoEventoError ||
    error instanceof NoInscritoEventoError
  ) {
    res.status(409).json({ message: error.message });
    return true;
  }
  return false;
}

export async function postInscripcionEvento(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const eventoId = idDeRuta(req);
  if (!eventoId || !uuidSchema.safeParse(eventoId).success) {
    res.status(400).json({ message: "Identificador de evento inválido." });
    return;
  }

  try {
    const inscripcion = await inscribirseAEvento({ perfil, eventoId });
    res.status(201).json({ message: "Inscripción al evento realizada.", inscripcion });
  } catch (error) {
    if (!responderErrorEvento(res, error)) {
      throw error;
    }
  }
}

export async function deleteInscripcionEvento(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const eventoId = idDeRuta(req);
  if (!eventoId || !uuidSchema.safeParse(eventoId).success) {
    res.status(400).json({ message: "Identificador de evento inválido." });
    return;
  }

  try {
    await cancelarInscripcionAEvento({ perfil, eventoId });
    res.status(200).json({ message: "Inscripción al evento cancelada." });
  } catch (error) {
    if (!responderErrorEvento(res, error)) {
      throw error;
    }
  }
}

function responderErrorInscripcion(res: Response, error: unknown): boolean {
  if (error instanceof DatosInvalidosError) {
    res.status(400).json({ message: error.message });
    return true;
  }
  if (error instanceof RecursoNoEncontradoError) {
    res.status(404).json({ message: error.message });
    return true;
  }
  if (error instanceof OperacionNoPermitidaError) {
    res.status(403).json({ message: error.message });
    return true;
  }
  if (
    error instanceof CategoriaNoPermitidaError ||
    error instanceof CupoAgotadoError ||
    error instanceof CruceHorarioError ||
    error instanceof YaInscritoError
  ) {
    res.status(409).json({ message: error.message });
    return true;
  }
  return false;
}

export async function postAutoinscripcion(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }

  const parsed = autoinscripcionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "deporte_id inválido." });
    return;
  }

  try {
    const inscripcion = await autoinscribirseADeporte({
      perfil,
      deporteId: parsed.data.deporte_id,
    });
    res.status(201).json({
      message: "Inscripción realizada correctamente.",
      inscripcion,
    });
  } catch (error) {
    if (!responderErrorInscripcion(res, error)) {
      throw error;
    }
  }
}

export async function patchCancelarInscripcion(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }

  const idParam = req.params["id"];
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) {
    res.status(400).json({ message: "Identificador inválido." });
    return;
  }

  try {
    await cancelarInscripcionDeporte({ perfil, inscripcionId: id });
    res.status(200).json({ message: "Inscripción cancelada." });
  } catch (error) {
    if (!responderErrorInscripcion(res, error)) {
      throw error;
    }
  }
}
