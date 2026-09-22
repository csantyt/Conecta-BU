import { Op, type Transaction, type WhereOptions } from "sequelize";
import { sequelize } from "../../../config/database.js";
import { Cita } from "../models/Cita.js";
import { Horario } from "../models/Horario.js";
import { Servicio } from "../models/Servicio.js";

export class RecursoNoEncontradoError extends Error {}
export class ConflictoHorarioError extends Error {}
export class CitaActivaError extends Error {}
export class CupoAgotadoError extends Error {}
export class HorarioNoDisponibleError extends Error {}
export class OperacionNoPermitidaError extends Error {}

export type DatosHorario = {
  servicio_id: string;
  profesional?: string | null;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  cupo: number;
  activo?: boolean;
};

function normalizarHora(hora: string): string {
  return hora.length === 5 ? `${hora}:00` : hora.slice(0, 8);
}

function aMinutos(hora: string): number {
  const [horas, minutos] = normalizarHora(hora).split(":").map(Number);
  return (horas ?? 0) * 60 + (minutos ?? 0);
}

export function hayTraslape(
  inicioA: string,
  finA: string,
  inicioB: string,
  finB: string,
): boolean {
  return aMinutos(inicioA) < aMinutos(finB) && aMinutos(finA) > aMinutos(inicioB);
}

async function bloquearClave(clave: string, transaction: Transaction): Promise<void> {
  await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:clave))", {
    replacements: { clave },
    transaction,
  });
}

export async function validarTraslapes(
  datos: DatosHorario,
  opciones?: { excluirId?: string; transaction?: Transaction },
): Promise<void> {
  if (aMinutos(datos.hora_inicio) >= aMinutos(datos.hora_fin)) {
    throw new ConflictoHorarioError("La hora de fin debe ser posterior a la de inicio.");
  }

  const where: WhereOptions = {
    activo: true,
    dia_semana: datos.dia_semana,
    ...(opciones?.excluirId ? { id: { [Op.ne]: opciones.excluirId } } : {}),
    [Op.or]: [
      { servicio_id: datos.servicio_id },
      ...(datos.profesional ? [{ profesional: datos.profesional }] : []),
    ],
  };

  const candidatos = await Horario.findAll({
    where,
    ...(opciones?.transaction
      ? { transaction: opciones.transaction, lock: opciones.transaction.LOCK.UPDATE }
      : {}),
  });

  const conflicto = candidatos.some((item) =>
    hayTraslape(
      datos.hora_inicio,
      datos.hora_fin,
      String(item.hora_inicio),
      String(item.hora_fin),
    ),
  );

  if (conflicto) {
    throw new ConflictoHorarioError(
      "El horario se traslapa con otro cupo del mismo servicio o profesional (RN-003).",
    );
  }
}

function inicioYFinDelDia(fecha: string): { inicio: Date; fin: Date } {
  return {
    inicio: new Date(`${fecha}T00:00:00`),
    fin: new Date(`${fecha}T23:59:59.999`),
  };
}

export function horaParaFecha(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${normalizarHora(hora)}`);
}

async function asegurarServicio(servicioId: string): Promise<Servicio> {
  const servicio = await Servicio.findByPk(servicioId);
  if (!servicio) {
    throw new RecursoNoEncontradoError("El servicio no existe.");
  }
  return servicio;
}

export async function crearHorarioConValidacion(datos: DatosHorario): Promise<Horario> {
  await asegurarServicio(datos.servicio_id);

  return sequelize.transaction(async (transaction) => {
    await bloquearClave(
      `dh-horario-${datos.servicio_id}-${datos.dia_semana}`,
      transaction,
    );
    await validarTraslapes(datos, { transaction });

    return Horario.create(
      {
        servicio_id: datos.servicio_id,
        profesional: datos.profesional ?? null,
        dia_semana: datos.dia_semana,
        hora_inicio: datos.hora_inicio,
        hora_fin: datos.hora_fin,
        cupo: datos.cupo,
        activo: true,
      },
      { transaction },
    );
  });
}

export async function actualizarHorarioConValidacion(
  id: string,
  cambios: Partial<DatosHorario>,
): Promise<Horario> {
  return sequelize.transaction(async (transaction) => {
    const horario = await Horario.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!horario) {
      throw new RecursoNoEncontradoError("El horario no existe.");
    }

    const merged: DatosHorario = {
      servicio_id: cambios.servicio_id ?? horario.servicio_id,
      profesional:
        cambios.profesional === undefined ? horario.profesional : cambios.profesional,
      dia_semana: cambios.dia_semana ?? horario.dia_semana,
      hora_inicio: cambios.hora_inicio ?? String(horario.hora_inicio),
      hora_fin: cambios.hora_fin ?? String(horario.hora_fin),
      cupo: cambios.cupo ?? horario.cupo,
      activo: cambios.activo ?? horario.activo,
    };

    await asegurarServicio(merged.servicio_id);
    await bloquearClave(
      `dh-horario-${merged.servicio_id}-${merged.dia_semana}`,
      transaction,
    );

    if (merged.activo !== false) {
      await validarTraslapes(merged, { excluirId: id, transaction });
    }

    await horario.update(
      {
        servicio_id: merged.servicio_id,
        profesional: merged.profesional ?? null,
        dia_semana: merged.dia_semana,
        hora_inicio: merged.hora_inicio,
        hora_fin: merged.hora_fin,
        cupo: merged.cupo,
        activo: merged.activo ?? horario.activo,
      },
      { transaction },
    );

    return horario;
  });
}

export async function deshabilitarHorario(id: string): Promise<Horario> {
  return actualizarHorarioConValidacion(id, { activo: false });
}

export async function agendarCitaConReglas(params: {
  usuarioId: string;
  servicioId: string;
  horarioId: string;
  fecha: string;
}): Promise<Cita> {
  return sequelize.transaction(async (transaction) => {
    await bloquearClave(`dh-cita-usuario-${params.usuarioId}`, transaction);

    const horario = await Horario.findByPk(params.horarioId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!horario || !horario.activo || horario.servicio_id !== params.servicioId) {
      throw new HorarioNoDisponibleError(
        "El horario no está disponible para este servicio.",
      );
    }

    const diaSeleccionado = new Date(`${params.fecha}T12:00:00`).getDay();
    if (diaSeleccionado !== horario.dia_semana) {
      throw new HorarioNoDisponibleError(
        "La fecha no coincide con el día de atención del horario.",
      );
    }

    const fechaHora = horaParaFecha(params.fecha, String(horario.hora_inicio));
    if (fechaHora.getTime() <= Date.now()) {
      throw new HorarioNoDisponibleError("Solo se pueden agendar citas futuras.");
    }

    const citaActiva = await Cita.findOne({
      where: { usuario_id: params.usuarioId, estado: "AGENDADA" },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (citaActiva) {
      throw new CitaActivaError(
        "Solo puedes tener una cita activa a la vez (RN-004).",
      );
    }

    const { inicio, fin } = inicioYFinDelDia(params.fecha);
    const ocupadas = await Cita.count({
      where: {
        horario_id: params.horarioId,
        estado: "AGENDADA",
        fecha_hora: { [Op.between]: [inicio, fin] },
      },
      transaction,
    });

    if (ocupadas >= horario.cupo) {
      throw new CupoAgotadoError(
        "Ese horario ya está ocupado. Elige otro (RN-003).",
      );
    }

    return Cita.create(
      {
        usuario_id: params.usuarioId,
        servicio_id: params.servicioId,
        horario_id: params.horarioId,
        fecha_hora: fechaHora,
        estado: "AGENDADA",
      },
      { transaction },
    );
  });
}

export async function cancelarCitaYLiberarHorario(params: {
  citaId: string;
  usuarioId: string;
  esAdministrador: boolean;
  motivo?: string | null;
}): Promise<Cita> {
  return sequelize.transaction(async (transaction) => {
    const cita = await Cita.findByPk(params.citaId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!cita) {
      throw new RecursoNoEncontradoError("La cita no existe.");
    }

    if (!params.esAdministrador && cita.usuario_id !== params.usuarioId) {
      throw new OperacionNoPermitidaError("No puedes cancelar esta cita.");
    }

    if (cita.estado !== "AGENDADA") {
      throw new OperacionNoPermitidaError("Solo se pueden cancelar citas agendadas.");
    }

    cita.estado = "CANCELADA";
    cita.motivo_cancelacion = params.motivo ?? null;
    cita.fecha_actualizacion = new Date();
    await cita.save({ transaction });
    return cita;
  });
}

export async function registrarAsistenciaCita(params: {
  citaId: string;
  estado: "ASISTIO" | "NO_ASISTIO";
}): Promise<Cita> {
  return sequelize.transaction(async (transaction) => {
    const cita = await Cita.findByPk(params.citaId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!cita) {
      throw new RecursoNoEncontradoError("La cita no existe.");
    }

    if (cita.estado !== "AGENDADA") {
      throw new OperacionNoPermitidaError(
        "Solo se puede registrar asistencia de una cita agendada (RN-009).",
      );
    }

    cita.estado = params.estado;
    cita.fecha_actualizacion = new Date();
    await cita.save({ transaction });
    return cita;
  });
}

export async function listarHorariosDisponibles(params: {
  fecha: string;
  servicioId?: string | undefined;
}) {
  const dia = new Date(`${params.fecha}T12:00:00`).getDay();
  const { inicio, fin } = inicioYFinDelDia(params.fecha);

  const horarios = await Horario.findAll({
    where: {
      activo: true,
      dia_semana: dia,
      ...(params.servicioId ? { servicio_id: params.servicioId } : {}),
    },
    include: [{ model: Servicio, as: "servicio" }],
    order: [["hora_inicio", "ASC"]],
  });

  const resultado = [];
  for (const horario of horarios) {
    const ocupadas = await Cita.count({
      where: {
        horario_id: horario.id,
        estado: "AGENDADA",
        fecha_hora: { [Op.between]: [inicio, fin] },
      },
    });
    const cupoDisponible = horario.cupo - ocupadas;
    if (cupoDisponible > 0) {
      resultado.push({
        ...horario.toJSON(),
        cupo_disponible: cupoDisponible,
        ocupado: false,
      });
    }
  }

  return resultado;
}
