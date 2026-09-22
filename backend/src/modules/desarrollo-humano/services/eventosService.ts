import { QueryTypes, type Transaction } from "sequelize";
import { sequelize } from "../../../config/database.js";
import {
  OperacionNoPermitidaError,
  RecursoNoEncontradoError,
} from "./citasHorariosService.js";

export class CupoEventoAgotadoError extends Error {}
export class InscripcionDuplicadaError extends Error {}
export class InscripcionCerradaError extends Error {}
export class NoInscritoError extends Error {}

export type DatosEvento = {
  titulo: string;
  descripcion?: string | null;
  fecha_inicio: Date;
  fecha_fin?: Date | null;
  fecha_limite_inscripcion?: Date | null;
  cupo_total: number;
};

export type EventoFila = {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  fecha_limite_inscripcion: Date | null;
  cupo_total: number;
  activo: boolean;
  fecha_creacion: Date;
  cupo_disponible?: number;
  inscrito?: boolean;
};

export type InscripcionFila = {
  id: string;
  evento_id: string;
  usuario_id: string;
  estado: "INSCRITO" | "CANCELADO";
  asistencia: "ASISTIO" | "NO_ASISTIO" | null;
  fecha_inscripcion: Date;
};

async function ejecutar<T>(
  consulta: string,
  replacements: Record<string, unknown>,
  transaction?: Transaction,
): Promise<T[]> {
  const filas = await sequelize.query(consulta, {
    replacements,
    type: QueryTypes.SELECT,
    ...(transaction ? { transaction } : {}),
  });
  return filas as T[];
}

function validarFechas(datos: DatosEvento): void {
  if (datos.fecha_fin && datos.fecha_fin < datos.fecha_inicio) {
    throw new OperacionNoPermitidaError(
      "La fecha de fin no puede ser anterior al inicio del evento.",
    );
  }
  if (
    datos.fecha_limite_inscripcion &&
    datos.fecha_limite_inscripcion > datos.fecha_inicio
  ) {
    throw new OperacionNoPermitidaError(
      "La fecha límite de inscripción no puede ser posterior al inicio del evento.",
    );
  }
}

export async function listarEventosSql(params: {
  usuarioId: string;
  esAdministrador: boolean;
}): Promise<EventoFila[]> {
  return ejecutar<EventoFila>(
    `
      SELECT
        e.id,
        e.titulo,
        e.descripcion,
        e.fecha_inicio,
        e.fecha_fin,
        e.fecha_limite_inscripcion,
        e.cupo_total,
        e.activo,
        e.fecha_creacion,
        GREATEST(
          e.cupo_total - COUNT(i.id) FILTER (WHERE i.estado = 'INSCRITO'),
          0
        )::int AS cupo_disponible,
        COALESCE(
          BOOL_OR(i.usuario_id = :usuarioId AND i.estado = 'INSCRITO'),
          FALSE
        ) AS inscrito
      FROM desarrollo_humano.eventos e
      LEFT JOIN desarrollo_humano.inscripciones i
        ON i.evento_id = e.id
      WHERE (:esAdministrador OR e.activo = TRUE)
      GROUP BY e.id
      ORDER BY e.fecha_inicio ASC
    `,
    {
      usuarioId: params.usuarioId,
      esAdministrador: params.esAdministrador,
    },
  );
}

export async function crearEventoSql(datos: DatosEvento): Promise<EventoFila> {
  validarFechas(datos);
  const filas = await ejecutar<EventoFila>(
    `
      INSERT INTO desarrollo_humano.eventos (
        id, titulo, descripcion, fecha_inicio, fecha_fin,
        fecha_limite_inscripcion, cupo_total, activo, fecha_creacion
      )
      VALUES (
        gen_random_uuid(), :titulo, :descripcion, :fecha_inicio, :fecha_fin,
        :fecha_limite_inscripcion, :cupo_total, TRUE, NOW()
      )
      RETURNING *
    `,
    {
      titulo: datos.titulo,
      descripcion: datos.descripcion ?? null,
      fecha_inicio: datos.fecha_inicio,
      fecha_fin: datos.fecha_fin ?? null,
      fecha_limite_inscripcion: datos.fecha_limite_inscripcion ?? null,
      cupo_total: datos.cupo_total,
    },
  );
  const evento = filas[0];
  if (!evento) {
    throw new Error("No se pudo crear el evento.");
  }
  return evento;
}

export async function actualizarEventoSql(
  id: string,
  datos: Partial<DatosEvento> & { activo?: boolean },
): Promise<EventoFila> {
  return sequelize.transaction(async (transaction) => {
    const actuales = await ejecutar<EventoFila>(
      `
        SELECT *
        FROM desarrollo_humano.eventos
        WHERE id = :id
        FOR UPDATE
      `,
      { id },
      transaction,
    );
    const actual = actuales[0];
    if (!actual) {
      throw new RecursoNoEncontradoError("El evento no existe.");
    }

    const merged: DatosEvento = {
      titulo: datos.titulo ?? actual.titulo,
      descripcion:
        datos.descripcion === undefined ? actual.descripcion : datos.descripcion,
      fecha_inicio: datos.fecha_inicio ?? new Date(actual.fecha_inicio),
      fecha_fin:
        datos.fecha_fin === undefined
          ? actual.fecha_fin
            ? new Date(actual.fecha_fin)
            : null
          : datos.fecha_fin,
      fecha_limite_inscripcion:
        datos.fecha_limite_inscripcion === undefined
          ? actual.fecha_limite_inscripcion
            ? new Date(actual.fecha_limite_inscripcion)
            : null
          : datos.fecha_limite_inscripcion,
      cupo_total: datos.cupo_total ?? actual.cupo_total,
    };
    validarFechas(merged);

    const ocupados = await ejecutar<{ total: number }>(
      `
        SELECT COUNT(*)::int AS total
        FROM desarrollo_humano.inscripciones
        WHERE evento_id = :id AND estado = 'INSCRITO'
      `,
      { id },
      transaction,
    );
    if ((ocupados[0]?.total ?? 0) > merged.cupo_total) {
      throw new OperacionNoPermitidaError(
        "El cupo no puede ser menor que las inscripciones activas.",
      );
    }

    const filas = await ejecutar<EventoFila>(
      `
        UPDATE desarrollo_humano.eventos
        SET
          titulo = :titulo,
          descripcion = :descripcion,
          fecha_inicio = :fecha_inicio,
          fecha_fin = :fecha_fin,
          fecha_limite_inscripcion = :fecha_limite_inscripcion,
          cupo_total = :cupo_total,
          activo = :activo
        WHERE id = :id
        RETURNING *
      `,
      {
        id,
        titulo: merged.titulo,
        descripcion: merged.descripcion ?? null,
        fecha_inicio: merged.fecha_inicio,
        fecha_fin: merged.fecha_fin ?? null,
        fecha_limite_inscripcion: merged.fecha_limite_inscripcion ?? null,
        cupo_total: merged.cupo_total,
        activo: datos.activo ?? actual.activo,
      },
      transaction,
    );
    const evento = filas[0];
    if (!evento) {
      throw new RecursoNoEncontradoError("El evento no existe.");
    }
    return evento;
  });
}

export async function eliminarEventoSql(id: string): Promise<void> {
  const filas = await ejecutar<{ id: string }>(
    `
      DELETE FROM desarrollo_humano.eventos
      WHERE id = :id
      RETURNING id
    `,
    { id },
  );
  if (!filas[0]) {
    throw new RecursoNoEncontradoError("El evento no existe.");
  }
}

export async function inscribirseEventoSql(params: {
  eventoId: string;
  usuarioId: string;
}): Promise<InscripcionFila> {
  return sequelize.transaction(async (transaction) => {
    const eventos = await ejecutar<EventoFila>(
      `
        SELECT *
        FROM desarrollo_humano.eventos
        WHERE id = :eventoId
        FOR UPDATE
      `,
      { eventoId: params.eventoId },
      transaction,
    );
    const evento = eventos[0];
    if (!evento || !evento.activo) {
      throw new RecursoNoEncontradoError("El evento no existe.");
    }

    const limite = evento.fecha_limite_inscripcion
      ? new Date(evento.fecha_limite_inscripcion)
      : new Date(evento.fecha_inicio);
    if (Date.now() > limite.getTime()) {
      throw new InscripcionCerradaError(
        "La fecha límite de inscripción ya venció.",
      );
    }

    const existentes = await ejecutar<InscripcionFila>(
      `
        SELECT *
        FROM desarrollo_humano.inscripciones
        WHERE evento_id = :eventoId AND usuario_id = :usuarioId
        FOR UPDATE
      `,
      { eventoId: params.eventoId, usuarioId: params.usuarioId },
      transaction,
    );
    const existente = existentes[0];
    if (existente?.estado === "INSCRITO") {
      throw new InscripcionDuplicadaError(
        "Ya estás inscrito en este evento (RN-006).",
      );
    }

    const ocupados = await ejecutar<{ total: number }>(
      `
        SELECT COUNT(*)::int AS total
        FROM desarrollo_humano.inscripciones
        WHERE evento_id = :eventoId AND estado = 'INSCRITO'
      `,
      { eventoId: params.eventoId },
      transaction,
    );
    if ((ocupados[0]?.total ?? 0) >= evento.cupo_total) {
      throw new CupoEventoAgotadoError(
        "No hay cupos disponibles para este evento (RN-007).",
      );
    }

    if (existente) {
      const reactivadas = await ejecutar<InscripcionFila>(
        `
          UPDATE desarrollo_humano.inscripciones
          SET estado = 'INSCRITO', asistencia = NULL, fecha_inscripcion = NOW()
          WHERE id = :id
          RETURNING *
        `,
        { id: existente.id },
        transaction,
      );
      const reactivada = reactivadas[0];
      if (!reactivada) {
        throw new RecursoNoEncontradoError("No se pudo reactivar la inscripción.");
      }
      return reactivada;
    }

    const creadas = await ejecutar<InscripcionFila>(
      `
        INSERT INTO desarrollo_humano.inscripciones (
          id, evento_id, usuario_id, estado, asistencia, fecha_inscripcion
        )
        VALUES (
          gen_random_uuid(), :eventoId, :usuarioId, 'INSCRITO', NULL, NOW()
        )
        RETURNING *
      `,
      { eventoId: params.eventoId, usuarioId: params.usuarioId },
      transaction,
    );
    const creada = creadas[0];
    if (!creada) {
      throw new Error("No se pudo registrar la inscripción.");
    }
    return creada;
  });
}

export async function cancelarInscripcionSql(params: {
  eventoId: string;
  usuarioId: string;
}): Promise<InscripcionFila> {
  const filas = await ejecutar<InscripcionFila>(
    `
      UPDATE desarrollo_humano.inscripciones
      SET estado = 'CANCELADO', asistencia = NULL
      WHERE evento_id = :eventoId
        AND usuario_id = :usuarioId
        AND estado = 'INSCRITO'
      RETURNING *
    `,
    { eventoId: params.eventoId, usuarioId: params.usuarioId },
  );
  const inscripcion = filas[0];
  if (!inscripcion) {
    throw new RecursoNoEncontradoError("No tienes una inscripción activa.");
  }
  return inscripcion;
}

export async function listarInscripcionesSql(
  eventoId: string,
): Promise<InscripcionFila[]> {
  const eventos = await ejecutar<{ id: string }>(
    `SELECT id FROM desarrollo_humano.eventos WHERE id = :eventoId`,
    { eventoId },
  );
  if (!eventos[0]) {
    throw new RecursoNoEncontradoError("El evento no existe.");
  }

  return ejecutar<InscripcionFila>(
    `
      SELECT *
      FROM desarrollo_humano.inscripciones
      WHERE evento_id = :eventoId AND estado = 'INSCRITO'
      ORDER BY fecha_inscripcion ASC
    `,
    { eventoId },
  );
}

export async function registrarAsistenciaEventoSql(params: {
  eventoId: string;
  usuarioId: string;
  asistencia: "ASISTIO" | "NO_ASISTIO";
}): Promise<InscripcionFila> {
  return sequelize.transaction(async (transaction) => {
    const filas = await ejecutar<InscripcionFila>(
      `
        SELECT *
        FROM desarrollo_humano.inscripciones
        WHERE evento_id = :eventoId AND usuario_id = :usuarioId
        FOR UPDATE
      `,
      { eventoId: params.eventoId, usuarioId: params.usuarioId },
      transaction,
    );
    const inscripcion = filas[0];
    if (!inscripcion || inscripcion.estado !== "INSCRITO") {
      throw new NoInscritoError(
        "Solo se registra asistencia de estudiantes inscritos en el evento (RN-010).",
      );
    }

    const actualizadas = await ejecutar<InscripcionFila>(
      `
        UPDATE desarrollo_humano.inscripciones
        SET asistencia = :asistencia
        WHERE id = :id
        RETURNING *
      `,
      { id: inscripcion.id, asistencia: params.asistencia },
      transaction,
    );
    const actualizada = actualizadas[0];
    if (!actualizada) {
      throw new RecursoNoEncontradoError("La inscripción no existe.");
    }
    return actualizada;
  });
}
