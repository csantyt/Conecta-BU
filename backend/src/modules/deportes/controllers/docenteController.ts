import type { Request, Response } from "express";
import {
  ClaseNoAsignadaError,
  DatosAsistenciaInvalidosError,
  EstudianteNoInscritoError,
  RecursoDocenteNoEncontradoError,
  VentanaAsistenciaCerradaError,
  editarAsistencia,
  listarAsistenciasDocente,
  listarEstudiantesDeClase,
  listarMisClases,
  registrarAsistenciaLista,
} from "../services/docenteService.js";
import {
  editarAsistenciaSchema,
  registrarAsistenciaSchema,
} from "../validators.js";

function idDeRuta(req: Request, nombre: string): string | null {
  const valor = req.params[nombre];
  const id = Array.isArray(valor) ? valor[0] : valor;
  return id || null;
}

function responderErrorDocente(res: Response, error: unknown): boolean {
  if (error instanceof DatosAsistenciaInvalidosError) {
    res.status(400).json({ message: error.message });
    return true;
  }
  if (error instanceof RecursoDocenteNoEncontradoError) {
    res.status(404).json({ message: error.message });
    return true;
  }
  if (error instanceof ClaseNoAsignadaError) {
    res.status(403).json({ message: error.message });
    return true;
  }
  if (
    error instanceof VentanaAsistenciaCerradaError ||
    error instanceof EstudianteNoInscritoError
  ) {
    res.status(409).json({ message: error.message });
    return true;
  }
  return false;
}

export async function getPerfilDocente(req: Request, res: Response): Promise<void> {
  res.status(200).json({ perfil: req.usuarioPisu });
}

export async function getHorariosDocente(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const horarios = await listarMisClases(perfil);
  res.status(200).json({ horarios });
}

export async function getMisClases(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const clases = await listarMisClases(perfil);
  res.status(200).json({ clases });
}

export async function getEstudiantesDeClase(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }

  const horarioId = idDeRuta(req, "horarioId");
  if (!horarioId) {
    res.status(400).json({ message: "Identificador de clase inválido." });
    return;
  }

  try {
    const resultado = await listarEstudiantesDeClase({ perfil, horarioId });
    res.status(200).json(resultado);
  } catch (error) {
    if (!responderErrorDocente(res, error)) {
      throw error;
    }
  }
}

export async function getAsistenciasDocente(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const fechaParam = req.query["fecha"];
  const fecha = typeof fechaParam === "string" ? fechaParam : undefined;
  const asistencias = await listarAsistenciasDocente(perfil, fecha);
  res.status(200).json({ asistencias });
}

export async function postAsistencia(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }

  const parsed = registrarAsistenciaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Datos inválidos. Se requiere horarioId, fecha (YYYY-MM-DD) y estudiantes[].",
    });
    return;
  }

  try {
    const asistencias = await registrarAsistenciaLista({
      perfil,
      horarioId: parsed.data.horarioId,
      fecha: parsed.data.fecha,
      registros: parsed.data.estudiantes,
    });
    res.status(201).json({
      message: "Asistencia registrada.",
      asistencias,
    });
  } catch (error) {
    if (!responderErrorDocente(res, error)) {
      throw error;
    }
  }
}

export async function putAsistencia(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }

  const asistenciaId = idDeRuta(req, "asistenciaId");
  if (!asistenciaId) {
    res.status(400).json({ message: "Identificador de asistencia inválido." });
    return;
  }

  const parsed = editarAsistenciaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Debes enviar presente (boolean)." });
    return;
  }

  try {
    const asistencia = await editarAsistencia({
      perfil,
      asistenciaId,
      presente: parsed.data.presente,
    });
    res.status(200).json({
      message: "Asistencia actualizada.",
      asistencia,
    });
  } catch (error) {
    if (!responderErrorDocente(res, error)) {
      throw error;
    }
  }
}
