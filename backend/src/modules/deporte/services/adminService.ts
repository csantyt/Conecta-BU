import { Op, fn, col } from "sequelize";
import { Usuario } from "../../auth/models/Usuario.js";
import type { AudienciaAlertaPisu, CategoriaPisu, RolPisu } from "../constantes.js";
import { AUDIENCIAS_ALERTA_PISU, CATEGORIAS_PISU, ROLES_PISU } from "../constantes.js";
import { Alerta } from "../models/Alerta.js";
import { AsistenciaDetalle } from "../models/AsistenciaDetalle.js";
import { Deporte } from "../models/Deporte.js";
import { EventoDeporte } from "../models/EventoDeporte.js";
import { HorarioDeporte } from "../models/HorarioDeporte.js";
import { InscripcionDeporte } from "../models/InscripcionDeporte.js";
import { UsuarioPisu } from "../models/UsuarioPisu.js";
import { randomBytes, scryptSync } from "node:crypto";
import { hayTraslape, normalizarHora } from "../utils/horarios.js";
import { contarInscritosEvento, listarEventosConConteo } from "./eventosService.js";

type CambiosParciales<T> = { [K in keyof T]?: T[K] | undefined };

export class UsuarioPisuNoEncontradoError extends Error {}
export class DatosRolPisuInvalidosError extends Error {}
export class DeporteDuplicadoError extends Error {}
export class RecursoAdminNoEncontradoError extends Error {}
export class ConflictoHorarioPisuError extends Error {}
export class ConflictoLugarHorarioError extends Error {}
export class ConflictoEventoError extends Error {}
export class DocenteDuplicadoError extends Error {}
export class DeporteConInscritosError extends Error {}
export class InscripcionDuplicadaError extends Error {}
export const PASSWORD_TEMPORAL_DOCENTE_LONGITUD = 10;

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
  categoria?: CategoriaPisu | null | undefined;
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
  categoria?: CategoriaPisu | null | undefined;
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
    AsistenciaDetalle.count(),
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
  descripcion?: string | null | undefined;
  imagen?: string | null | undefined;
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
    imagen: params.imagen ?? null,
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
  cambios: CambiosParciales<{
    nombre: string;
    descripcion: string | null;
    imagen: string | null;
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
  if (cambios.imagen !== undefined) {
    deporte.imagen = cambios.imagen;
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

export async function listarDocentesPisu(consulta?: string): Promise<UsuarioPisu[]> {
  const where: Record<string, unknown> = {
    rol: { [Op.in]: ["Docente", "Administrador"] },
  };

  if (consulta?.trim()) {
    const q = `%${consulta.trim()}%`;
    (where as Record<string, unknown>)["Op.or"] = undefined;
    const orConditions = [
      { nombre: { [Op.iLike]: q } },
      { correo: { [Op.iLike]: q } },
      { documento: { [Op.iLike]: q } },
      { especialidad: { [Op.iLike]: q } },
    ];
    (where as Record<string, unknown>)["estado"] = undefined;
    Object.assign(where, { [Op.or]: orConditions });
  }

  return UsuarioPisu.findAll({
    where,
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

  const conflictosLugar = await HorarioDeporte.findAll({
    where: { dia_semana: params.dia_semana, lugar: params.lugar.trim(), estado: true },
    include: [{ model: Deporte, as: "deporte", attributes: ["id", "nombre"] }],
  });
  const conflictoLugar = conflictosLugar.find((item) =>
    hayTraslape(horaInicio, horaFin, String(item.hora_inicio), String(item.hora_fin)),
  );
  if (conflictoLugar) {
    const err = new ConflictoLugarHorarioError(
      `El lugar '${params.lugar.trim()}' ya está ocupado por '${(conflictoLugar as unknown as { deporte?: { nombre?: string } }).deporte?.nombre ?? "otro deporte"}' el ${["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][params.dia_semana]} de ${String(conflictoLugar.hora_inicio).slice(0,5)} a ${String(conflictoLugar.hora_fin).slice(0,5)}.`,
    );
    (err as unknown as Record<string, unknown>).codigo = "CONFLICTO_LUGAR";
    (err as unknown as Record<string, unknown>).conflicto = {
      tipo: "deporte",
      nombre: (conflictoLugar as unknown as { deporte?: { nombre?: string } }).deporte?.nombre ?? "otro deporte",
      lugar: params.lugar.trim(),
      dia: ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][params.dia_semana],
      horaInicio: String(conflictoLugar.hora_inicio).slice(0,5),
      horaFin: String(conflictoLugar.hora_fin).slice(0,5),
    };
    throw err;
  }

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
  cambios: CambiosParciales<{
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

    const conflictosLugar = await HorarioDeporte.findAll({
      where: {
        dia_semana: diaSemana,
        lugar,
        estado: true,
        id: { [Op.ne]: id },
      },
      include: [{ model: Deporte, as: "deporte", attributes: ["id", "nombre"] }],
    });
    const conflictoLugar = conflictosLugar.find((item) =>
      hayTraslape(horaInicio, horaFin, String(item.hora_inicio), String(item.hora_fin)),
    );
    if (conflictoLugar) {
      const err = new ConflictoLugarHorarioError(
        `El lugar '${lugar}' ya está ocupado por '${(conflictoLugar as unknown as { deporte?: { nombre?: string } }).deporte?.nombre ?? "otro deporte"}' el ${["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][diaSemana]} de ${String(conflictoLugar.hora_inicio).slice(0,5)} a ${String(conflictoLugar.hora_fin).slice(0,5)}.`,
      );
      (err as unknown as Record<string, unknown>).codigo = "CONFLICTO_LUGAR";
      (err as unknown as Record<string, unknown>).conflicto = {
        tipo: "deporte",
        nombre: (conflictoLugar as unknown as { deporte?: { nombre?: string } }).deporte?.nombre ?? "otro deporte",
        lugar,
        dia: ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][diaSemana],
        horaInicio: String(conflictoLugar.hora_inicio).slice(0,5),
        horaFin: String(conflictoLugar.hora_fin).slice(0,5),
      };
      throw err;
    }
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
  return listarEventosConConteo();
}

export async function crearEventoAdmin(params: {
  nombre: string;
  descripcion?: string | null | undefined;
  tipo?: string | null | undefined;
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
  if (fecha.getTime() < Date.now() - 60_000) {
    throw new DatosRolPisuInvalidosError("La fecha del evento no puede ser pasada.");
  }

  const conflictoEvento = await EventoDeporte.findOne({
    where: {
      estado: true,
      lugar: params.lugar.trim(),
      fecha,
    },
  });
  if (conflictoEvento) {
    const err = new ConflictoEventoError(
      `El lugar '${params.lugar.trim()}' ya está ocupado por el evento '${conflictoEvento.nombre}' el ${fecha.toLocaleDateString("es-CO")} a las ${fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}.`,
    );
    (err as unknown as Record<string, unknown>).codigo = "CONFLICTO_EVENTO";
    (err as unknown as Record<string, unknown>).conflicto = {
      tipo: "evento",
      nombre: conflictoEvento.nombre,
      lugar: params.lugar.trim(),
      dia: fecha.toLocaleDateString("es-CO", { weekday: "long" }),
      horaInicio: fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
      horaFin: fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
    };
    throw err;
  }

  return EventoDeporte.create({
    nombre,
    descripcion: params.descripcion ?? null,
    tipo: params.tipo?.trim() || "General",
    fecha,
    lugar: params.lugar.trim(),
    cupo_maximo: params.cupo_maximo,
    estado: true,
  });
}

export async function actualizarEventoAdmin(
  id: string,
  cambios: CambiosParciales<{
    nombre: string;
    descripcion: string | null;
    tipo: string;
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
  if (cambios.tipo !== undefined) {
    evento.tipo = cambios.tipo.trim() || "General";
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
  if (cambios.fecha !== undefined || cambios.lugar !== undefined) {
    const fechaFinal = cambios.fecha !== undefined ? new Date(cambios.fecha) : evento.fecha;
    const lugarFinal = (cambios.lugar !== undefined ? cambios.lugar : evento.lugar).trim();
    if (Number.isNaN(fechaFinal.getTime())) {
      throw new DatosRolPisuInvalidosError("La fecha del evento no es válida.");
    }
    const conflictoEvento = await EventoDeporte.findOne({
      where: {
        estado: true,
        id: { [Op.ne]: id },
        lugar: lugarFinal,
        fecha: fechaFinal,
      },
    });
    if (conflictoEvento) {
      const err = new ConflictoEventoError(
        `El lugar '${lugarFinal}' ya está ocupado por el evento '${conflictoEvento.nombre}' el ${fechaFinal.toLocaleDateString("es-CO")} a las ${fechaFinal.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}.`,
      );
      (err as unknown as Record<string, unknown>).codigo = "CONFLICTO_EVENTO";
      (err as unknown as Record<string, unknown>).conflicto = {
        tipo: "evento",
        nombre: conflictoEvento.nombre,
        lugar: lugarFinal,
        dia: fechaFinal.toLocaleDateString("es-CO", { weekday: "long" }),
        horaInicio: fechaFinal.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
        horaFin: fechaFinal.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
      };
      throw err;
    }
  }

  if (cambios.cupo_maximo !== undefined) {
    if (cambios.cupo_maximo < 1) {
      throw new DatosRolPisuInvalidosError("El cupo máximo debe ser al menos 1.");
    }
    const inscritos = await contarInscritosEvento(evento.id);
    if (cambios.cupo_maximo < inscritos) {
      throw new DatosRolPisuInvalidosError(
        `El cupo no puede ser menor que los ${inscritos} estudiantes ya inscritos.`,
      );
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
    include: [
      {
        model: UsuarioPisu,
        as: "estudiante",
        attributes: ["id", "nombre", "correo"],
        required: false,
      },
    ],
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

// ===================== Docentes =====================
function generarPasswordTemporal(): string {
  const alfabeto = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(PASSWORD_TEMPORAL_DOCENTE_LONGITUD);
  let resultado = "";
  for (let i = 0; i < bytes.length; i += 1) {
    resultado += alfabeto[bytes[i]! % alfabeto.length];
  }
  return resultado;
}

function hashearPasswordTemporal(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export async function crearDocente(params: {
  nombre: string;
  correo: string;
  documento?: string | null | undefined;
  especialidad?: string | null | undefined;
}): Promise<{ docente: UsuarioPisu; passwordTemporal: string }> {
  const nombre = params.nombre.trim();
  const correo = params.correo.trim().toLowerCase();
  if (nombre.length < 2) {
    throw new DatosRolPisuInvalidosError("El nombre del docente es obligatorio.");
  }
  if (!correo.includes("@")) {
    throw new DatosRolPisuInvalidosError("El correo del docente no es válido.");
  }

  const existente = await UsuarioPisu.findOne({
    where: { correo: { [Op.iLike]: correo } },
  });
  if (existente) {
    throw new DocenteDuplicadoError("Ya existe un docente con ese correo.");
  }

  const passwordTemporal = generarPasswordTemporal();
  const docente = await UsuarioPisu.create({
    nombre,
    correo,
    documento: params.documento?.trim() || null,
    especialidad: params.especialidad?.trim() || null,
    password_hash: hashearPasswordTemporal(passwordTemporal),
    rol: "Docente",
    estado: true,
  });

  return { docente, passwordTemporal };
}

export async function crearAdministradorPisu(params: {
  nombre: string;
  correo: string;
  documento?: string | null | undefined;
}): Promise<{ docente: UsuarioPisu; passwordTemporal: string }> {
  const nombre = params.nombre.trim();
  const correo = params.correo.trim().toLowerCase();
  if (nombre.length < 2) {
    throw new DatosRolPisuInvalidosError("El nombre del administrador es obligatorio.");
  }
  const existente = await UsuarioPisu.findOne({
    where: { correo: { [Op.iLike]: correo } },
  });
  if (existente) {
    throw new DocenteDuplicadoError("Ya existe un usuario con ese correo.");
  }
  const passwordTemporal = generarPasswordTemporal();
  const admin = await UsuarioPisu.create({
    nombre,
    correo,
    documento: params.documento?.trim() || null,
    password_hash: hashearPasswordTemporal(passwordTemporal),
    rol: "Administrador",
    estado: true,
  });
  return { docente: admin, passwordTemporal };
}

export async function actualizarDocente(
  id: string,
  cambios: {
    nombre?: string | undefined;
    correo?: string | undefined;
    documento?: string | null | undefined;
    especialidad?: string | null | undefined;
    estado?: boolean | undefined;
  },
): Promise<UsuarioPisu> {
  const docente = await UsuarioPisu.findByPk(id);
  if (!docente) {
    throw new RecursoAdminNoEncontradoError("El docente no existe.");
  }
  if (cambios.nombre !== undefined) {
    const nombre = cambios.nombre.trim();
    if (nombre.length < 2) {
      throw new DatosRolPisuInvalidosError("El nombre del docente es obligatorio.");
    }
    docente.nombre = nombre;
  }
  if (cambios.correo !== undefined) {
    const correo = cambios.correo.trim().toLowerCase();
    const duplicado = await UsuarioPisu.findOne({
      where: { id: { [Op.ne]: id }, correo: { [Op.iLike]: correo } },
    });
    if (duplicado) {
      throw new DocenteDuplicadoError("Ya existe un usuario con ese correo.");
    }
    docente.correo = correo;
  }
  if (cambios.documento !== undefined) {
    docente.documento = cambios.documento?.trim() || null;
  }
  if (cambios.especialidad !== undefined) {
    docente.especialidad = cambios.especialidad?.trim() || null;
  }
  if (cambios.estado !== undefined) {
    docente.estado = cambios.estado;
  }
  await docente.save();
  return docente;
}

function parseCsvLine(line: string): string[] {
  // Soporta campos sin comillas y con comillas dobles simples.
  const result: string[] = [];
  let actual = "";
  let enComillas = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      enComillas = !enComillas;
      continue;
    }
    if (char === "," && !enComillas) {
      result.push(actual);
      actual = "";
      continue;
    }
    actual += char;
  }
  result.push(actual);
  return result.map((item) => item.trim());
}

export async function cargarDocentesCsv(contenido: string): Promise<{
  creados: number;
  errores: Array<{ fila: number; motivo: string }>;
}> {
  const lineas = contenido
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0);

  if (lineas.length === 0) {
    return { creados: 0, errores: [] };
  }

  const primera = parseCsvLine(lineas[0]!);
  const tieneCabecera = primera.some((item) =>
    item.toLowerCase().includes("correo"),
  );
  const filas = tieneCabecera ? lineas.slice(1) : lineas;
  const errores: Array<{ fila: number; motivo: string }> = [];
  let creados = 0;

  for (let index = 0; index < filas.length; index += 1) {
    const numeroFila = tieneCabecera ? index + 2 : index + 1;
    const campos = parseCsvLine(filas[index]!);
    const [nombre, correo, documento, especialidad] = campos;
    if (!nombre || !correo) {
      errores.push({ fila: numeroFila, motivo: "Faltan nombre y/o correo." });
      continue;
    }
    try {
      await crearDocente({
        nombre,
        correo,
        documento: documento || null,
        especialidad: especialidad || null,
      });
      creados += 1;
    } catch (error) {
      errores.push({
        fila: numeroFila,
        motivo: error instanceof Error ? error.message : "Error desconocido.",
      });
    }
  }

  return { creados, errores };
}

// ===================== Estudiantes =====================
export async function listarEstudiantesPisu(consulta?: string): Promise<UsuarioPisu[]> {
  const where: Record<string, unknown> = { rol: "Estudiante" };
  if (consulta?.trim()) {
    const q = `%${consulta.trim()}%`;
    Object.assign(where, {
      [Op.or]: [
        { nombre: { [Op.iLike]: q } },
        { correo: { [Op.iLike]: q } },
        { documento: { [Op.iLike]: q } },
      ],
    });
  }
  return UsuarioPisu.findAll({ where, order: [["nombre", "ASC"]] });
}

export async function actualizarEstudiantePisu(
  id: string,
  cambios: { categoria?: string | null | undefined; estado?: boolean | undefined; nombre?: string | undefined },
): Promise<UsuarioPisu> {
  const estudiante = await UsuarioPisu.findByPk(id);
  if (!estudiante || estudiante.rol !== "Estudiante") {
    throw new RecursoAdminNoEncontradoError("El estudiante no existe.");
  }
  if (cambios.nombre !== undefined) {
    estudiante.nombre = cambios.nombre.trim();
  }
  if (cambios.categoria !== undefined) {
    const categoria =
      cambios.categoria &&
      (["Pregrado", "Postgrado", "Egresado"] as readonly string[]).includes(
        cambios.categoria,
      )
        ? cambios.categoria
        : null;
    estudiante.categoria = categoria as never;
  }
  if (cambios.estado !== undefined) {
    estudiante.estado = cambios.estado;
  }
  await estudiante.save();
  return estudiante;
}

export async function buscarEstudiantesConInscripciones(consulta: string): Promise<UsuarioPisu[]> {
  const q = `%${consulta.trim()}%`;
  return UsuarioPisu.findAll({
    where: {
      rol: "Estudiante",
      [Op.or]: [
        { nombre: { [Op.iLike]: q } },
        { correo: { [Op.iLike]: q } },
        { documento: { [Op.iLike]: q } },
      ],
    },
    include: [
      {
        model: InscripcionDeporte,
        as: "inscripciones",
        where: { estado: "Activa" },
        required: false,
        include: [{ model: Deporte, as: "deporte", attributes: ["id", "nombre"] }],
      },
    ],
    order: [["nombre", "ASC"]],
  });
}

// ===================== Inscripciones manuales =====================
export async function inscribirEstudianteManual(params: {
  estudiante_id: string;
  deporte_id: string;
}): Promise<InscripcionDeporte> {
  const estudiante = await UsuarioPisu.findByPk(params.estudiante_id);
  if (!estudiante || estudiante.rol !== "Estudiante") {
    throw new RecursoAdminNoEncontradoError("El estudiante no existe.");
  }
  const deporte = await Deporte.findByPk(params.deporte_id);
  if (!deporte) {
    throw new RecursoAdminNoEncontradoError("El deporte no existe.");
  }

  const existente = await InscripcionDeporte.findOne({
    where: { estudiante_id: params.estudiante_id, deporte_id: params.deporte_id },
    order: [["fecha_inscripcion", "DESC"]],
  });

  if (existente?.estado === "Activa") {
    throw new InscripcionDuplicadaError("El estudiante ya está inscrito en este deporte.");
  }
  if (existente && existente.estado === "Cancelada") {
    await existente.update({ estado: "Activa", fecha_inscripcion: new Date() });
    return existente;
  }

  return InscripcionDeporte.create({
    estudiante_id: params.estudiante_id,
    deporte_id: params.deporte_id,
    estado: "Activa",
  });
}

export async function retirarInscripcionManual(inscripcionId: string): Promise<void> {
  const inscripcion = await InscripcionDeporte.findByPk(inscripcionId);
  if (!inscripcion) {
    throw new RecursoAdminNoEncontradoError("La inscripción no existe.");
  }
  await inscripcion.update({ estado: "Cancelada" });
}

// ===================== Deporte elim/deactivación =====================
export async function eliminarDeporteAdmin(id: string): Promise<void> {
  const deporte = await Deporte.findByPk(id);
  if (!deporte) {
    throw new RecursoAdminNoEncontradoError("El deporte no existe.");
  }
  const inscritos = await InscripcionDeporte.count({
    where: { deporte_id: id, estado: "Activa" },
  });
  if (inscritos > 0) {
    throw new DeporteConInscritosError(
      `El deporte tiene ${inscritos} estudiante(s) inscrito(s). No se puede eliminar sin impactar inscripciones.`,
    );
  }
  await HorarioDeporte.destroy({ where: { deporte_id: id } });
  await deporte.destroy();
}

// ===================== Dashboard =====================
export async function dashboardAdministracion(): Promise<{
  docentesActivos: number;
  estudiantesPorCategoria: { Pregrado: number; Postgrado: number; Egresado: number };
  totalEstudiantes: number;
  deportes: Array<{
    id: string;
    nombre: string;
    cupo_maximo: number;
    inscritos: number;
    ocupacion: number;
    categorias_permitidas: string[];
  }>;
  deporteMasOcupado: { nombre: string; ocupacion: number } | null;
  deporteMenosOcupado: { nombre: string; ocupacion: number } | null;
  inscripciones30Dias: Array<{ fecha: string; total: number }>;
}> {
  const deportes = await Deporte.findAll({ order: [["nombre", "ASC"]] });
  const deportesResumen = [];
  let masOcupado: { nombre: string; ocupacion: number } | null = null;
  let menosOcupado: { nombre: string; ocupacion: number } | null = null;

  for (const deporte of deportes) {
    const inscritos = await InscripcionDeporte.count({
      where: { deporte_id: deporte.id, estado: "Activa" },
    });
    const ocupacion =
      deporte.cupo_maximo > 0 ? Math.round((inscritos / deporte.cupo_maximo) * 100) : 0;
    deportesResumen.push({
      id: deporte.id,
      nombre: deporte.nombre,
      cupo_maximo: deporte.cupo_maximo,
      inscritos,
      ocupacion,
      categorias_permitidas: deporte.categorias_permitidas,
    });
    if (deporte.estado) {
      if (!masOcupado || ocupacion > masOcupado.ocupacion) {
        masOcupado = { nombre: deporte.nombre, ocupacion };
      }
      if (!menosOcupado || ocupacion < menosOcupado.ocupacion) {
        menosOcupado = { nombre: deporte.nombre, ocupacion };
      }
    }
  }

  const estudiantes = await UsuarioPisu.findAll({ where: { rol: "Estudiante" } });
  const porCategoria = {
    Pregrado: 0,
    Postgrado: 0,
    Egresado: 0,
  };
  for (const estudiante of estudiantes) {
    if (estudiante.categoria && estudiante.categoria in porCategoria) {
      porCategoria[estudiante.categoria as keyof typeof porCategoria] += 1;
    }
  }

  const docentesActivos = await UsuarioPisu.count({
    where: { rol: "Docente", estado: true },
  });

  const fechaInicio30 = new Date();
  fechaInicio30.setDate(fechaInicio30.getDate() - 29);
  fechaInicio30.setHours(0, 0, 0, 0);
  const filas30 = await InscripcionDeporte.findAll({
    attributes: [
      [fn("date", col("fecha_inscripcion")), "fecha"],
      [fn("count", col("id")), "total"],
    ],
    where: {
      estado: "Activa",
      fecha_inscripcion: { [Op.gte]: fechaInicio30 },
    },
    group: [fn("date", col("fecha_inscripcion"))],
    order: [[fn("date", col("fecha_inscripcion")), "ASC"]] as never,
    raw: true,
  });
  const inscripciones30Dias = (filas30 as unknown as Array<Record<string, unknown>>).map((row) => ({
    fecha: String(row.fecha),
    total: Number(row.total),
  }));

  return {
    docentesActivos,
    estudiantesPorCategoria: porCategoria,
    totalEstudiantes: estudiantes.length,
    deportes: deportesResumen,
    deporteMasOcupado: masOcupado,
    deporteMenosOcupado: menosOcupado,
    inscripciones30Dias,
  };
}

export async function verificacionAdmin(): Promise<Record<string, unknown>> {
  const ahora = new Date();
  const en7dias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalDeportes,
    deportesActivos,
    totalHorarios,
    totalEventos,
    eventosProximos7,
    totalDocentes,
    docentesActivos,
    totalEstudiantes,
    totalInscripciones,
    inscripciones7dias,
    totalComunicados,
  ] = await Promise.all([
    Deporte.count(),
    Deporte.count({ where: { estado: true } }),
    HorarioDeporte.count(),
    EventoDeporte.count(),
    EventoDeporte.count({ where: { estado: true, fecha: { [Op.gte]: ahora, [Op.lte]: en7dias } } }),
    UsuarioPisu.count({ where: { rol: "Docente" } }),
    UsuarioPisu.count({ where: { rol: "Docente", estado: true } }),
    UsuarioPisu.count({ where: { rol: "Estudiante" } }),
    InscripcionDeporte.count({ where: { estado: "Activa" } }),
    InscripcionDeporte.count({ where: { estado: "Activa", fecha_inscripcion: { [Op.gte]: new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000) } } }),
    Alerta.count(),
  ]);

  const activos = await Deporte.findAll({ where: { estado: true }, attributes: ["id"] });
  let sinHorario = 0;
  let sinDocente = 0;
  for (const d of activos) {
    const h = await HorarioDeporte.count({ where: { deporte_id: d.id, estado: true } });
    if (h === 0) sinHorario += 1;
    const hd = await HorarioDeporte.findOne({ where: { deporte_id: d.id, estado: true } });
    if (!hd) sinDocente += 1;
  }

  const ocupacionDeportes = [];
  const todos = await Deporte.findAll({ where: { estado: true }, order: [["nombre", "ASC"]] });
  for (const d of todos) {
    const inscritos = await InscripcionDeporte.count({ where: { deporte_id: d.id, estado: "Activa" } });
    ocupacionDeportes.push({
      id: d.id,
      nombre: d.nombre,
      cupo_maximo: d.cupo_maximo,
      inscritos,
      ocupacion: d.cupo_maximo > 0 ? Math.round((inscritos / d.cupo_maximo) * 100) : 0,
    });
  }

  const [ultDeportes, ultEventos, ultAlertas, ultUsuarios] = await Promise.all([
    Deporte.findAll({ attributes: ["id", "nombre", "fecha_creacion"], order: [["fecha_creacion", "DESC"]], limit: 4 }),
    EventoDeporte.findAll({ attributes: ["id", "nombre", "fecha_creacion"], order: [["fecha_creacion", "DESC"]], limit: 4 }),
    Alerta.findAll({ attributes: ["id", "titulo", "fecha_creacion"], order: [["fecha_creacion", "DESC"]], limit: 4 }),
    UsuarioPisu.findAll({ attributes: ["id", "nombre", "fecha_creacion", "rol"], order: [["fecha_creacion", "DESC"]], limit: 4 }),
  ]);
  const timeline: Array<{ tipo: string; nombre: string; fecha: Date; id: string }> = [];
  for (const d of ultDeportes) timeline.push({ tipo: "Deporte", nombre: d.nombre, fecha: new Date(d.fecha_creacion), id: String(d.id) });
  for (const e of ultEventos) timeline.push({ tipo: "Evento", nombre: e.nombre, fecha: new Date(e.fecha_creacion), id: String(e.id) });
  for (const a of ultAlertas) timeline.push({ tipo: "Comunicado", nombre: a.titulo, fecha: new Date(a.fecha_creacion), id: String(a.id) });
  for (const u of ultUsuarios) timeline.push({ tipo: String(u.rol), nombre: u.nombre, fecha: new Date(u.fecha_creacion), id: String(u.id) });
  timeline.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  const timelineFinal = timeline.slice(0, 10);

  const clases = await HorarioDeporte.findAll({
    where: { estado: true },
    include: [
      { model: Deporte, as: "deporte", attributes: ["id", "nombre"] },
      { model: UsuarioPisu, as: "docente", attributes: ["id", "nombre"] },
    ],
    order: [["dia_semana", "ASC"], ["hora_inicio", "ASC"]],
  });

  const checklist = [
    { key: "docente", label: "Hay al menos un docente activo", ok: docentesActivos > 0 },
    { key: "deporte", label: "Hay al menos un deporte activo", ok: deportesActivos > 0 },
    { key: "horarios", label: "Todos los deportes tienen horarios", ok: sinHorario === 0 && deportesActivos > 0 },
    { key: "docente_asignado", label: "Todos los deportes tienen docente asignado", ok: sinDocente === 0 && deportesActivos > 0 },
    { key: "evento", label: "Hay al menos un evento proximo", ok: eventosProximos7 > 0 },
    { key: "inscritos", label: "Hay estudiantes inscritos en algun deporte", ok: totalInscripciones > 0 },
    { key: "comunicado", label: "Hay al menos un comunicado publicado", ok: totalComunicados > 0 },
  ];
  const completados = checklist.filter((c) => c.ok).length;

  return {
    conteos: {
      deportes: totalDeportes,
      horarios: totalHorarios,
      eventos: totalEventos,
      docentes: totalDocentes,
      estudiantes: totalEstudiantes,
      inscripciones: totalInscripciones,
      comunicados: totalComunicados,
    },
    checklist,
    progreso: { completados, total: checklist.length },
    alertas: {
      deportesSinHorario: sinHorario,
      deportesSinDocente: sinDocente,
      deportesOcupacionAlta: ocupacionDeportes.filter((d) => d.ocupacion >= 90).length,
      deportesSinInscritos: ocupacionDeportes.filter((d) => d.inscritos === 0).length,
      eventosProximos7,
    },
    timeline: timelineFinal,
    previews: {
      deportes: ocupacionDeportes,
      eventosProximos: await EventoDeporte.findAll({ where: { estado: true, fecha: { [Op.gte]: ahora } }, order: [["fecha", "ASC"]], limit: 8 }),
      clases,
    },
    indicadores: {
      deportesActivos,
      docentesActivos,
      totalEstudiantes,
      totalInscripciones,
      inscripciones7dias,
      ocupacionPromedio: ocupacionDeportes.length ? Math.round(ocupacionDeportes.reduce((a, d) => a + d.ocupacion, 0) / ocupacionDeportes.length) : 0,
      estudiantesSinInscripcion: Math.max(0, totalEstudiantes - totalInscripciones),
    },
  };
}
