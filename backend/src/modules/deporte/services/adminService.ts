import { Alerta } from "../models/Alerta.js";
import { Asistencia } from "../models/Asistencia.js";
import { Deporte } from "../models/Deporte.js";
import { InscripcionDeporte } from "../models/InscripcionDeporte.js";
import { UsuarioPisu } from "../models/UsuarioPisu.js";

export async function listarUsuariosPisu() {
  return UsuarioPisu.findAll({
    attributes: [
      "id",
      "nombre",
      "correo",
      "rol",
      "categoria",
      "estado",
      "fecha_creacion",
    ],
    order: [["nombre", "ASC"]],
  });
}

export async function resumenAdministracion() {
  const [usuarios, deportes, inscripcionesActivas, asistencias, alertas] =
    await Promise.all([
      UsuarioPisu.count(),
      Deporte.count({ where: { estado: true } }),
      InscripcionDeporte.count({ where: { estado: "Activa" } }),
      Asistencia.count(),
      Alerta.count(),
    ]);

  return {
    usuarios,
    deportes_activos: deportes,
    inscripciones_activas: inscripcionesActivas,
    asistencias,
    alertas,
  };
}
