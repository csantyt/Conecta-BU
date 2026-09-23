import { Op } from "sequelize";
import { Alerta } from "../models/Alerta.js";
import { Deporte } from "../models/Deporte.js";
import { EventoDeporte } from "../models/EventoDeporte.js";
import type { UsuarioPisuSesion } from "../middlewares/tipos.js";

export async function listarDeportesActivos() {
  return Deporte.findAll({
    where: { estado: true },
    order: [["nombre", "ASC"]],
  });
}

export async function listarEventosActivos() {
  return EventoDeporte.findAll({
    where: { estado: true },
    order: [["fecha", "ASC"]],
  });
}

export async function listarAlertasPara(perfil: UsuarioPisuSesion) {
  const audiencias =
    perfil.rol === "Administrador"
      ? ["Todos", "Docentes", "Estudiantes"]
      : perfil.rol === "Docente"
        ? ["Todos", "Docentes"]
        : ["Todos", "Estudiantes"];

  return Alerta.findAll({
    where: { audiencia: { [Op.in]: audiencias } },
    order: [["fecha_creacion", "DESC"]],
  });
}
