import type { Request, Response } from "express";
import {
  ConflictoHorarioPisuError,
  DatosRolPisuInvalidosError,
  DeporteDuplicadoError,
  RecursoAdminNoEncontradoError,
  UsuarioPisuNoEncontradoError,
  actualizarDeporte,
  actualizarEventoAdmin,
  actualizarHorarioAdmin,
  asignarRolPisu,
  crearAlertaAdmin,
  crearDeporte,
  crearEventoAdmin,
  crearHorarioAdmin,
  eliminarAlertaAdmin,
  listarAlertasAdmin,
  listarDeportesAdmin,
  listarDocentesPisu,
  listarEventosAdmin,
  listarHorariosAdmin,
  listarUsuariosPisu,
  resumenAdministracion,
} from "../services/adminService.js";
import {
  actualizarDeporteSchema,
  actualizarEventoPisuSchema,
  actualizarHorarioPisuSchema,
  asignarRolPisuSchema,
  crearAlertaPisuSchema,
  crearDeporteSchema,
  crearEventoPisuSchema,
  crearHorarioPisuSchema,
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
    error instanceof ConflictoHorarioPisuError
  ) {
    res.status(409).json({ message: error.message });
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

export async function getDocentesAdmin(_req: Request, res: Response): Promise<void> {
  const docentes = await listarDocentesPisu();
  res.status(200).json({ docentes });
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
