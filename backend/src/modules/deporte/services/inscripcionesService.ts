import { Op, UniqueConstraintError, type Transaction } from "sequelize";
import { sequelize } from "../../../config/database.js";
import type { UsuarioPisuSesion } from "../middlewares/tipos.js";
import { Deporte } from "../models/Deporte.js";
import { EventoDeporte } from "../models/EventoDeporte.js";
import { HorarioDeporte } from "../models/HorarioDeporte.js";
import { InscripcionDeporte } from "../models/InscripcionDeporte.js";
import { InscripcionEvento } from "../models/InscripcionEvento.js";
import { hayTraslape } from "../utils/horarios.js";

export class RecursoNoEncontradoError extends Error {}
export class DatosInvalidosError extends Error {}
export class CategoriaNoPermitidaError extends Error {}
export class CupoAgotadoError extends Error {}
export class CruceHorarioError extends Error {}
export class YaInscritoError extends Error {}
export class OperacionNoPermitidaError extends Error {}
export class PlazoVencidoError extends Error {}

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
  const [horariosPrevios, deportesPrevios] = await Promise.all([
    idsOtras.length === 0
      ? Promise.resolve([])
      : HorarioDeporte.findAll({
          where: { deporte_id: { [Op.in]: idsOtras }, estado: true },
          transaction: params.transaction,
        }),
    idsOtras.length === 0
      ? Promise.resolve([])
      : Deporte.findAll({
          where: { id: { [Op.in]: idsOtras } },
          transaction: params.transaction,
        }),
  ]);

  const nombreDeporte = new Map(
    deportesPrevios.map((deporte) => [deporte.id, deporte.nombre]),
  );

  const eventosInscritos = await InscripcionEvento.findAll({
    where: {
      estudiante_id: params.estudianteId,
      estado: "Activa",
    },
    transaction: params.transaction,
  });

  const eventosIdsInscritos = eventosInscritos.map((item) => item.evento_id);
  const eventos =
    eventosIdsInscritos.length === 0
      ? []
      : await EventoDeporte.findAll({
          where: { id: { [Op.in]: eventosIdsInscritos }, estado: true },
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
          `Se cruza con ${nombreDeporte.get(previo.deporte_id) ?? "otro deporte"} (${previo.dia_semana} ${previo.hora_inicio}-${previo.hora_fin})`,
        );
      }
    }

    for (const evento of eventos) {
      const bloqueEvento = horaDesdeFecha(new Date(evento.fecha));
      if (
        nuevo.dia_semana === bloqueEvento.dia &&
        hayTraslape(
          String(nuevo.hora_inicio),
          String(nuevo.hora_fin),
          bloqueEvento.inicio,
          bloqueEvento.fin,
        )
      ) {
        throw new CruceHorarioError(
          `Se cruza con ${evento.nombre} (${bloqueEvento.dia} ${bloqueEvento.inicio}-${bloqueEvento.fin})`,
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

  const categoria = params.perfil.categoria;
  if (!categoria) {
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
    if (!categorias.includes(categoria)) {
      throw new CategoriaNoPermitidaError(
        `Este deporte no está disponible para tu categoría (${categoria})`,
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
      throw new YaInscritoError("Ya estás inscrito en este deporte");
    }

    const ocupadas = await InscripcionDeporte.count({
      where: { deporte_id: deporte.id, estado: "Activa" },
      transaction,
    });

    if (ocupadas >= deporte.cupo_maximo) {
      throw new CupoAgotadoError("No hay cupos disponibles");
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
        throw new YaInscritoError("Ya estás inscrito en este deporte");
      }
      throw error;
    }
  });
}

export async function cancelarInscripcionDeporte(params: {
  perfil: UsuarioPisuSesion;
  inscripcionId: string;
}): Promise<void> {
  await sequelize.transaction(async (transaction) => {
    const inscripcion = await InscripcionDeporte.findByPk(params.inscripcionId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!inscripcion || inscripcion.estudiante_id !== params.perfil.id) {
      throw new RecursoNoEncontradoError("La inscripción no existe.");
    }
    if (inscripcion.estado !== "Activa") {
      throw new DatosInvalidosError("La inscripción ya está cancelada.");
    }

    const inicioStr = process.env["SEMESTRE_INICIO"];
    const finStr = process.env["SEMESTRE_FIN"];
    if (inicioStr && finStr) {
      const inicio = new Date(inicioStr);
      const fin = new Date(finStr);
      if (!Number.isNaN(inicio.getTime()) && !Number.isNaN(fin.getTime())) {
        const puntoMedio = new Date(
          inicio.getTime() + (fin.getTime() - inicio.getTime()) / 2,
        );
        if (new Date() > puntoMedio) {
          throw new PlazoVencidoError("El plazo para cancelar ya venció");
        }
      }
    }

    await inscripcion.update({ estado: "Cancelada" }, { transaction });
  });
}
