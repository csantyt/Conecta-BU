import { Op, UniqueConstraintError, type Transaction } from "sequelize";
import { sequelize } from "../../../config/database.js";
import type { UsuarioPisuSesion } from "../middlewares/tipos.js";
import { Deporte } from "../models/Deporte.js";
import { EventoDeporte } from "../models/EventoDeporte.js";
import { HorarioDeporte } from "../models/HorarioDeporte.js";
import { InscripcionDeporte } from "../models/InscripcionDeporte.js";
import { hayTraslape } from "../utils/horarios.js";

export class RecursoNoEncontradoError extends Error {}
export class DatosInvalidosError extends Error {}
export class CategoriaNoPermitidaError extends Error {}
export class CupoAgotadoError extends Error {}
export class CruceHorarioError extends Error {}
export class YaInscritoError extends Error {}
export class OperacionNoPermitidaError extends Error {}

export { hayTraslape };

async function bloquearClave(clave: string, transaction: Transaction): Promise<void> {
  await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:clave))", {
    replacements: { clave },
    transaction,
  });
}

function horaDesdeFecha(fecha: Date): { dia: number; inicio: string; fin: string } {
  const dia = fecha.getDay();
  const inicio = `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}:00`;
  const finDate = new Date(fecha.getTime() + 60 * 60 * 1000);
  const cruzaDia = finDate.getDay() !== dia;
  const fin = cruzaDia
    ? "23:59:59"
    : `${String(finDate.getHours()).padStart(2, "0")}:${String(finDate.getMinutes()).padStart(2, "0")}:00`;
  return { dia, inicio, fin };
}

async function validarCruceHorario(params: {
  estudianteId: string;
  deporteId: string;
  horariosNuevos: HorarioDeporte[];
  transaction: Transaction;
}): Promise<void> {
  const otras = await InscripcionDeporte.findAll({
    where: {
      estudiante_id: params.estudianteId,
      estado: "Activa",
      deporte_id: { [Op.ne]: params.deporteId },
    },
    transaction: params.transaction,
    lock: params.transaction.LOCK.UPDATE,
  });

  const idsOtras = otras.map((item) => item.deporte_id);
  const horariosPrevios =
    idsOtras.length === 0
      ? []
      : await HorarioDeporte.findAll({
          where: { deporte_id: { [Op.in]: idsOtras }, estado: true },
          transaction: params.transaction,
        });

  for (const nuevo of params.horariosNuevos) {
    for (const previo of horariosPrevios) {
      if (
        nuevo.dia_semana === previo.dia_semana &&
        hayTraslape(
          String(nuevo.hora_inicio),
          String(nuevo.hora_fin),
          String(previo.hora_inicio),
          String(previo.hora_fin),
        )
      ) {
        throw new CruceHorarioError(
          "El horario se cruza con otra clase en la que ya estás inscrito (RN-001).",
        );
      }
    }
  }

  const ahora = new Date();
  const eventos = await EventoDeporte.findAll({
    where: { estado: true, fecha: { [Op.gte]: ahora } },
    transaction: params.transaction,
  });

  const bloques = [...params.horariosNuevos, ...horariosPrevios];
  for (const evento of eventos) {
    const bloqueEvento = horaDesdeFecha(new Date(evento.fecha));
    for (const clase of bloques) {
      if (
        clase.dia_semana === bloqueEvento.dia &&
        hayTraslape(
          String(clase.hora_inicio),
          String(clase.hora_fin),
          bloqueEvento.inicio,
          bloqueEvento.fin,
        )
      ) {
        throw new CruceHorarioError(
          `El horario se cruza con el evento activo "${evento.nombre}" (RN-001).`,
        );
      }
    }
  }
}

export async function autoinscribirseADeporte(params: {
  perfil: UsuarioPisuSesion;
  deporteId: string;
}): Promise<InscripcionDeporte> {
  if (params.perfil.rol !== "Estudiante") {
    throw new OperacionNoPermitidaError(
      "La autoinscripción (RF-019) solo está disponible para estudiantes.",
    );
  }

  if (!params.perfil.categoria) {
    throw new DatosInvalidosError(
      "Tu perfil de estudiante no tiene categoría académica (Pregrado, Postgrado o Egresado).",
    );
  }

  return sequelize.transaction(async (transaction) => {
    await bloquearClave(`pisu-deporte-${params.deporteId}`, transaction);
    await bloquearClave(`pisu-estudiante-${params.perfil.id}`, transaction);

    const deporte = await Deporte.findByPk(params.deporteId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!deporte || !deporte.estado) {
      throw new RecursoNoEncontradoError("El deporte no existe o no está activo.");
    }

    const categorias = deporte.categorias_permitidas ?? [];
    if (!categorias.includes(params.perfil.categoria)) {
      throw new CategoriaNoPermitidaError(
        `Tu categoría (${params.perfil.categoria}) no está permitida en este deporte (RN-002).`,
      );
    }

    const yaActiva = await InscripcionDeporte.findOne({
      where: {
        estudiante_id: params.perfil.id,
        deporte_id: deporte.id,
        estado: "Activa",
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (yaActiva) {
      throw new YaInscritoError("Ya tienes una inscripción activa en este deporte.");
    }

    const ocupadas = await InscripcionDeporte.count({
      where: { deporte_id: deporte.id, estado: "Activa" },
      transaction,
    });

    if (ocupadas >= deporte.cupo_maximo) {
      throw new CupoAgotadoError(
        "No hay cupos disponibles para este deporte (RN-003).",
      );
    }

    const horariosNuevos = await HorarioDeporte.findAll({
      where: { deporte_id: deporte.id, estado: true },
      transaction,
    });

    await validarCruceHorario({
      estudianteId: params.perfil.id,
      deporteId: deporte.id,
      horariosNuevos,
      transaction,
    });

    try {
      return await InscripcionDeporte.create(
        {
          estudiante_id: params.perfil.id,
          deporte_id: deporte.id,
          estado: "Activa",
        },
        { transaction },
      );
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new YaInscritoError("Ya tienes una inscripción activa en este deporte.");
      }
      throw error;
    }
  });
}

export async function cancelarInscripcionDeporte(params: {
  perfil: UsuarioPisuSesion;
  inscripcionId: string;
}): Promise<void> {
  const inscripcion = await InscripcionDeporte.findByPk(params.inscripcionId);
  if (!inscripcion || inscripcion.estudiante_id !== params.perfil.id) {
    throw new RecursoNoEncontradoError("La inscripción no existe.");
  }
  if (inscripcion.estado !== "Activa") {
    throw new DatosInvalidosError("La inscripción ya está cancelada.");
  }
  await inscripcion.update({ estado: "Cancelada" });
}
