/**
 * Controlador del rol Docente (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Traduce las peticiones HTTP a llamadas al `docenteService` y convierte los
 * errores de negocio en códigos HTTP claros para el frontend:
 *   400 datos inválidos · 403 deporte/clase ajena · 404 no existe ·
 *   409 asistencia duplicada · 422 fuera de ventana o de plazo de edición.
 *
 * ¿Cómo se relaciona con los demás?
 * Lo monta `docenteRoutes.ts` bajo `/api/v1/docente` y siempre detrás de
 * `authMiddleware` + `soloDocentePisu`.
 */

import type { Request, Response } from "express";
import {
  AsistenciaDuplicadaError,
  ClaseNoAsignadaError,
  DatosAsistenciaInvalidosError,
  EdicionFueraDePlazoError,
  EstudianteNoInscritoError,
  FueraDeVentanaAsistenciaError,
  RecursoDocenteNoEncontradoError,
  VentanaAsistenciaCerradaError,
  calcularReporteDeporte,
  editarAsistencia,
  listarAsistenciasDocente,
  listarClasesHoy,
  listarEstudiantesDeClase,
  listarEstudiantesDeDeporte,
  listarHistorialAsistencias,
  listarMisClases,
  listarMisClasesHoy,
  registrarAsistenciaLista,
} from "../services/docenteService.js";
import { construirReporteExcel, nombreArchivoReporte } from "../utils/reporteExcel.js";
import {
  editarAsistenciaSchema,
  registrarAsistenciaSchema,
} from "../validators.js";

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function idDeRuta(req: Request, nombre: string): string | null {
  const valor = req.params[nombre];
  const id = Array.isArray(valor) ? valor[0] : valor;
  return id || null;
}

function fechaDeQuery(req: Request): string | null {
  const valor = req.query["fecha"];
  const fecha = typeof valor === "string" ? valor : null;
  return fecha && RE_FECHA.test(fecha) ? fecha : null;
}

function deporteDeQuery(req: Request): string | undefined {
  const valor = req.query["deporteId"] ?? req.query["deporte_id"];
  return typeof valor === "string" && valor.length > 0 ? valor : undefined;
}

/**
 * Convierte un error de negocio del docente en una respuesta HTTP.
 * @returns `true` si el error fue reconocido y ya se respondió.
 */
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
  if (error instanceof EstudianteNoInscritoError) {
    res.status(400).json({ message: error.message });
    return true;
  }
  if (
    error instanceof VentanaAsistenciaCerradaError ||
    error instanceof EstudianteNoInscritoError ||
    error instanceof AsistenciaDuplicadaError
  ) {
    // 422: la petición es correcta pero no se puede procesar en este momento.
    res.status(422).json({ message: error.message });
    return true;
  }
  if (error instanceof AsistenciaDuplicadaError) {
    const datos = error as unknown as {
      codigo?: string;
      conflicto?: Record<string, unknown>;
    };
    res.status(409).json({
      message: error.message,
      codigo: datos.codigo ?? "ASISTENCIA_DUPLICADA",
      conflicto: datos.conflicto ?? { tipo: "asistencia" },
      alternativas: [
        {
          accion: "editar",
          descripcion:
            "Abre la asistencia ya registrada y corrige el estado de cada estudiante (disponible 24 h después de la clase).",
        },
      ],
    });
    return true;
  }
  return false;
}

export async function getPerfilDocente(req: Request, res: Response): Promise<void> {
  res.status(200).json({ perfil: req.usuarioPisu });
}

export async function getMisDeportes(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const deportes = await listarMisDeportes(perfil);
  res.status(200).json({ deportes });
}

export async function getClasesHoy(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const clases = await listarClasesHoy(perfil);
  res.status(200).json({ clases });
}

export async function getHorariosDocente(req: Request, res: Response): Promise<void> {
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

export async function getMisClasesHoy(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  try {
    const resultado = await listarMisClasesHoy(perfil);
    res.status(200).json(resultado);
  } catch (error) {
    if (!responderErrorDocente(res, error)) {
      throw error;
    }
  }
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

export async function getSesionLista(req: Request, res: Response): Promise<void> {
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
  const fecha = fechaDeQuery(req);
  if (!fecha) {
    res.status(400).json({ message: "Fecha inválida. Formato esperado: YYYY-MM-DD." });
    return;
  }

  try {
    const sesion = await obtenerSesionLista({ perfil, horarioId, fecha });
    res.status(200).json(sesion);
  } catch (error) {
    if (!responderErrorDocente(res, error)) {
      throw error;
    }
  }
}

export async function getAsistenciasDocente(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const fecha = fechaDeQuery(req) ?? undefined;
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

export async function getEstudiantesDeDeporte(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const deporteId = idDeRuta(req, "deporteId");
  if (!deporteId) {
    res.status(400).json({ message: "Identificador de deporte inválido." });
    return;
  }
  try {
    const resultado = await listarEstudiantesDeDeporte(perfil, deporteId);
    res.status(200).json(resultado);
  } catch (error) {
    if (!responderErrorDocente(res, error)) {
      throw error;
    }
  }
}

export async function getHistorial(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const sesiones = await listarHistorialAsistencias(perfil, deporteDeQuery(req));
  res.status(200).json({ sesiones });
}

export async function getReporte(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const deporteId = idDeRuta(req, "deporteId");
  if (!deporteId) {
    res.status(400).json({ message: "Identificador de deporte inválido." });
    return;
  }
  try {
    const reporte = await calcularReporteDeporte({ perfil, deporteId });
    res.status(200).json({ reporte });
  } catch (error) {
    if (!responderErrorDocente(res, error)) {
      throw error;
    }
  }
}

export async function getReporteExcel(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const deporteId = idDeRuta(req, "deporteId");
  if (!deporteId) {
    res.status(400).json({ message: "Identificador de deporte inválido." });
    return;
  }
  try {
    const reporte = await calcularReporteDeporte({ perfil, deporteId });
    const buffer = await construirReporteExcel(reporte);
    const nombre = nombreArchivoReporte(reporte.deporte.nombre, new Date());
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    res.status(200).send(buffer);
  } catch (error) {
    if (!responderErrorDocente(res, error)) {
      throw error;
    }
  }
}
