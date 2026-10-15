import type { Request, Response } from "express";
import {
  ConflictoEventoError,
  ConflictoHorarioPisuError,
  ConflictoLugarHorarioError,
  DatosRolPisuInvalidosError,
  DeporteConInscritosError,
  DeporteDuplicadoError,
  DocenteDuplicadoError,
  InscripcionDuplicadaError,
  RecursoAdminNoEncontradoError,
  UsuarioPisuNoEncontradoError,
  actualizarDeporte,
  actualizarDocente,
  actualizarEstudiantePisu,
  actualizarEventoAdmin,
  actualizarHorarioAdmin,
  asignarRolPisu,
  buscarEstudiantesConInscripciones,
  cargarDocentesCsv,
  crearAdministradorPisu,
  crearAlertaAdmin,
  crearDeporte,
  crearDocente,
  crearEventoAdmin,
  crearHorarioAdmin,
  dashboardAdministracion,
  eliminarAlertaAdmin,
  eliminarDeporteAdmin,
  inscribirEstudianteManual,
  listarDeportesAdmin,
  listarDocentesPisu,
  listarAlertasAdmin,
  listarEstudiantesPisu,
  listarEventosAdmin,
  listarHorariosAdmin,
  listarUsuariosPisu,
  resumenAdministracion,
  retirarInscripcionManual,
  verificacionAdmin,
} from "../services/adminService.js";
import {
  EventoNoEncontradoError,
  listarInscritosEvento,
} from "../services/eventosService.js";
import { listarEstudiantesGeneral } from "../services/inscritosService.js";
import {
  actualizarDeporteSchema,
  actualizarDocenteSchema,
  actualizarEstudiantePisuSchema,
  actualizarEventoPisuSchema,
  actualizarHorarioPisuSchema,
  asignarRolPisuSchema,
  crearAlertaPisuSchema,
  crearAdministradorPisuSchema,
  crearDeporteSchema,
  crearDocenteSchema,
  crearEstudiantePisuSchema,
  crearEventoPisuSchema,
  crearHorarioPisuSchema,
  inscripcionManualSchema,
} from "../validators.js";

function idDeRuta(req: Request, nombre: string): string | null {
  const valor = req.params[nombre];
  const id = Array.isArray(valor) ? valor[0] : valor;
  return id && id !== "nuevo" ? id : null;
}

function responderErrorAdmin(res: Response, error: unknown): boolean {
  if (error instanceof DatosRolPisuInvalidosError) {
    res.status(400).json({ message: error.message });
    return true;
  }
  if (error instanceof RecursoAdminNoEncontradoError) {
    res.status(404).json({ message: error.message });
    return true;
  }
  if (error instanceof UsuarioPisuNoEncontradoError) {
    res.status(404).json({ message: error.message });
    return true;
  }
  if (
    error instanceof DeporteDuplicadoError ||
    error instanceof ConflictoHorarioPisuError ||
    error instanceof ConflictoEventoError ||
    error instanceof ConflictoLugarHorarioError ||
    error instanceof DocenteDuplicadoError ||
    error instanceof DeporteConInscritosError ||
    error instanceof InscripcionDuplicadaError
  ) {
    const detalles = error as unknown as Record<string, unknown>;
    res.status(409).json({
      message: error.message,
      codigo: detalles.codigo ?? null,
      conflicto: detalles.conflicto ?? null,
      alternativas: detalles.alternativas ?? null,
    });
    return true;
  }
  return false;
}

export async function getResumenAdmin(req: Request, res: Response): Promise<void> {
  const resumen = await resumenAdministracion();
  res.status(200).json({ resumen, perfil: req.usuarioPisu });
}

export async function getUsuariosAdmin(_req: Request, res: Response): Promise<void> {
  const usuarios = await listarUsuariosPisu();
  res.status(200).json({ usuarios });
}

export async function getDocentesAdmin(req: Request, res: Response): Promise<void> {
  const q = typeof req.query["q"] === "string" ? req.query["q"] : "";
  const docentes = await listarDocentesPisu(q);
  res.status(200).json({ docentes });
}

export async function getEstudiantesAdmin(req: Request, res: Response): Promise<void> {
  const params: { deporteId?: string; categoria?: string; sinInscripcion?: boolean; q?: string } = {};
  if (typeof req.query["deporteId"] === "string") params.deporteId = req.query["deporteId"];
  if (typeof req.query["categoria"] === "string") params.categoria = req.query["categoria"];
  if (req.query["sinInscripcion"] === "true") params.sinInscripcion = true;
  if (typeof req.query["q"] === "string") params.q = req.query["q"];
  const estudiantes = await listarEstudiantesGeneral(params);
  res.status(200).json({ estudiantes });
}

export async function getBuscarEstudiantesAdmin(req: Request, res: Response): Promise<void> {
  const q = typeof req.query["q"] === "string" ? req.query["q"] : "";
  if (q.trim().length < 2) {
    res.status(200).json({ estudiantes: [] });
    return;
  }
  const estudiantes = await buscarEstudiantesConInscripciones(q);
  res.status(200).json({ estudiantes });
}

export async function getVerificacionAdmin(_req: Request, res: Response): Promise<void> {
  const data = await verificacionAdmin();
  res.status(200).json({ verificacion: data });
}

export async function getDashboardAdmin(_req: Request, res: Response): Promise<void> {
  const dashboard = await dashboardAdministracion();
  res.status(200).json({ dashboard });
}

export async function deleteDeporteAdmin(req: Request, res: Response): Promise<void> {
  const id = idDeRuta(req, "id");
  if (!id) {
    res.status(400).json({ message: "Identificador de deporte inválido." });
    return;
  }
  try {
    await eliminarDeporteAdmin(id);
    res.status(204).send();
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function postDocenteAdmin(req: Request, res: Response): Promise<void> {
  const parsed = crearDocenteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Datos inválidos. Se requieren nombre y correo válidos.",
    });
    return;
  }
  try {
    const resultado = await crearDocente(parsed.data);
    res.status(201).json({
      message: "Docente creado. Comparte la contraseña temporal de forma segura.",
      docente: resultado.docente,
      passwordTemporal: resultado.passwordTemporal,
    });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function patchDocenteAdmin(req: Request, res: Response): Promise<void> {
  const id = idDeRuta(req, "id");
  if (!id) {
    res.status(400).json({ message: "Identificador de docente inválido." });
    return;
  }
  const parsed = actualizarDocenteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos para actualizar el docente." });
    return;
  }
  try {
    const docente = await actualizarDocente(id, parsed.data);
    res.status(200).json({ message: "Docente actualizado.", docente });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function postDocentesCsvAdmin(req: Request, res: Response): Promise<void> {
  const csv =
    typeof req.body?.["csv"] === "string"
      ? req.body["csv"]
      : typeof req.body === "string"
        ? req.body
        : "";
  if (csv.trim().length === 0) {
    res.status(400).json({ message: "Debes enviar el contenido CSV." });
    return;
  }
  try {
    const resumen = await cargarDocentesCsv(csv);
    res.status(200).json({
      message: `Carga masiva finalizada. Creados: ${resumen.creados}. Errores: ${resumen.errores.length}.`,
      resumen,
    });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function patchEstudianteAdmin(req: Request, res: Response): Promise<void> {
  const id = idDeRuta(req, "id");
  if (!id) {
    res.status(400).json({ message: "Identificador de estudiante inválido." });
    return;
  }
  const parsed = actualizarEstudiantePisuSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos para actualizar el estudiante." });
    return;
  }
  try {
    const estudiante = await actualizarEstudiantePisu(id, parsed.data);
    res.status(200).json({ message: "Estudiante actualizado.", estudiante });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function postInscripcionManualAdmin(req: Request, res: Response): Promise<void> {
  const parsed = inscripcionManualSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos para la inscripción." });
    return;
  }
  try {
    const inscripcion = await inscribirEstudianteManual(parsed.data);
    res.status(201).json({ message: "Inscripción registrada.", inscripcion });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function patchCancelarInscripcionManualAdmin(
  req: Request,
  res: Response,
): Promise<void> {
  const id = idDeRuta(req, "id");
  if (!id) {
    res.status(400).json({ message: "Identificador de inscripción inválido." });
    return;
  }
  try {
    await retirarInscripcionManual(id);
    res.status(200).json({ message: "Inscripción retirada." });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function postAdministradorPisuAdmin(req: Request, res: Response): Promise<void> {
  const parsed = crearAdministradorPisuSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Datos inválidos. Se requieren nombre y correo válidos.",
    });
    return;
  }
  try {
    const resultado = await crearAdministradorPisu(parsed.data);
    res.status(201).json({
      message: "Administrador creado. Comparte la contraseña temporal de forma segura.",
      administrador: resultado.docente,
      passwordTemporal: resultado.passwordTemporal,
    });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function getDeportesAdmin(_req: Request, res: Response): Promise<void> {
  const deportes = await listarDeportesAdmin();
  res.status(200).json({ deportes });
}

export async function patchRolUsuarioAdmin(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = asignarRolPisuSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Debes enviar un rol PISU válido (Administrador, Docente o Estudiante).",
    });
    return;
  }

  const pisuId = idDeRuta(req, "id");
  const authUsuarioId = parsed.data.auth_usuario_id ?? null;

  try {
    const usuario = await asignarRolPisu({
      pisuId,
      authUsuarioId,
      rol: parsed.data.rol,
      categoria: parsed.data.categoria ?? null,
    });
    res.status(200).json({
      message: `Rol PISU actualizado a ${parsed.data.rol}.`,
      usuario,
    });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function getAlertasAdmin(_req: Request, res: Response): Promise<void> {
  const alertas = await listarAlertasAdmin();
  res.status(200).json({ alertas });
}

export async function postAlertaAdmin(req: Request, res: Response): Promise<void> {
  const parsed = crearAlertaPisuSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Datos inválidos. Se requieren titulo, mensaje y audiencia.",
    });
    return;
  }

  try {
    const alerta = await crearAlertaAdmin(parsed.data);
    res.status(201).json({ message: "Alerta publicada.", alerta });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function deleteAlertaAdmin(req: Request, res: Response): Promise<void> {
  const id = idDeRuta(req, "id");
  if (!id) {
    res.status(400).json({ message: "Identificador de alerta inválido." });
    return;
  }

  try {
    await eliminarAlertaAdmin(id);
    res.status(204).send();
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function postDeporteAdmin(req: Request, res: Response): Promise<void> {
  const parsed = crearDeporteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Datos inválidos. Se requiere nombre y cupo_maximo (>= 1).",
    });
    return;
  }

  try {
    const deporte = await crearDeporte({
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion ?? null,
      imagen: parsed.data.imagen ?? null,
      cupo_maximo: parsed.data.cupo_maximo,
      ...(parsed.data.categorias_permitidas
        ? { categorias_permitidas: parsed.data.categorias_permitidas }
        : {}),
    });
    res.status(201).json({ message: "Deporte creado.", deporte });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function patchDeporteAdmin(req: Request, res: Response): Promise<void> {
  const id = idDeRuta(req, "id");
  if (!id) {
    res.status(400).json({ message: "Identificador de deporte inválido." });
    return;
  }

  const parsed = actualizarDeporteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos para actualizar el deporte." });
    return;
  }

  try {
    const deporte = await actualizarDeporte(id, parsed.data);
    res.status(200).json({ message: "Deporte actualizado.", deporte });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function getHorariosAdmin(_req: Request, res: Response): Promise<void> {
  const horarios = await listarHorariosAdmin();
  res.status(200).json({ horarios });
}

export async function postHorarioAdmin(req: Request, res: Response): Promise<void> {
  const parsed = crearHorarioPisuSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message:
        "Datos inválidos. Se requieren deporte_id, docente_id, dia_semana, horas y lugar.",
    });
    return;
  }

  try {
    const horario = await crearHorarioAdmin(parsed.data);
    res.status(201).json({ message: "Horario publicado.", horario });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function patchHorarioAdmin(req: Request, res: Response): Promise<void> {
  const id = idDeRuta(req, "id");
  if (!id) {
    res.status(400).json({ message: "Identificador de horario inválido." });
    return;
  }

  const parsed = actualizarHorarioPisuSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos para actualizar el horario." });
    return;
  }

  try {
    const horario = await actualizarHorarioAdmin(id, parsed.data);
    res.status(200).json({ message: "Horario actualizado.", horario });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function getEventosAdmin(_req: Request, res: Response): Promise<void> {
  const eventos = await listarEventosAdmin();
  res.status(200).json({ eventos });
}

export async function getInscritosEventoAdmin(
  req: Request,
  res: Response,
): Promise<void> {
  const id = idDeRuta(req, "id");
  if (!id) {
    res.status(400).json({ message: "Identificador de evento inválido." });
    return;
  }

  try {
    const resultado = await listarInscritosEvento(id);
    res.status(200).json(resultado);
  } catch (error) {
    if (error instanceof EventoNoEncontradoError) {
      res.status(404).json({ message: error.message });
      return;
    }
    throw error;
  }
}

export async function postEventoAdmin(req: Request, res: Response): Promise<void> {
  const parsed = crearEventoPisuSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Datos inválidos. Se requieren nombre, fecha, lugar y cupo_maximo.",
    });
    return;
  }

  try {
    const evento = await crearEventoAdmin(parsed.data);
    res.status(201).json({ message: "Evento creado.", evento });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}

export async function patchEventoAdmin(req: Request, res: Response): Promise<void> {
  const id = idDeRuta(req, "id");
  if (!id) {
    res.status(400).json({ message: "Identificador de evento inválido." });
    return;
  }

  const parsed = actualizarEventoPisuSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos para actualizar el evento." });
    return;
  }

  try {
    const evento = await actualizarEventoAdmin(id, parsed.data);
    res.status(200).json({ message: "Evento actualizado.", evento });
  } catch (error) {
    if (!responderErrorAdmin(res, error)) {
      throw error;
    }
  }
}
