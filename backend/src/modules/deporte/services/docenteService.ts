import { Asistencia } from "../models/Asistencia.js";
import { HorarioDeporte } from "../models/HorarioDeporte.js";
import type { UsuarioPisuSesion } from "../middlewares/tipos.js";

export async function listarHorariosDocente(perfil: UsuarioPisuSesion) {
  return HorarioDeporte.findAll({
    where: { docente_id: perfil.id, estado: true },
    order: [
      ["dia_semana", "ASC"],
      ["hora_inicio", "ASC"],
    ],
  });
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
