import { UniqueConstraintError } from "sequelize";
import { sequelize } from "../../../config/database.js";
import type { UsuarioPisuSesion } from "../middlewares/tipos.js";
import {
  Asistencia,
  HorarioDeporte,
  InscripcionDeporte,
  UsuarioPisu,
} from "../models/index.js";

export class RecursoDocenteNoEncontradoError extends Error {}
export class ClaseNoAsignadaError extends Error {}
export class VentanaAsistenciaCerradaError extends Error {}
export class EstudianteNoInscritoError extends Error {}
export class DatosAsistenciaInvalidosError extends Error {}

const VENTANA_EDICION_MS = 24 * 60 * 60 * 1000;

export async function listarMisClases(perfil: UsuarioPisuSesion) {
  return HorarioDeporte.findAll({
    where: { docente_id: perfil.id },
    include: [{ association: "deporte" }],
    order: [
      ["dia_semana", "ASC"],
      ["hora_inicio", "ASC"],
    ],
  });
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
}): Promise<Asistencia[]> {
  if (params.registros.length === 0) {
    throw new DatosAsistenciaInvalidosError("Debes enviar al menos un estudiante.");
  }

  return sequelize.transaction(async (transaction) => {
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

    const guardadas: Asistencia[] = [];

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

      const existente = await Asistencia.findOne({
        where: {
          horario_id: horario.id,
          estudiante_id: registro.estudianteId,
          fecha: params.fecha,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (existente) {
        await existente.update({ presente: registro.presente }, { transaction });
        guardadas.push(existente);
        continue;
      }

      try {
        const creada = await Asistencia.create(
          {
            horario_id: horario.id,
            estudiante_id: registro.estudianteId,
            docente_id: params.perfil.id,
            fecha: params.fecha,
            presente: registro.presente,
          },
          { transaction },
        );
        guardadas.push(creada);
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          const otra = await Asistencia.findOne({
            where: {
              horario_id: horario.id,
              estudiante_id: registro.estudianteId,
              fecha: params.fecha,
            },
            transaction,
          });
          if (otra) {
            await otra.update({ presente: registro.presente }, { transaction });
            guardadas.push(otra);
            continue;
          }
        }
        throw error;
      }
    }

    return guardadas;
  });
}

export async function editarAsistencia(params: {
  perfil: UsuarioPisuSesion;
  asistenciaId: string;
  presente: boolean;
}): Promise<Asistencia> {
  const asistencia = await Asistencia.findByPk(params.asistenciaId);

  if (!asistencia) {
    throw new RecursoDocenteNoEncontradoError("La asistencia no existe.");
  }

  if (asistencia.docente_id !== params.perfil.id) {
    throw new ClaseNoAsignadaError(
      "No puedes editar una asistencia que no registraste (RN-004).",
    );
  }

  const creada = asistencia.fecha_registro
    ? new Date(asistencia.fecha_registro).getTime()
    : 0;
  if (Date.now() - creada > VENTANA_EDICION_MS) {
    throw new VentanaAsistenciaCerradaError(
      "Solo puedes editar la asistencia dentro de las 24 horas posteriores a su registro (RF-016).",
    );
  }

  await asistencia.update({ presente: params.presente });
  return asistencia;
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
  });
}
