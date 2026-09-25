import { Op } from "sequelize";
import { Usuario } from "../../auth/models/Usuario.js";
import type { AudienciaAlertaPisu, CategoriaPisu, RolPisu } from "../constantes.js";
import { AUDIENCIAS_ALERTA_PISU, CATEGORIAS_PISU, ROLES_PISU } from "../constantes.js";
import { Alerta } from "../models/Alerta.js";
import { Asistencia } from "../models/Asistencia.js";
import { Deporte } from "../models/Deporte.js";
import { EventoDeporte } from "../models/EventoDeporte.js";
import { HorarioDeporte } from "../models/HorarioDeporte.js";
import { InscripcionDeporte } from "../models/InscripcionDeporte.js";
import { UsuarioPisu } from "../models/UsuarioPisu.js";
import { hayTraslape, normalizarHora } from "../utils/horarios.js";

export class UsuarioPisuNoEncontradoError extends Error {}
export class DatosRolPisuInvalidosError extends Error {}
export class DeporteDuplicadoError extends Error {}
export class RecursoAdminNoEncontradoError extends Error {}
export class ConflictoHorarioPisuError extends Error {}

export type FichaDirectorioPisu = {
  id: string | null;
  auth_usuario_id: string | null;
  nombre: string;
  correo: string;
  rol: RolPisu | null;
  categoria: CategoriaPisu | null;
  estado: boolean;
};

export async function listarUsuariosPisu(): Promise<FichaDirectorioPisu[]> {
  const [fichas, cuentas] = await Promise.all([
    UsuarioPisu.findAll({
      attributes: [
        "id",
        "auth_usuario_id",
        "nombre",
        "correo",
        "rol",
        "categoria",
        "estado",
      ],
      order: [["nombre", "ASC"]],
    }),
    Usuario.findAll({
      attributes: ["id", "email", "nombre_completo", "estado"],
      order: [["nombre_completo", "ASC"]],
    }),
  ]);

  const usadas = new Set<string>();
  const filas: FichaDirectorioPisu[] = [];

  for (const cuenta of cuentas) {
    const ficha =
      fichas.find((item) => item.auth_usuario_id === cuenta.id) ??
      fichas.find(
        (item) => item.correo.toLowerCase() === cuenta.email.toLowerCase(),
      );
    if (ficha) {
      usadas.add(ficha.id);
    }
    filas.push({
      id: ficha?.id ?? null,
      auth_usuario_id: cuenta.id,
      nombre: ficha?.nombre || cuenta.nombre_completo || cuenta.email,
      correo: cuenta.email,
      rol: ficha?.rol ?? null,
      categoria: ficha?.categoria ?? null,
      estado: ficha ? ficha.estado !== false : cuenta.estado !== false,
    });
  }

  for (const ficha of fichas) {
    if (usadas.has(ficha.id)) {
      continue;
    }
    filas.push({
      id: ficha.id,
      auth_usuario_id: ficha.auth_usuario_id ?? null,
      nombre: ficha.nombre,
      correo: ficha.correo,
      rol: ficha.rol,
      categoria: ficha.categoria ?? null,
      estado: ficha.estado !== false,
    });
  }

  return filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

function normalizarCategoria(params: {
  rol: RolPisu;
  categoria?: CategoriaPisu | null;
}): CategoriaPisu | null {
  if (params.rol === "Estudiante") {
    return params.categoria &&
      (CATEGORIAS_PISU as readonly string[]).includes(params.categoria)
      ? params.categoria
      : "Pregrado";
  }
  return null;
}

export async function asignarRolPisu(params: {
  pisuId?: string | null;
  authUsuarioId?: string | null;
  rol: RolPisu;
  categoria?: CategoriaPisu | null;
}): Promise<UsuarioPisu> {
  if (!(ROLES_PISU as readonly string[]).includes(params.rol)) {
    throw new DatosRolPisuInvalidosError("Rol PISU inválido.");
  }

  const categoria = normalizarCategoria({
    rol: params.rol,
    categoria: params.categoria,
  });

  let perfil: UsuarioPisu | null = null;
  if (params.pisuId) {
    perfil = await UsuarioPisu.findByPk(params.pisuId);
  }
  if (!perfil && params.authUsuarioId) {
    perfil = await UsuarioPisu.findOne({
      where: { auth_usuario_id: params.authUsuarioId },
    });
  }

  if (perfil) {
    await perfil.update({ rol: params.rol, categoria });
    return perfil;
  }

  if (!params.authUsuarioId) {
    throw new UsuarioPisuNoEncontradoError("La persona no tiene ficha PISU.");
  }

  const cuenta = await Usuario.findByPk(params.authUsuarioId);
  if (!cuenta) {
    throw new UsuarioPisuNoEncontradoError("La cuenta Conecta no existe.");
  }

  return UsuarioPisu.create({
    auth_usuario_id: cuenta.id,
    nombre: cuenta.nombre_completo?.trim() || cuenta.email,
    correo: cuenta.email,
    rol: params.rol,
    categoria,
  });
}

export async function resumenAdministracion() {
  const [
    usuarios,
    deportes,
    inscripcionesActivas,
    asistencias,
    alertas,
    horarios,
    eventos,
  ] = await Promise.all([
    UsuarioPisu.count(),
    Deporte.count({ where: { estado: true } }),
    InscripcionDeporte.count({ where: { estado: "Activa" } }),
    Asistencia.count(),
    Alerta.count(),
    HorarioDeporte.count({ where: { estado: true } }),
    EventoDeporte.count({ where: { estado: true } }),
  ]);

  return {
    usuarios,
    deportes_activos: deportes,
    inscripciones_activas: inscripcionesActivas,
    asistencias,
    alertas,
    horarios_activos: horarios,
    eventos_activos: eventos,
  };
}

export async function crearDeporte(params: {
  nombre: string;
  descripcion?: string | null;
  cupo_maximo: number;
  categorias_permitidas?: CategoriaPisu[];
}): Promise<Deporte> {
  const nombre = params.nombre.trim();
  if (nombre.length < 2) {
    throw new DatosRolPisuInvalidosError("El nombre del deporte es obligatorio.");
  }
  if (params.cupo_maximo < 1) {
    throw new DatosRolPisuInvalidosError("El cupo máximo debe ser al menos 1.");
  }

  const existente = await Deporte.findOne({
    where: { nombre: { [Op.iLike]: nombre } },
  });
  if (existente) {
    throw new DeporteDuplicadoError("Ya existe un deporte con ese nombre.");
  }

  return Deporte.create({
    nombre,
    descripcion: params.descripcion ?? null,
    cupo_maximo: params.cupo_maximo,
    ...(params.categorias_permitidas
      ? { categorias_permitidas: params.categorias_permitidas }
      : {}),
  });
}

export async function listarDeportesAdmin(): Promise<Deporte[]> {
  return Deporte.findAll({
    order: [["nombre", "ASC"]],
  });
}

export async function actualizarDeporte(
  id: string,
  cambios: Partial<{
    nombre: string;
    descripcion: string | null;
    cupo_maximo: number;
    categorias_permitidas: CategoriaPisu[];
    estado: boolean;
  }>,
): Promise<Deporte> {
  const deporte = await Deporte.findByPk(id);
  if (!deporte) {
    throw new RecursoAdminNoEncontradoError("El deporte no existe.");
  }

  if (cambios.nombre !== undefined) {
    const nombre = cambios.nombre.trim();
    if (nombre.length < 2) {
      throw new DatosRolPisuInvalidosError("El nombre del deporte es obligatorio.");
    }
    const duplicado = await Deporte.findOne({
      where: {
        id: { [Op.ne]: id },
        nombre: { [Op.iLike]: nombre },
      },
    });
    if (duplicado) {
      throw new DeporteDuplicadoError("Ya existe un deporte con ese nombre.");
    }
    deporte.nombre = nombre;
  }
  if (cambios.descripcion !== undefined) {
    deporte.descripcion = cambios.descripcion;
  }
  if (cambios.cupo_maximo !== undefined) {
    if (cambios.cupo_maximo < 1) {
      throw new DatosRolPisuInvalidosError("El cupo máximo debe ser al menos 1.");
    }
    deporte.cupo_maximo = cambios.cupo_maximo;
  }
  if (cambios.categorias_permitidas !== undefined) {
    deporte.categorias_permitidas = cambios.categorias_permitidas;
  }
  if (cambios.estado !== undefined) {
    deporte.estado = cambios.estado;
  }

  await deporte.save();
  return deporte;
}

export async function listarDocentesPisu(): Promise<UsuarioPisu[]> {
  return UsuarioPisu.findAll({
    where: {
      estado: true,
      rol: { [Op.in]: ["Docente", "Administrador"] },
    },
    order: [["nombre", "ASC"]],
  });
}

export async function listarHorariosAdmin() {
  return HorarioDeporte.findAll({
    include: [
      { model: Deporte, as: "deporte", attributes: ["id", "nombre"] },
      {
        model: UsuarioPisu,
        as: "docente",
        attributes: ["id", "nombre", "correo", "rol"],
      },
    ],
    order: [
      ["dia_semana", "ASC"],
      ["hora_inicio", "ASC"],
    ],
  });
}

async function validarDocenteParaHorario(docenteId: string): Promise<UsuarioPisu> {
  const docente = await UsuarioPisu.findByPk(docenteId);
  if (!docente || !docente.estado) {
    throw new RecursoAdminNoEncontradoError("El docente no existe o está inactivo.");
  }
  if (docente.rol !== "Docente" && docente.rol !== "Administrador") {
    throw new DatosRolPisuInvalidosError(
      "Solo se pueden asignar horarios a Docentes o Administradores PISU.",
    );
  }
  return docente;
}

async function validarTraslapeDocente(params: {
  docenteId: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  excluirId?: string;
}): Promise<void> {
  const candidatos = await HorarioDeporte.findAll({
    where: {
      docente_id: params.docenteId,
      dia_semana: params.diaSemana,
      estado: true,
      ...(params.excluirId ? { id: { [Op.ne]: params.excluirId } } : {}),
    },
  });

  const conflicto = candidatos.some((item) =>
    hayTraslape(
      params.horaInicio,
      params.horaFin,
      String(item.hora_inicio),
      String(item.hora_fin),
    ),
  );

  if (conflicto) {
    throw new ConflictoHorarioPisuError(
      "El docente ya tiene otra clase en ese horario.",
    );
  }
}

export async function crearHorarioAdmin(params: {
  deporte_id: string;
  docente_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
}): Promise<HorarioDeporte> {
  const deporte = await Deporte.findByPk(params.deporte_id);
  if (!deporte || !deporte.estado) {
    throw new RecursoAdminNoEncontradoError("El deporte no existe o está inactivo.");
  }

  await validarDocenteParaHorario(params.docente_id);

  const horaInicio = normalizarHora(params.hora_inicio);
  const horaFin = normalizarHora(params.hora_fin);
  if (horaInicio >= horaFin) {
    throw new DatosRolPisuInvalidosError(
      "La hora de fin debe ser posterior a la de inicio.",
    );
  }

  await validarTraslapeDocente({
    docenteId: params.docente_id,
    diaSemana: params.dia_semana,
    horaInicio,
    horaFin,
  });

  return HorarioDeporte.create({
    deporte_id: params.deporte_id,
    docente_id: params.docente_id,
    dia_semana: params.dia_semana,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    lugar: params.lugar.trim(),
    estado: true,
  });
}

export async function actualizarHorarioAdmin(
  id: string,
  cambios: Partial<{
    deporte_id: string;
    docente_id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    lugar: string;
    estado: boolean;
  }>,
): Promise<HorarioDeporte> {
  const horario = await HorarioDeporte.findByPk(id);
  if (!horario) {
    throw new RecursoAdminNoEncontradoError("El horario no existe.");
  }

  const deporteId = cambios.deporte_id ?? horario.deporte_id;
  const docenteId = cambios.docente_id ?? horario.docente_id;
  const diaSemana = cambios.dia_semana ?? horario.dia_semana;
  const horaInicio = normalizarHora(
    cambios.hora_inicio ?? String(horario.hora_inicio),
  );
  const horaFin = normalizarHora(cambios.hora_fin ?? String(horario.hora_fin));
  const lugar = (cambios.lugar ?? horario.lugar).trim();
  const estado = cambios.estado ?? horario.estado;

  const deporte = await Deporte.findByPk(deporteId);
  if (!deporte) {
    throw new RecursoAdminNoEncontradoError("El deporte no existe.");
  }
  await validarDocenteParaHorario(docenteId);

  if (horaInicio >= horaFin) {
    throw new DatosRolPisuInvalidosError(
      "La hora de fin debe ser posterior a la de inicio.",
    );
  }

  if (estado !== false) {
    await validarTraslapeDocente({
      docenteId,
      diaSemana,
      horaInicio,
      horaFin,
      excluirId: id,
    });
  }

  await horario.update({
    deporte_id: deporteId,
    docente_id: docenteId,
    dia_semana: diaSemana,
    hora_inicio: horaInicio,
    hora_fin: horaFin,
    lugar,
    estado,
  });

  return horario;
}

export async function listarEventosAdmin() {
  return EventoDeporte.findAll({
    order: [["fecha", "DESC"]],
  });
}

export async function crearEventoAdmin(params: {
  nombre: string;
  descripcion?: string | null;
  fecha: string;
  lugar: string;
  cupo_maximo: number;
}): Promise<EventoDeporte> {
  const nombre = params.nombre.trim();
  if (nombre.length < 2) {
    throw new DatosRolPisuInvalidosError("El nombre del evento es obligatorio.");
  }
  if (params.cupo_maximo < 1) {
    throw new DatosRolPisuInvalidosError("El cupo máximo debe ser al menos 1.");
  }
  const fecha = new Date(params.fecha);
  if (Number.isNaN(fecha.getTime())) {
    throw new DatosRolPisuInvalidosError("La fecha del evento no es válida.");
  }

  return EventoDeporte.create({
    nombre,
    descripcion: params.descripcion ?? null,
    fecha,
    lugar: params.lugar.trim(),
    cupo_maximo: params.cupo_maximo,
    estado: true,
  });
}

export async function actualizarEventoAdmin(
  id: string,
  cambios: Partial<{
    nombre: string;
    descripcion: string | null;
    fecha: string;
    lugar: string;
    cupo_maximo: number;
    estado: boolean;
  }>,
): Promise<EventoDeporte> {
  const evento = await EventoDeporte.findByPk(id);
  if (!evento) {
    throw new RecursoAdminNoEncontradoError("El evento no existe.");
  }

  if (cambios.nombre !== undefined) {
    const nombre = cambios.nombre.trim();
    if (nombre.length < 2) {
      throw new DatosRolPisuInvalidosError("El nombre del evento es obligatorio.");
    }
    evento.nombre = nombre;
  }
  if (cambios.descripcion !== undefined) {
    evento.descripcion = cambios.descripcion;
  }
  if (cambios.fecha !== undefined) {
    const fecha = new Date(cambios.fecha);
    if (Number.isNaN(fecha.getTime())) {
      throw new DatosRolPisuInvalidosError("La fecha del evento no es válida.");
    }
    evento.fecha = fecha;
  }
  if (cambios.lugar !== undefined) {
    evento.lugar = cambios.lugar.trim();
  }
  if (cambios.cupo_maximo !== undefined) {
    if (cambios.cupo_maximo < 1) {
      throw new DatosRolPisuInvalidosError("El cupo máximo debe ser al menos 1.");
    }
    evento.cupo_maximo = cambios.cupo_maximo;
  }
  if (cambios.estado !== undefined) {
    evento.estado = cambios.estado;
  }

  await evento.save();
  return evento;
}

export async function listarAlertasAdmin() {
  return Alerta.findAll({
    order: [["fecha_creacion", "DESC"]],
  });
}

export async function crearAlertaAdmin(params: {
  titulo: string;
  mensaje: string;
  audiencia: AudienciaAlertaPisu;
}): Promise<Alerta> {
  const titulo = params.titulo.trim();
  const mensaje = params.mensaje.trim();
  if (titulo.length < 2) {
    throw new DatosRolPisuInvalidosError("El título de la alerta es obligatorio.");
  }
  if (mensaje.length < 2) {
    throw new DatosRolPisuInvalidosError("El mensaje de la alerta es obligatorio.");
  }
  if (!(AUDIENCIAS_ALERTA_PISU as readonly string[]).includes(params.audiencia)) {
    throw new DatosRolPisuInvalidosError("Audiencia de alerta inválida.");
  }

  return Alerta.create({
    titulo,
    mensaje,
    audiencia: params.audiencia,
  });
}

export async function eliminarAlertaAdmin(id: string): Promise<void> {
  const alerta = await Alerta.findByPk(id);
  if (!alerta) {
    throw new RecursoAdminNoEncontradoError("La alerta no existe.");
  }
  await alerta.destroy();
}
