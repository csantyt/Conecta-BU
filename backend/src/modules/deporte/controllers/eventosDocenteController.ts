/**
 * Controlador de eventos creados por el docente (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Traduce las peticiones HTTP a `eventosDocenteService` y convierte los errores
 * de negocio en códigos claros:
 *   400 datos inválidos · 403 deporte/evento ajeno · 404 no existe ·
 *   409 conflicto de lugar o cupo menor que los inscritos.
 *
 * ¿Cómo se relaciona con los demás?
 * Lo monta `docenteEventosRoutes.ts` bajo `/api/v1/deportes/docente/eventos`,
 * siempre detrás de `authMiddleware` + `soloDocentePisu`.
 */

import type { Request, Response } from "express";
import {
  RecursoDocenteNoEncontradoError,
} from "../services/docenteService.js";
import {
  ClaseNoAsignadaError,
} from "../services/docenteService.js";
import {
  ConflictoEventoDocenteError,
  CupoMenorQueInscritosError,
  EventoDocenteInvalidoError,
  EventoDocenteNoEncontradoError,
  EventoDocenteNoPermitidoError,
  actualizarEventoDocente,
  cancelarEventoDocente,
  construirCsvInscritos,
  crearEventoDocente,
  listarEventosDocente,
  listarInscritosEventoDocente,
} from "../services/eventosDocenteService.js";
import {
  actualizarEventoDocenteSchema,
  cancelarEventoDocenteSchema,
  crearEventoDocenteSchema,
  uuidSchema,
} from "../validators.js";

function idDeRuta(req: Request, nombre: string): string | null {
  const valor = req.params[nombre];
  const id = Array.isArray(valor) ? valor[0] : valor;
  return id || null;
}

/**
 * Convierte un error de negocio en respuesta HTTP.
 * @returns `true` si el error fue reconocido y ya se respondió.
 */
function responderError(res: Response, error: unknown): boolean {
  if (error instanceof EventoDocenteInvalidoError) {
    res.status(400).json({ message: error.message });
    return true;
  }
  if (
    error instanceof EventoDocenteNoEncontradoError ||
    error instanceof RecursoDocenteNoEncontradoError
  ) {
    res.status(404).json({ message: error.message });
    return true;
  }
  if (
    error instanceof EventoDocenteNoPermitidoError ||
    error instanceof ClaseNoAsignadaError
  ) {
    res.status(403).json({ message: error.message });
    return true;
  }
  if (error instanceof CupoMenorQueInscritosError) {
    res.status(409).json({
      message: error.message,
      codigo: "CUPO_MENOR_QUE_INSCRITOS",
      conflicto: { tipo: "cupo", inscritos: error.inscritos },
      alternativas: [],
    });
    return true;
  }
  if (error instanceof ConflictoEventoDocenteError) {
    res.status(409).json({
      message: error.message,
      codigo: error.codigo,
      conflicto: error.conflicto,
      alternativas: error.alternativas,
    });
    return true;
  }
  return false;
}

export async function getEventosDocente(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const eventos = await listarEventosDocente(perfil);
  res.status(200).json({ eventos });
}

export async function postEventoDocente(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const parsed = crearEventoDocenteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message:
        "Datos inválidos. Se requiere nombre, tipo, deporte_id, fecha, hora_inicio, hora_fin, lugar y cupo_maximo.",
    });
    return;
  }
  try {
    const resultado = await crearEventoDocente({ perfil, datos: parsed.data });
    res.status(201).json({
      message: "Evento creado.",
      ...resultado,
    });
  } catch (error) {
    if (!responderError(res, error)) throw error;
  }
}

export async function putEventoDocente(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const eventoId = idDeRuta(req, "id");
  if (!eventoId || !uuidSchema.safeParse(eventoId).success) {
    res.status(400).json({ message: "Identificador de evento inválido." });
    return;
  }
  const parsed = actualizarEventoDocenteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos para actualizar el evento." });
    return;
  }
  try {
    const resultado = await actualizarEventoDocente({
      perfil,
      eventoId,
      datos: parsed.data,
    });
    res.status(200).json({ message: "Evento actualizado.", ...resultado });
  } catch (error) {
    if (!responderError(res, error)) throw error;
  }
}

export async function postCancelarEventoDocente(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const eventoId = idDeRuta(req, "id");
  if (!eventoId || !uuidSchema.safeParse(eventoId).success) {
    res.status(400).json({ message: "Identificador de evento inválido." });
    return;
  }
  const parsed = cancelarEventoDocenteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Debes indicar el motivo de la cancelación." });
    return;
  }
  try {
    const resultado = await cancelarEventoDocente({
      perfil,
      eventoId,
      motivo: parsed.data.motivo,
    });
    res.status(200).json({
      message: resultado.eliminado
        ? "El evento se eliminó porque no tenía inscritos."
        : "Evento cancelado y comunicado a los inscritos.",
      ...resultado,
    });
  } catch (error) {
    if (!responderError(res, error)) throw error;
  }
}

export async function getInscritosEventoDocente(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const eventoId = idDeRuta(req, "id");
  if (!eventoId || !uuidSchema.safeParse(eventoId).success) {
    res.status(400).json({ message: "Identificador de evento inválido." });
    return;
  }
  const busqueda =
    typeof req.query["q"] === "string" ? req.query["q"] : undefined;

  try {
    const resultado = await listarInscritosEventoDocente({
      perfil,
      eventoId,
      busqueda,
    });

    if (req.query["formato"] === "csv") {
      const csv = construirCsvInscritos(resultado.inscritos);
      const nombre = `inscritos-${String(resultado.evento["nombre"] ?? "evento")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .toLowerCase()}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
      res.status(200).send(csv);
      return;
    }

    res.status(200).json(resultado);
  } catch (error) {
    if (!responderError(res, error)) throw error;
  }
}
