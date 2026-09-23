import { Op } from "sequelize";
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
    order: [
      ["dia_semana", "ASC"],
      ["hora_inicio", "ASC"],
    ],
  });
}
