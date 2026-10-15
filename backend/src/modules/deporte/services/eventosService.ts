/**
 * Servicio de eventos para estudiantes (catálogo e inscripción) — Deporte PISU.
 *
 * ¿Para qué sirve?
 * Lista los eventos publicados y gestiona la inscripción de estudiantes,
 * contemplando cupo, plazo, categorías y cruce de horario con otros deportes o
 * eventos del propio estudiante.
 *
 * ¿Cómo se relaciona con los demás?
 * - Los eventos pueden venir del administrador (compatibilidad) o de un docente
 *   (`eventosDocenteService`). Aquí se tratan por igual usando `estado_evento`.
 * - `cancelarInscripcionAEvento` libera el cupo de forma atómica.
 */

import {
  Op,
  UniqueConstraintError,
  type InferAttributes,
  type Transaction,
} from "sequelize";
import { sequelize } from "../../../config/database.js";
import type { CategoriaPisu } from "../constantes.js";
import type { UsuarioPisuSesion } from "../middlewares/tipos.js";
import { Deporte } from "../models/Deporte.js";
import { EventoDeporte } from "../models/EventoDeporte.js";
import { HorarioDeporte } from "../models/HorarioDeporte.js";
import { InscripcionDeporte } from "../models/InscripcionDeporte.js";
import { InscripcionEvento } from "../models/InscripcionEvento.js";
import { UsuarioPisu } from "../models/UsuarioPisu.js";
import { hayTraslape } from "../utils/horarios.js";

export class EventoNoEncontradoError extends Error {}
export class EventoCerradoError extends Error {}
export class CupoEventoAgotadoError extends Error {}
export class YaInscritoEventoError extends Error {}
export class NoInscritoEventoError extends Error {}
export class OperacionEventoNoPermitidaError extends Error {}
export class PlazoEventoVencidoError extends Error {}
export class CategoriaEventoNoPermitidaError extends Error {}
export class CruceHorarioEventoError extends Error {}

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

/** Fin del evento como Date, usando `fecha` + `hora_fin` (o fin del día). */
function finDelEvento(evento: EventoDeporte): Date {
  const base = new Date(evento.fecha);
  if (evento.hora_fin) {
    const [h, m] = evento.hora_fin.split(":").map(Number);
    base.setHours(h ?? 0, m ?? 0, 0, 0);
  } else {
    base.setHours(23, 59, 59, 0);
  }
  return base;
}

export type EventoConCupo = InferAttributes<EventoDeporte> & {
  inscritos: number;
  cupo_disponible: number;
  inscrito: boolean;
  inscripcion_id: string | null;
  abierto: boolean;
  inscripcion_abierta: boolean;
  deporte: { id: string; nombre: string } | null;
  creador: { id: string; nombre: string } | null;
};

const INCLUDE_EVENTO = [
  { model: Deporte, as: "deporte", attributes: ["id", "nombre"] },
  { model: UsuarioPisu, as: "creador", attributes: ["id", "nombre"] },
];

export async function listarEventosActivos(
  perfil?: UsuarioPisuSesion,
): Promise<EventoConCupo[]> {
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  const eventos = await EventoDeporte.findAll({
    where: {
      estado: true,
      estado_evento: "publicado",
      fecha: { [Op.gte]: inicioHoy },
    },
    include: INCLUDE_EVENTO,
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
    const objetos = evento.toJSON() as EventoConCupo;
    const cupoDisponible = Math.max(0, evento.cupo_maximo - inscritos);
    const plazoVencido = Boolean(
      evento.fecha_limite_inscripcion &&
        new Date(evento.fecha_limite_inscripcion).getTime() < ahora,
    );
    const noComenzo = finDelEvento(evento).getTime() > ahora;
    const cumpleCategoria =
      !evento.categorias_permitidas ||
      evento.categorias_permitidas.length === 0 ||
      Boolean(
        perfil?.categoria &&
          (evento.categorias_permitidas as CategoriaPisu[]).includes(
            perfil.categoria,
          ),
      );

    return {
      ...objetos,
      inscritos,
      cupo_disponible: cupoDisponible,
      inscrito: inscritoEn.has(evento.id),
      inscripcion_id: inscritoEn.get(evento.id) ?? null,
      abierto: noComenzo,
      inscripcion_abierta:
        noComenzo && !plazoVencido && cupoDisponible > 0 && cumpleCategoria,
      deporte: objetos.deporte ?? null,
      creador: objetos.creador ?? null,
    };
  });
}

export async function listarEventosConConteo(): Promise<
  Array<InferAttributes<EventoDeporte> & {
    inscritos: number;
    deporte: { id: string; nombre: string } | null;
    creador: { id: string; nombre: string } | null;
  }>
> {
  const eventos = await EventoDeporte.findAll({
    include: INCLUDE_EVENTO,
    order: [["fecha", "DESC"]],
  });
  const conteo = await contarInscritosActivos(eventos.map((item) => item.id));
  return eventos.map((evento) => {
    const objetos = evento.toJSON() as InferAttributes<EventoDeporte> & {
      deporte: { id: string; nombre: string } | null;
      creador: { id: string; nombre: string } | null;
    };
    return {
      ...objetos,
      inscritos: conteo.get(evento.id) ?? 0,
      deporte: objetos.deporte ?? null,
      creador: objetos.creador ?? null,
    };
  });
}

/**
 * Comprueba que el evento no choque con la agenda del estudiante:
 * - clases de otros deportes en los que ya está inscrito, y
 * - otros eventos ya inscritos.
 * @throws CruceHorarioEventoError si hay solape.
 */
async function asegurarSinCruce(
  perfil: UsuarioPisuSesion,
  evento: EventoDeporte,
  transaction: Transaction,
): Promise<void> {
  if (!evento.hora_inicio || !evento.hora_fin) return;

  const fechaDia = new Date(evento.fecha);
  const dia = fechaDia.getDay();

  const [inscripcionesDeporte, inscripcionesEvento] = await Promise.all([
    InscripcionDeporte.findAll({
      where: { estudiante_id: perfil.id, estado: "Activa" },
      attributes: ["deporte_id"],
      transaction,
    }),
    InscripcionEvento.findAll({
      where: { estudiante_id: perfil.id, estado: "Activa" },
      attributes: ["evento_id"],
      transaction,
    }),
  ]);

  const deporteIds = inscripcionesDeporte.map((fila) => fila.deporte_id);
  if (deporteIds.length > 0) {
    const horarios = await HorarioDeporte.findAll({
      where: { deporte_id: { [Op.in]: deporteIds }, dia_semana: dia, estado: true },
      include: [{ model: Deporte, as: "deporte", attributes: ["nombre"] }],
      transaction,
    });
    for (const horario of horarios) {
      const inicio = String(horario.hora_inicio).slice(0, 5);
      const fin = String(horario.hora_fin).slice(0, 5);
      if (hayTraslape(evento.hora_inicio, evento.hora_fin, inicio, fin)) {
        const deporte = (horario as { deporte?: { nombre?: string } }).deporte;
        throw new CruceHorarioEventoError(
          `No puedes inscribirte: choca con tu clase de '${deporte?.nombre ?? "otro deporte"}' de ${inicio} a ${fin}.`,
        );
      }
    }
  }

  const eventoIds = inscripcionesEvento
    .map((fila) => fila.evento_id)
    .filter((id) => id !== evento.id);
  if (eventoIds.length > 0) {
    const otros = await EventoDeporte.findAll({
      where: { id: { [Op.in]: eventoIds }, estado_evento: "publicado" },
      transaction,
    });
    for (const otro of otros) {
      if (!otro.hora_inicio || !otro.hora_fin) continue;
      if (new Date(otro.fecha).toDateString() !== fechaDia.toDateString()) continue;
      if (
        hayTraslape(evento.hora_inicio, evento.hora_fin, otro.hora_inicio, otro.hora_fin)
      ) {
        throw new CruceHorarioEventoError(
          `No puedes inscribirte: choca con el evento '${otro.nombre}' de ${otro.hora_inicio} a ${otro.hora_fin}.`,
        );
      }
    }
  }
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
    if (evento.estado_evento !== "publicado") {
      throw new EventoCerradoError("El evento fue cancelado; no admite inscripciones.");
    }

    const ahora = Date.now();
    if (finDelEvento(evento).getTime() <= ahora) {
      throw new EventoCerradoError("El evento ya ocurrió; no admite inscripciones.");
    }
    if (
      evento.fecha_limite_inscripcion &&
      new Date(evento.fecha_limite_inscripcion).getTime() < ahora
    ) {
      throw new PlazoEventoVencidoError(
        "El plazo de inscripción de este evento ya venció.",
      );
    }
    if (evento.categorias_permitidas && evento.categorias_permitidas.length > 0) {
      // La categoría es obligatoria para eventos que limitan por categoría; si
      // el estudiante aún no la completó, se le indica en lugar de permitirlo.
      if (!params.perfil.categoria) {
        throw new CategoriaEventoNoPermitidaError(
          "Completa tu categoría académica en tu perfil para inscribirte en este evento.",
        );
      }
      if (
        !(evento.categorias_permitidas as CategoriaPisu[]).includes(
          params.perfil.categoria,
        )
      ) {
        throw new CategoriaEventoNoPermitidaError(
          `Tu categoría (${params.perfil.categoria}) no está habilitada para este evento.`,
        );
      }
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

    await asegurarSinCruce(params.perfil, evento, transaction);

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

/** Eventos en los que el estudiante está (o estuvo) inscrito, incluidos los cancelados. */
export async function listarMisEventosEstudiante(
  perfil: UsuarioPisuSesion,
): Promise<EventoConCupo[]> {
  const inscripciones = await InscripcionEvento.findAll({
    where: { estudiante_id: perfil.id },
    attributes: ["id", "evento_id", "estado"],
  });
  const ids = [...new Set(inscripciones.map((item) => item.evento_id))];
  if (ids.length === 0) {
    return [];
  }
  const activaPorEvento = new Map<string, string>();
  for (const inscripcion of inscripciones) {
    if (inscripcion.estado === "Activa") {
      activaPorEvento.set(inscripcion.evento_id, inscripcion.id);
    }
  }
  const [eventos, conteo] = await Promise.all([
    EventoDeporte.findAll({
      where: { id: { [Op.in]: ids } },
      include: INCLUDE_EVENTO,
      order: [["fecha", "DESC"]],
    }),
    contarInscritosActivos(ids),
  ]);
  return eventos.map((evento) => {
    const objetos = evento.toJSON() as EventoConCupo;
    const inscritos = conteo.get(evento.id) ?? 0;
    return {
      ...objetos,
      inscritos,
      cupo_disponible: Math.max(0, evento.cupo_maximo - inscritos),
      inscrito: activaPorEvento.has(evento.id),
      inscripcion_id: activaPorEvento.get(evento.id) ?? null,
      abierto: true,
      inscripcion_abierta: false,
      deporte: objetos.deporte ?? null,
      creador: objetos.creador ?? null,
    };
  });
}

export async function listarInscritosEvento(eventoId: string) {
  const evento = await EventoDeporte.findByPk(eventoId, { include: INCLUDE_EVENTO });
  if (!evento) {
    throw new EventoNoEncontradoError("El evento no existe.");
  }

  const inscripciones = await InscripcionEvento.findAll({
    where: { evento_id: eventoId, estado: "Activa" },
    include: [
      {
        model: UsuarioPisu,
        as: "estudiante",
        attributes: ["id", "nombre", "correo", "categoria", "documento"],
      },
    ],
    order: [["fecha_inscripcion", "ASC"]],
  });

  return { evento, inscripciones };
}
