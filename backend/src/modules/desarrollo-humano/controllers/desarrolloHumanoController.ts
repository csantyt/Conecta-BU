import type { Request, Response } from "express";
import type { AuthUser } from "../../../middlewares/authMiddleware.js";
import { Cita } from "../models/Cita.js";
import { Evento } from "../models/Evento.js";
import { Horario } from "../models/Horario.js";
import { Inscripcion } from "../models/Inscripcion.js";
import { Servicio } from "../models/Servicio.js";
import {
  actualizarHorarioConValidacion,
  agendarCitaConReglas,
  cancelarCitaYLiberarHorario,
  CitaActivaError,
  ConflictoHorarioError,
  crearHorarioConValidacion,
  CupoAgotadoError,
  deshabilitarHorario,
  HorarioNoDisponibleError,
  listarHorariosDisponibles,
  OperacionNoPermitidaError,
  RecursoNoEncontradoError,
  registrarAsistenciaCita,
} from "../services/citasHorariosService.js";
import {
  actualizarHorarioSchema,
  asistenciaSchema,
  cancelarCitaSchema,
  consultarHorariosSchema,
  crearCitaSchema,
  crearEventoSchema,
  crearHorarioSchema,
  horariosDisponiblesSchema,
  uuidSchema,
} from "../validators.js";

function responderErrorNegocio(res: Response, error: unknown): boolean {
  if (error instanceof RecursoNoEncontradoError) {
    res.status(404).json({ message: error.message });
    return true;
  }
  if (error instanceof OperacionNoPermitidaError) {
    res.status(error.message.startsWith("No puedes") ? 403 : 409).json({
      message: error.message,
    });
    return true;
  }
  if (
    error instanceof ConflictoHorarioError ||
    error instanceof CitaActivaError ||
    error instanceof CupoAgotadoError
  ) {
    res.status(409).json({ message: error.message });
    return true;
  }
  if (error instanceof HorarioNoDisponibleError) {
    res.status(400).json({ message: error.message });
    return true;
  }
  return false;
}

function usuarioAutenticado(req: Request, res: Response): AuthUser | null {
  const usuario = req.user;
  if (!usuario) {
    res.status(401).json({ message: "No autenticado." });
    return null;
  }
  return usuario;
}

export async function listarServicios(_req: Request, res: Response): Promise<void> {
  const servicios = await Servicio.findAll({
    where: { activo: true },
    include: [
      {
        model: Horario,
        as: "horarios",
        where: { activo: true },
        required: false,
      },
    ],
    order: [["nombre", "ASC"]],
  });
  res.status(200).json({ servicios });
}

export async function listarHorarios(req: Request, res: Response): Promise<void> {
  const parsed = consultarHorariosSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Filtros inválidos.", errors: parsed.error.flatten() });
    return;
  }

  const horarios = await Horario.findAll({
    where: {
      ...(parsed.data.servicio_id ? { servicio_id: parsed.data.servicio_id } : {}),
      ...(parsed.data.activo === undefined ? {} : { activo: parsed.data.activo }),
    },
    include: [{ model: Servicio, as: "servicio" }],
    order: [
      ["dia_semana", "ASC"],
      ["hora_inicio", "ASC"],
    ],
  });

  res.status(200).json({ horarios });
}

export async function consultarHorariosDisponibles(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = horariosDisponiblesSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos.", errors: parsed.error.flatten() });
    return;
  }

  const horarios = await listarHorariosDisponibles({
    fecha: parsed.data.fecha,
    ...(parsed.data.servicio_id ? { servicioId: parsed.data.servicio_id } : {}),
  });

  res.status(200).json({ horarios });
}

export async function crearHorario(req: Request, res: Response): Promise<void> {
  const parsed = crearHorarioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos.", errors: parsed.error.flatten() });
    return;
  }

  try {
    const horario = await crearHorarioConValidacion({
      servicio_id: parsed.data.servicio_id,
      profesional: parsed.data.profesional ?? null,
      dia_semana: parsed.data.dia_semana,
      hora_inicio: parsed.data.hora_inicio,
      hora_fin: parsed.data.hora_fin,
      cupo: parsed.data.cupo,
    });
    res.status(201).json({ horario });
  } catch (error) {
    if (!responderErrorNegocio(res, error)) {
      throw error;
    }
  }
}

export async function actualizarHorario(req: Request, res: Response): Promise<void> {
  const id = uuidSchema.safeParse(req.params["id"]);
  if (!id.success) {
    res.status(400).json({ message: "Identificador de horario inválido." });
    return;
  }

  const parsed = actualizarHorarioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos.", errors: parsed.error.flatten() });
    return;
  }

  try {
    const horario = await actualizarHorarioConValidacion(id.data, {
      ...(parsed.data.servicio_id ? { servicio_id: parsed.data.servicio_id } : {}),
      ...(parsed.data.profesional !== undefined
        ? { profesional: parsed.data.profesional }
        : {}),
      ...(parsed.data.dia_semana !== undefined
        ? { dia_semana: parsed.data.dia_semana }
        : {}),
      ...(parsed.data.hora_inicio ? { hora_inicio: parsed.data.hora_inicio } : {}),
      ...(parsed.data.hora_fin ? { hora_fin: parsed.data.hora_fin } : {}),
      ...(parsed.data.cupo !== undefined ? { cupo: parsed.data.cupo } : {}),
      ...(parsed.data.activo !== undefined ? { activo: parsed.data.activo } : {}),
    });
    res.status(200).json({ horario });
  } catch (error) {
    if (!responderErrorNegocio(res, error)) {
      throw error;
    }
  }
}

export async function desactivarHorario(req: Request, res: Response): Promise<void> {
  const id = uuidSchema.safeParse(req.params["id"]);
  if (!id.success) {
    res.status(400).json({ message: "Identificador de horario inválido." });
    return;
  }

  try {
    const horario = await deshabilitarHorario(id.data);
    res.status(200).json({ horario });
  } catch (error) {
    if (!responderErrorNegocio(res, error)) {
      throw error;
    }
  }
}

export async function listarCitas(req: Request, res: Response): Promise<void> {
  const usuario = usuarioAutenticado(req, res);
  if (!usuario) {
    return;
  }

  const filtro =
    usuario.rol === "ADMINISTRADOR" ? {} : { usuario_id: usuario.id };

  const citas = await Cita.findAll({
    where: filtro,
    include: [
      { model: Servicio, as: "servicio" },
      { model: Horario, as: "horario" },
    ],
    order: [["fecha_hora", "DESC"]],
  });

  res.status(200).json({ citas });
}

export async function crearCita(req: Request, res: Response): Promise<void> {
  const usuario = usuarioAutenticado(req, res);
  if (!usuario) {
    return;
  }

  const parsed = crearCitaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos.", errors: parsed.error.flatten() });
    return;
  }

  try {
    const cita = await agendarCitaConReglas({
      usuarioId: usuario.id,
      servicioId: parsed.data.servicio_id,
      horarioId: parsed.data.horario_id,
      fecha: parsed.data.fecha,
    });
    res.status(201).json({ cita });
  } catch (error) {
    if (!responderErrorNegocio(res, error)) {
      throw error;
    }
  }
}

export async function cancelarCita(req: Request, res: Response): Promise<void> {
  const usuario = usuarioAutenticado(req, res);
  if (!usuario) {
    return;
  }

  const id = uuidSchema.safeParse(req.params["id"]);
  if (!id.success) {
    res.status(400).json({ message: "Identificador de cita inválido." });
    return;
  }

  const parsed = cancelarCitaSchema.safeParse(req.body ?? {});

  try {
    const cita = await cancelarCitaYLiberarHorario({
      citaId: id.data,
      usuarioId: usuario.id,
      esAdministrador: usuario.rol === "ADMINISTRADOR",
      motivo: parsed.data?.motivo ?? null,
    });
    res.status(200).json({ cita });
  } catch (error) {
    if (!responderErrorNegocio(res, error)) {
      throw error;
    }
  }
}

export async function registrarAsistencia(req: Request, res: Response): Promise<void> {
  const id = uuidSchema.safeParse(req.params["id"]);
  if (!id.success) {
    res.status(400).json({ message: "Identificador de cita inválido." });
    return;
  }

  const parsed = asistenciaSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos.", errors: parsed.error.flatten() });
    return;
  }

  try {
    const cita = await registrarAsistenciaCita({
      citaId: id.data,
      estado: parsed.data.estado,
    });
    res.status(200).json({ cita });
  } catch (error) {
    if (!responderErrorNegocio(res, error)) {
      throw error;
    }
  }
}

export async function listarEventos(req: Request, res: Response): Promise<void> {
  const usuario = usuarioAutenticado(req, res);
  if (!usuario) {
    return;
  }

  const eventos = await Evento.findAll({
    where: { activo: true },
    include: [{ model: Inscripcion, as: "inscripciones" }],
    order: [["fecha_inicio", "ASC"]],
  });

  const respuesta = (eventos as Evento[]).map((evento: Evento) => {
    const inscripciones = evento.get("inscripciones") as Inscripcion[] | undefined;
    const activas = (inscripciones ?? []).filter((item) => item.estado === "INSCRITO");
    return {
      id: evento.id,
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      fecha_inicio: evento.fecha_inicio,
      fecha_fin: evento.fecha_fin,
      cupo_total: evento.cupo_total,
      cupo_disponible: Math.max(evento.cupo_total - activas.length, 0),
      inscrito: activas.some((item) => item.usuario_id === usuario.id),
    };
  });

  res.status(200).json({ eventos: respuesta });
}

export async function crearEvento(req: Request, res: Response): Promise<void> {
  const parsed = crearEventoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos.", errors: parsed.error.flatten() });
    return;
  }

  const evento = await Evento.create({
    titulo: parsed.data.titulo,
    descripcion: parsed.data.descripcion ?? null,
    fecha_inicio: new Date(parsed.data.fecha_inicio),
    fecha_fin: parsed.data.fecha_fin ? new Date(parsed.data.fecha_fin) : null,
    cupo_total: parsed.data.cupo_total,
  });

  res.status(201).json({ evento });
}

export async function inscribirseEvento(req: Request, res: Response): Promise<void> {
  const usuario = usuarioAutenticado(req, res);
  if (!usuario) {
    return;
  }

  const id = uuidSchema.safeParse(req.params["id"]);
  if (!id.success) {
    res.status(400).json({ message: "Identificador de evento inválido." });
    return;
  }

  const evento = await Evento.findByPk(id.data, {
    include: [{ model: Inscripcion, as: "inscripciones" }],
  });
  if (!evento || !evento.activo) {
    res.status(404).json({ message: "El evento no existe." });
    return;
  }

  const inscripciones = (evento.get("inscripciones") as Inscripcion[] | undefined) ?? [];
  const activas = inscripciones.filter((item) => item.estado === "INSCRITO");

  if (activas.some((item) => item.usuario_id === usuario.id)) {
    res.status(409).json({ message: "Ya estás inscrito en este evento." });
    return;
  }

  if (activas.length >= evento.cupo_total) {
    res.status(409).json({ message: "No hay cupos disponibles." });
    return;
  }

  const previa = inscripciones.find((item) => item.usuario_id === usuario.id);
  if (previa) {
    previa.estado = "INSCRITO";
    await previa.save();
    res.status(200).json({ inscripcion: previa });
    return;
  }

  const inscripcion = await Inscripcion.create({
    evento_id: evento.id,
    usuario_id: usuario.id,
    estado: "INSCRITO",
  });

  res.status(201).json({ inscripcion });
}

export async function cancelarInscripcion(req: Request, res: Response): Promise<void> {
  const usuario = usuarioAutenticado(req, res);
  if (!usuario) {
    return;
  }

  const id = uuidSchema.safeParse(req.params["id"]);
  if (!id.success) {
    res.status(400).json({ message: "Identificador de evento inválido." });
    return;
  }

  const inscripcion = await Inscripcion.findOne({
    where: { evento_id: id.data, usuario_id: usuario.id, estado: "INSCRITO" },
  });

  if (!inscripcion) {
    res.status(404).json({ message: "No tienes una inscripción activa." });
    return;
  }

  inscripcion.estado = "CANCELADO";
  await inscripcion.save();
  res.status(200).json({ inscripcion });
}
