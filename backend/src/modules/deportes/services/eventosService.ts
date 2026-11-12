import {
  Op,
  UniqueConstraintError,
  type InferAttributes,
  type Transaction,
} from "sequelize";
import { sequelize } from "../../../config/database.js";
import type { UsuarioPisuSesion } from "../middlewares/tipos.js";
import { EventoDeporte } from "../models/EventoDeporte.js";
import { InscripcionEvento } from "../models/InscripcionEvento.js";
import { UsuarioPisu } from "../models/UsuarioPisu.js";

export class EventoNoEncontradoError extends Error {}
export class EventoCerradoError extends Error {}
export class CupoEventoAgotadoError extends Error {}
export class YaInscritoEventoError extends Error {}
export class NoInscritoEventoError extends Error {}
export class OperacionEventoNoPermitidaError extends Error {}

async function bloquearEvento(eventoId: string, transaction: Transaction): Promise<void> {
  await sequelize.query("SELECT pg_advisory_xact_lock(hashtext(:clave))", {
    replacements: { clave: `pisu-evento-${eventoId}` },
    transaction,
  });
}

async function contarInscritosActivos(
  eventoIds: string[],
  transaction?: Transaction,
): Promise<Map<string, number>> {
  const conteo = new Map<string, number>();
  if (eventoIds.length === 0) {
    return conteo;
  }
  const filas = await InscripcionEvento.findAll({
    where: { evento_id: { [Op.in]: eventoIds }, estado: "Activa" },
    attributes: ["evento_id"],
    ...(transaction ? { transaction } : {}),
  });
  for (const fila of filas) {
    conteo.set(fila.evento_id, (conteo.get(fila.evento_id) ?? 0) + 1);
  }
  return conteo;
}

export async function contarInscritosEvento(eventoId: string): Promise<number> {
  return InscripcionEvento.count({
    where: { evento_id: eventoId, estado: "Activa" },
  });
}

export type EventoConCupo = InferAttributes<EventoDeporte> & {
  inscritos: number;
  cupo_disponible: number;
  inscrito: boolean;
  inscripcion_id: string | null;
  abierto: boolean;
};

export async function listarEventosActivos(
  perfil?: UsuarioPisuSesion,
): Promise<EventoConCupo[]> {
  const eventos = await EventoDeporte.findAll({
    where: { estado: true },
    order: [["fecha", "ASC"]],
  });
  const ids = eventos.map((item) => item.id);

  const [conteo, mias] = await Promise.all([
    contarInscritosActivos(ids),
    perfil && ids.length > 0
      ? InscripcionEvento.findAll({
          where: {
            estudiante_id: perfil.id,
            estado: "Activa",
            evento_id: { [Op.in]: ids },
          },
          attributes: ["id", "evento_id"],
        })
      : Promise.resolve([]),
  ]);

  const inscritoEn = new Map(mias.map((item) => [item.evento_id, item.id]));
  const ahora = Date.now();

  return eventos.map((evento) => {
    const inscritos = conteo.get(evento.id) ?? 0;
    return {
      ...evento.toJSON(),
      inscritos,
      cupo_disponible: Math.max(0, evento.cupo_maximo - inscritos),
      inscrito: inscritoEn.has(evento.id),
      inscripcion_id: inscritoEn.get(evento.id) ?? null,
      abierto: new Date(evento.fecha).getTime() > ahora,
    };
  });
}

export async function listarEventosConConteo(): Promise<
  Array<InferAttributes<EventoDeporte> & { inscritos: number }>
> {
  const eventos = await EventoDeporte.findAll({ order: [["fecha", "DESC"]] });
  const conteo = await contarInscritosActivos(eventos.map((item) => item.id));
  return eventos.map((evento) => ({
    ...evento.toJSON(),
    inscritos: conteo.get(evento.id) ?? 0,
  }));
}

export async function inscribirseAEvento(params: {
  perfil: UsuarioPisuSesion;
  eventoId: string;
}): Promise<InscripcionEvento> {
  if (params.perfil.rol !== "Estudiante") {
    throw new OperacionEventoNoPermitidaError(
      "La inscripción a eventos deportivos solo está disponible para estudiantes.",
    );
  }

  return sequelize.transaction(async (transaction) => {
    await bloquearEvento(params.eventoId, transaction);

    const evento = await EventoDeporte.findByPk(params.eventoId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!evento || !evento.estado) {
      throw new EventoNoEncontradoError("El evento no existe o no está activo.");
    }
    if (new Date(evento.fecha).getTime() <= Date.now()) {
      throw new EventoCerradoError("El evento ya ocurrió; no admite inscripciones.");
    }

    const existente = await InscripcionEvento.findOne({
      where: {
        evento_id: evento.id,
        estudiante_id: params.perfil.id,
        estado: "Activa",
      },
      transaction,
    });
    if (existente) {
      throw new YaInscritoEventoError("Ya estás inscrito en este evento.");
    }

    const ocupados = await InscripcionEvento.count({
      where: { evento_id: evento.id, estado: "Activa" },
      transaction,
    });
    if (ocupados >= evento.cupo_maximo) {
      throw new CupoEventoAgotadoError("No hay cupos disponibles para este evento.");
    }

    try {
      return await InscripcionEvento.create(
        {
          evento_id: evento.id,
          estudiante_id: params.perfil.id,
          estado: "Activa",
        },
        { transaction },
      );
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new YaInscritoEventoError("Ya estás inscrito en este evento.");
      }
      throw error;
    }
  });
}

export async function cancelarInscripcionAEvento(params: {
  perfil: UsuarioPisuSesion;
  eventoId: string;
}): Promise<void> {
  const inscripcion = await InscripcionEvento.findOne({
    where: {
      evento_id: params.eventoId,
      estudiante_id: params.perfil.id,
      estado: "Activa",
    },
  });
  if (!inscripcion) {
    throw new NoInscritoEventoError("No tienes una inscripción activa en este evento.");
  }
  await inscripcion.update({ estado: "Cancelada" });
}

export async function listarInscritosEvento(eventoId: string) {
  const evento = await EventoDeporte.findByPk(eventoId);
  if (!evento) {
    throw new EventoNoEncontradoError("El evento no existe.");
  }

  const inscripciones = await InscripcionEvento.findAll({
    where: { evento_id: eventoId, estado: "Activa" },
    include: [
      {
        model: UsuarioPisu,
        as: "estudiante",
        attributes: ["id", "nombre", "correo", "categoria"],
      },
    ],
    order: [["fecha_inscripcion", "ASC"]],
  });

  return { evento, inscripciones };
}
