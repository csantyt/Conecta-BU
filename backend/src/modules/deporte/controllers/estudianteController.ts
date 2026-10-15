import type { Request, Response } from "express";
import {
  listarAsistenciasEstudiante,
  listarHorariosDeInscripciones,
  listarInscripcionesEstudiante,
  completarPerfilEstudiante,
  obtenerMiHorario,
} from "../services/estudianteService.js";
import {
  CupoEventoAgotadoError,
  CategoriaEventoNoPermitidaError,
  CruceHorarioEventoError,
  EventoCerradoError,
  EventoNoEncontradoError,
  NoInscritoEventoError,
  OperacionEventoNoPermitidaError,
  PlazoEventoVencidoError,
  YaInscritoEventoError,
  cancelarInscripcionAEvento,
  inscribirseAEvento,
  listarMisEventosEstudiante,
} from "../services/eventosService.js";
import {
  CategoriaNoPermitidaError,
  CruceHorarioError,
  CupoAgotadoError,
  DatosInvalidosError,
  OperacionNoPermitidaError,
  PlazoVencidoError,
  RecursoNoEncontradoError,
  YaInscritoError,
  autoinscribirseADeporte,
  cancelarInscripcionDeporte,
} from "../services/inscripcionesService.js";
import { autoinscripcionSchema, completarPerfilEstudianteSchema, uuidSchema } from "../validators.js";

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

/** Eventos en los que el estudiante está inscrito (incluye los cancelados). */
export async function getMisEventosEstudiante(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const eventos = await listarMisEventosEstudiante(perfil);
  res.status(200).json({ eventos });
}

/**
 * Completa el perfil del estudiante con datos que la universidad no expone por
 * Google (sección 10.1: no inventar datos personales). Por ahora la categoría.
 */
export async function patchPerfilEstudiante(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const parsed = completarPerfilEstudianteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Categoría inválida. Elige Pregrado, Postgrado o Egresado.",
    });
    return;
  }
  const ficha = await completarPerfilEstudiante(perfil, {
    categoria: parsed.data.categoria,
  });
  res.status(200).json({
    perfil: {
      id: ficha.id,
      auth_usuario_id: ficha.auth_usuario_id ?? null,
      nombre: ficha.nombre,
      correo: ficha.correo,
      rol: ficha.rol,
      categoria: ficha.categoria ?? null,
      estado: ficha.estado,
    },
  });
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

export async function getMiHorario(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const resultado = await obtenerMiHorario(perfil);
  res.status(200).json(resultado);
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
    res.status(409).json({ message: error.message });
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
  if (
    error instanceof PlazoEventoVencidoError ||
    error instanceof CategoriaEventoNoPermitidaError ||
    error instanceof CruceHorarioEventoError
  ) {
    res.status(409).json({
      message: error.message,
      codigo:
        error instanceof PlazoEventoVencidoError
          ? "PLAZO_VENCIDO"
          : error instanceof CategoriaEventoNoPermitidaError
            ? "CATEGORIA_NO_PERMITIDA"
            : "CRUCE_HORARIO",
    });
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
    error instanceof YaInscritoError ||
    error instanceof PlazoVencidoError
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

  const idParam = (req.params["id"] as string | undefined) ?? undefined;
  const rawBody = (req.body ?? {}) as Record<string, unknown>;
  const deporteIdBody =
    typeof rawBody["deporte_id"] === "string" ? (rawBody["deporte_id"] as string) : undefined;
  const deporteId = idParam || deporteIdBody;

  if (!deporteId || !uuidSchema.safeParse(deporteId).success) {
    res.status(400).json({ message: "deporte_id inválido." });
    return;
  }

  try {
    const inscripcion = await autoinscribirseADeporte({
      perfil,
      deporteId,
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
