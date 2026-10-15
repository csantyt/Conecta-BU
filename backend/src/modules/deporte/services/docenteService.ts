import { Op, UniqueConstraintError } from "sequelize";
import { sequelize } from "../../../config/database.js";
import type { UsuarioPisuSesion } from "../middlewares/tipos.js";
import {
  Asistencia,
  AsistenciaDetalle,
  HorarioDeporte,
  InscripcionDeporte,
  UsuarioPisu,
} from "../models/index.js";
import { Comunicado } from "../models/Comunicado.js";
import { Deporte } from "../models/Deporte.js";
import { generarAlertasInasistencia } from "./alertasService.js";
import { actualizarDeporte, actualizarHorarioAdmin, crearHorarioAdmin } from "./adminService.js";

export class RecursoDocenteNoEncontradoError extends Error {}
export class ClaseNoAsignadaError extends Error {}
export class VentanaAsistenciaCerradaError extends Error {}
export class EstudianteNoInscritoError extends Error {}
export class DatosAsistenciaInvalidosError extends Error {}
export class AsistenciaDuplicadaError extends Error {}

const VENTANA_EDICION_MS = 24 * 60 * 60 * 1000;

function fechaBogotaHoy(): string {
  const ahora = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }),
  );
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(
    ahora.getDate(),
  ).padStart(2, "0")}`;
}

function diaSemanaBogota(fecha: Date): number {
  const ahora = new Date(
    fecha.toLocaleString("en-US", { timeZone: "America/Bogota" }),
  );
  return ahora.getDay();
}

function combinarFechaHora(fecha: string, hora: string): number {
  const normalizada = hora.length === 5 ? `${hora}:00` : hora.slice(0, 8);
  return new Date(`${fecha}T${normalizada}-05:00`).getTime();
}

function ignorarVentana(): boolean {
  return (
    process.env["ASISTENCIA_IGNORAR_HORARIO"] === "true" &&
    process.env["NODE_ENV"] !== "production"
  );
}

export async function listarMisClases(perfil: UsuarioPisuSesion) {
  return HorarioDeporte.findAll({
    where: { docente_id: perfil.id, estado: true },
    include: [{ association: "deporte" }],
    order: [
      ["dia_semana", "ASC"],
      ["hora_inicio", "ASC"],
    ],
  });
}

export async function listarMisClasesHoy(perfil: UsuarioPisuSesion) {
  const dia = diaSemanaBogota(new Date());
  const clases = await HorarioDeporte.findAll({
    where: { docente_id: perfil.id, dia_semana: dia, estado: true },
    include: [{ association: "deporte" }],
    order: [["hora_inicio", "ASC"]],
  });

  const comunicados = await Comunicado.findAll({
    where: { audiencia: ["Todos", "Docentes"] },
    order: [["fecha_creacion", "DESC"]],
  });

  const mensaje =
    clases.length === 0
      ? "No tienes clases programadas para hoy. Revisa tu horario asignado."
      : null;

  return { clases, comunicados, mensaje };
}

export async function asegurarClaseDelDocente(params: {
  perfil: UsuarioPisuSesion;
  horarioId: string;
}): Promise<HorarioDeporte> {
  const horario = await HorarioDeporte.findByPk(params.horarioId, {
    include: [{ association: "deporte" }],
  });

  if (!horario) {
    throw new RecursoDocenteNoEncontradoError("La clase no existe.");
  }

  if (horario.docente_id !== params.perfil.id) {
    throw new ClaseNoAsignadaError(
      "No puedes gestionar una clase que no te está asignada (RN-004).",
    );
  }

  return horario;
}

export type EstudianteDeClase = {
  inscripcion_id: string;
  estudiante: {
    id: string;
    nombre: string;
    correo: string;
    categoria: string | null;
    rol: string;
    estado: boolean;
  } | null;
};

export async function listarEstudiantesDeClase(params: {
  perfil: UsuarioPisuSesion;
  horarioId: string;
}): Promise<{ horario: HorarioDeporte; estudiantes: EstudianteDeClase[] }> {
  const horario = await asegurarClaseDelDocente(params);

  const inscripciones = await InscripcionDeporte.findAll({
    where: { deporte_id: horario.deporte_id, estado: "Activa" },
    include: [
      {
        model: UsuarioPisu,
        as: "estudiante",
        attributes: ["id", "nombre", "correo", "categoria", "rol", "estado"],
      },
    ],
    order: [["fecha_inscripcion", "ASC"]],
  });

  const estudiantes: EstudianteDeClase[] = inscripciones.map((item) => {
    const estudiante = item.get("estudiante") as UsuarioPisu | undefined;
    return {
      inscripcion_id: item.id,
      estudiante: estudiante
        ? {
            id: estudiante.id,
            nombre: estudiante.nombre,
            correo: estudiante.correo,
            categoria: estudiante.categoria,
            rol: estudiante.rol,
            estado: estudiante.estado,
          }
        : null,
    };
  });

  return { horario, estudiantes };
}

export async function registrarAsistenciaLista(params: {
  perfil: UsuarioPisuSesion;
  horarioId: string;
  fecha: string;
  registros: Array<{ estudianteId: string; presente: boolean }>;
}): Promise<AsistenciaDetalle[]> {
  if (params.registros.length === 0) {
    throw new DatosAsistenciaInvalidosError("Debes enviar al menos un estudiante.");
  }

  const fecha = params.fecha || fechaBogotaHoy();

  const resultado = await sequelize.transaction(async (transaction) => {
    const horario = await HorarioDeporte.findByPk(params.horarioId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!horario) {
      throw new RecursoDocenteNoEncontradoError("La clase no existe.");
    }
    if (horario.docente_id !== params.perfil.id) {
      throw new ClaseNoAsignadaError(
        "No puedes registrar asistencia de una clase que no te está asignada (RN-004).",
      );
    }

    const existente = await Asistencia.findOne({
      where: { horario_id: horario.id, fecha },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existente) {
      throw new AsistenciaDuplicadaError(
        "Ya existe una asistencia registrada para esta clase y fecha (409).",
      );
    }

    if (!ignorarVentana() && fecha === fechaBogotaHoy()) {
      const ahoraMs = Date.now();
      const inicioMs = combinarFechaHora(fecha, String(horario.hora_inicio));
      const finMs = combinarFechaHora(fecha, String(horario.hora_fin));
      const ventanaInicio = inicioMs - 15 * 60 * 1000;
      if (ahoraMs < ventanaInicio || ahoraMs > finMs) {
        throw new VentanaAsistenciaCerradaError(
          "La asistencia solo puede registrarse desde 15 minutos antes del inicio hasta el final de la clase.",
        );
      }
    }

    const guardadas: AsistenciaDetalle[] = [];

    for (const registro of params.registros) {
      const inscrito = await InscripcionDeporte.findOne({
        where: {
          estudiante_id: registro.estudianteId,
          deporte_id: horario.deporte_id,
          estado: "Activa",
        },
        transaction,
      });
      if (!inscrito) {
        throw new EstudianteNoInscritoError(
          "Hay estudiantes que no están inscritos de forma activa en este deporte.",
        );
      }
    }

    let cabecera: Asistencia;
    try {
      cabecera = await Asistencia.create(
        {
          horario_id: horario.id,
          fecha,
          docente_id: params.perfil.id,
        },
        { transaction },
      );
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new AsistenciaDuplicadaError(
          "Ya existe una asistencia registrada para esta clase y fecha (409).",
        );
      }
      throw error;
    }

    for (const registro of params.registros) {
      const detalle = await AsistenciaDetalle.create(
        {
          asistencia_id: cabecera.id,
          estudiante_id: registro.estudianteId,
          presente: registro.presente,
        },
        { transaction },
      );
      guardadas.push(detalle);
    }

    return { guardadas, deporteId: horario.deporte_id };
  });

  const deporteId = resultado.deporteId;
  await generarAlertasInasistencia({
    deporteId,
    estudianteIds: params.registros
      .filter((registro) => !registro.presente)
      .map((registro) => registro.estudianteId),
  });

  return resultado.guardadas;
}

export async function editarAsistencia(params: {
  perfil: UsuarioPisuSesion;
  asistenciaId: string;
  presente: boolean;
}): Promise<AsistenciaDetalle> {
  const detalle = await AsistenciaDetalle.findByPk(params.asistenciaId, {
    include: [{ model: Asistencia, as: "asistencia" }],
  });
  if (!detalle) {
    throw new RecursoDocenteNoEncontradoError("La asistencia no existe.");
  }
  const asistencia = (detalle as { asistencia?: Asistencia }).asistencia;
  if (!asistencia || asistencia.docente_id !== params.perfil.id) {
    throw new ClaseNoAsignadaError(
      "No puedes editar una asistencia que no registraste (RN-004).",
    );
  }

  const horario = await HorarioDeporte.findByPk(asistencia.horario_id, {
    attributes: ["hora_fin"],
  });
  const fechaFinMs = horario
    ? combinarFechaHora(asistencia.fecha, String(horario.hora_fin))
    : 0;
  if (Date.now() - fechaFinMs > VENTANA_EDICION_MS) {
    throw new VentanaAsistenciaCerradaError(
      "Solo puedes editar la asistencia hasta 24 h después del fin de la clase.",
    );
  }

  await detalle.update({ presente: params.presente });

  if (!params.presente && horario) {
    const h = await HorarioDeporte.findByPk(asistencia.horario_id, {
      attributes: ["deporte_id"],
    });
    if (h) {
      await generarAlertasInasistencia({
        deporteId: h.deporte_id,
        estudianteIds: [detalle.estudiante_id],
      });
    }
  }

  return detalle;
}

export async function listarAsistenciasDocente(
  perfil: UsuarioPisuSesion,
  fecha?: string,
) {
  const where: { docente_id: string; fecha?: string } = { docente_id: perfil.id };
  if (fecha) {
    where.fecha = fecha;
  }
  return Asistencia.findAll({
    where,
    order: [["fecha", "DESC"]],
    include: [{ model: AsistenciaDetalle, as: "detalles" }],
  });
}

export async function listarEstudiantesDocente(filtro?: string) {
  const where: Record<string, unknown> = { rol: "Estudiante" };
  if (filtro && filtro.trim()) {
    where.nombre = { [Op.iLike]: `%${filtro.trim()}%` };
  }
  return UsuarioPisu.findAll({
    where,
    order: [["nombre", "ASC"]],
  });
}

export async function actualizarEstudianteDocente(
  id: string,
  cambios: Partial<{
    nombre: string;
    correo: string;
    categoria: string | null;
    documento: string | null;
    especialidad: string | null;
    estado: boolean;
  }>,
): Promise<UsuarioPisu> {
  const estudiante = await UsuarioPisu.findByPk(id);
  if (!estudiante || estudiante.rol !== "Estudiante") {
    throw new RecursoDocenteNoEncontradoError("El estudiante no existe.");
  }
  if (cambios.estado === false) {
    await InscripcionDeporte.update(
      { estado: "Cancelada" },
      { where: { estudiante_id: id, estado: "Activa" } },
    );
  }
  await estudiante.update(cambios as Record<string, unknown>);
  return estudiante;
}

export async function desactivarEstudianteDocente(id: string): Promise<UsuarioPisu> {
  return actualizarEstudianteDocente(id, { estado: false });
}

export async function actualizarDeporteDocente(
  id: string,
  cambios: Partial<{
    nombre: string;
    descripcion: string | null;
    cupo_maximo: number;
    categorias_permitidas: string[];
    estado: boolean;
  }>,
) {
  return actualizarDeporte(id, cambios as Record<string, unknown>);
}

export async function desactivarDeporteDocente(id: string) {
  return actualizarDeporte(id, { estado: false });
}

export async function crearHorarioDocente(
  perfil: UsuarioPisuSesion,
  params: {
    deporte_id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    lugar: string;
  },
) {
  return crearHorarioAdmin({
    deporte_id: params.deporte_id,
    docente_id: perfil.id,
    dia_semana: params.dia_semana,
    hora_inicio: params.hora_inicio,
    hora_fin: params.hora_fin,
    lugar: params.lugar,
  });
}

export async function actualizarHorarioDocente(
  perfil: UsuarioPisuSesion,
  id: string,
  cambios: Partial<{
    deporte_id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    lugar: string;
    estado: boolean;
  }>,
) {
  const horario = await HorarioDeporte.findByPk(id);
  if (!horario) {
    throw new RecursoDocenteNoEncontradoError("El horario no existe.");
  }
  if (horario.docente_id !== perfil.id) {
    throw new ClaseNoAsignadaError("No puedes editar un horario que no te pertenece.");
  }
  return actualizarHorarioAdmin(id, { ...cambios, docente_id: perfil.id } as Record<string, unknown>);
}

export async function desactivarHorarioDocente(
  perfil: UsuarioPisuSesion,
  id: string,
) {
  return actualizarHorarioDocente(perfil, id, { estado: false });
}