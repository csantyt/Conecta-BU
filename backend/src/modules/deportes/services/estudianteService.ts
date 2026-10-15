import { Op } from "sequelize";
import { Asistencia } from "../models/Asistencia.js";
import { Deporte } from "../models/Deporte.js";
import { HorarioDeporte } from "../models/HorarioDeporte.js";
import { InscripcionDeporte } from "../models/InscripcionDeporte.js";
import type { UsuarioPisuSesion } from "../middlewares/tipos.js";

export async function listarInscripcionesEstudiante(perfil: UsuarioPisuSesion) {
  return InscripcionDeporte.findAll({
    where: { estudiante_id: perfil.id },
    include: [{ association: "deporte" }],
    order: [["fecha_inscripcion", "DESC"]],
  });
}

export async function listarHorariosDeInscripciones(perfil: UsuarioPisuSesion) {
  const inscripciones = await InscripcionDeporte.findAll({
    where: { estudiante_id: perfil.id, estado: "Activa" },
  });
  const deporteIds = inscripciones.map((item) => item.deporte_id);
  if (deporteIds.length === 0) {
    return [];
  }

  return HorarioDeporte.findAll({
    where: { deporte_id: { [Op.in]: deporteIds }, estado: true },
    include: [
      { model: Deporte, as: "deporte", attributes: ["id", "nombre"] },
      { association: "docente", attributes: ["id", "nombre"] },
    ],
    order: [
      ["dia_semana", "ASC"],
      ["hora_inicio", "ASC"],
    ],
  });
}

export type ResumenAsistenciaDeporte = {
  deporte_id: string;
  deporte: string;
  presentes: number;
  ausentes: number;
  porcentaje: number;
};

export async function listarAsistenciasEstudiante(perfil: UsuarioPisuSesion) {
  const asistencias = await Asistencia.findAll({
    where: { estudiante_id: perfil.id },
    include: [
      {
        model: HorarioDeporte,
        as: "horario",
        attributes: ["id", "deporte_id", "dia_semana", "hora_inicio", "hora_fin", "lugar"],
        include: [{ model: Deporte, as: "deporte", attributes: ["id", "nombre"] }],
      },
    ],
    order: [["fecha", "DESC"]],
  });

  const porDeporte = new Map<string, ResumenAsistenciaDeporte>();
  for (const item of asistencias) {
    const horario = item.get("horario") as
      | (HorarioDeporte & { deporte?: Deporte })
      | undefined;
    const deporteId = horario?.deporte_id ?? "sin-deporte";
    const fila = porDeporte.get(deporteId) ?? {
      deporte_id: deporteId,
      deporte: horario?.deporte?.nombre ?? "Deporte",
      presentes: 0,
      ausentes: 0,
      porcentaje: 0,
    };
    if (item.presente) {
      fila.presentes += 1;
    } else {
      fila.ausentes += 1;
    }
    porDeporte.set(deporteId, fila);
  }

  const resumen = [...porDeporte.values()].map((fila) => {
    const total = fila.presentes + fila.ausentes;
    return {
      ...fila,
      porcentaje: total === 0 ? 0 : Math.round((fila.presentes / total) * 100),
    };
  });

  return { asistencias, resumen };
}
