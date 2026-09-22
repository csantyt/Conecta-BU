import type { Request, Response } from "express";
import { Op } from "sequelize";
import type { AuthUser } from "../../../middlewares/authMiddleware.js";
import { Cita } from "../models/Cita.js";
import { Evento } from "../models/Evento.js";
import { Horario } from "../models/Horario.js";
import { Inscripcion } from "../models/Inscripcion.js";
import { Servicio } from "../models/Servicio.js";
import {
  asistenciaSchema,
  cancelarCitaSchema,
  crearCitaSchema,
  crearEventoSchema,
  crearHorarioSchema,
  uuidSchema,
} from "../validators.js";

function usuarioAutenticado(req: Request, res: Response): AuthUser | null {
  const usuario = req.user;
  if (!usuario) {
    res.status(401).json({ message: "No autenticado." });
    return null;
  }
  return usuario;
}

function inicioYFinDelDia(fecha: string): { inicio: Date; fin: Date } {
  return {
    inicio: new Date(`${fecha}T00:00:00`),
    fin: new Date(`${fecha}T23:59:59.999`),
  };
}

function horaParaFecha(fecha: string, hora: string): Date {
  const normalizada = hora.length === 5 ? `${hora}:00` : hora.slice(0, 8);
  return new Date(`${fecha}T${normalizada}`);
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

export async function crearHorario(req: Request, res: Response): Promise<void> {
  const parsed = crearHorarioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos.", errors: parsed.error.flatten() });
    return;
  }

  const servicio = await Servicio.findByPk(parsed.data.servicio_id);
  if (!servicio) {
    res.status(404).json({ message: "El servicio no existe." });
    return;
  }

  const horario = await Horario.create({
    servicio_id: parsed.data.servicio_id,
    profesional: parsed.data.profesional ?? null,
    dia_semana: parsed.data.dia_semana,
    hora_inicio: parsed.data.hora_inicio,
    hora_fin: parsed.data.hora_fin,
    cupo: parsed.data.cupo,
  });

  res.status(201).json({ horario });
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

  const { servicio_id, horario_id, fecha } = parsed.data;
  const horario = await Horario.findByPk(horario_id);

  if (!horario || !horario.activo || horario.servicio_id !== servicio_id) {
    res.status(400).json({ message: "El horario no está disponible para este servicio." });
    return;
  }

  const diaSeleccionado = new Date(`${fecha}T12:00:00`).getDay();
  if (diaSeleccionado !== horario.dia_semana) {
    res.status(400).json({
      message: "La fecha no coincide con el día de atención del horario.",
    });
    return;
  }

  const fechaHora = horaParaFecha(fecha, String(horario.hora_inicio));
  if (fechaHora.getTime() <= Date.now()) {
    res.status(400).json({ message: "Solo se pueden agendar citas futuras." });
    return;
  }

  const { inicio, fin } = inicioYFinDelDia(fecha);
  const ocupadas = await Cita.count({
    where: {
      horario_id,
      estado: "AGENDADA",
      fecha_hora: { [Op.between]: [inicio, fin] },
    },
  });

  if (ocupadas >= horario.cupo) {
    res.status(409).json({ message: "No hay cupo en ese horario." });
    return;
  }

  const yaAgendada = await Cita.findOne({
    where: {
      usuario_id: usuario.id,
      estado: "AGENDADA",
      fecha_hora: fechaHora,
    },
  });

  if (yaAgendada) {
    res.status(409).json({ message: "Ya tienes una cita agendada en esa fecha y hora." });
    return;
  }

  const cita = await Cita.create({
    usuario_id: usuario.id,
    servicio_id,
    horario_id,
    fecha_hora: fechaHora,
    estado: "AGENDADA",
  });

  res.status(201).json({ cita });
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
  const cita = await Cita.findByPk(id.data);

  if (!cita) {
    res.status(404).json({ message: "La cita no existe." });
    return;
  }

  if (usuario.rol !== "ADMINISTRADOR" && cita.usuario_id !== usuario.id) {
    res.status(403).json({ message: "No puedes cancelar esta cita." });
    return;
  }

  if (cita.estado !== "AGENDADA") {
    res.status(409).json({ message: "Solo se pueden cancelar citas agendadas." });
    return;
  }

  cita.estado = "CANCELADA";
  cita.motivo_cancelacion = parsed.data?.motivo ?? null;
  cita.fecha_actualizacion = new Date();
  await cita.save();

  res.status(200).json({ cita });
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

  const cita = await Cita.findByPk(id.data);
  if (!cita) {
    res.status(404).json({ message: "La cita no existe." });
    return;
  }

  if (cita.estado !== "AGENDADA") {
    res.status(409).json({ message: "La cita no está agendada." });
    return;
  }

  cita.estado = parsed.data.estado;
  cita.fecha_actualizacion = new Date();
  await cita.save();

  res.status(200).json({ cita });
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
