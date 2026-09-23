import { Alerta } from "./Alerta.js";
import { Asistencia } from "./Asistencia.js";
import { Deporte } from "./Deporte.js";
import { EventoDeporte } from "./EventoDeporte.js";
import { HorarioDeporte } from "./HorarioDeporte.js";
import { InscripcionDeporte } from "./InscripcionDeporte.js";
import { UsuarioPisu } from "./UsuarioPisu.js";

UsuarioPisu.hasMany(HorarioDeporte, {
  foreignKey: "docente_id",
  as: "horarios_dictados",
});
HorarioDeporte.belongsTo(UsuarioPisu, {
  foreignKey: "docente_id",
  as: "docente",
});

Deporte.hasMany(HorarioDeporte, { foreignKey: "deporte_id", as: "horarios" });
HorarioDeporte.belongsTo(Deporte, { foreignKey: "deporte_id", as: "deporte" });

UsuarioPisu.hasMany(InscripcionDeporte, {
  foreignKey: "estudiante_id",
  as: "inscripciones",
});
InscripcionDeporte.belongsTo(UsuarioPisu, {
  foreignKey: "estudiante_id",
  as: "estudiante",
});

Deporte.hasMany(InscripcionDeporte, {
  foreignKey: "deporte_id",
  as: "inscripciones",
});
InscripcionDeporte.belongsTo(Deporte, {
  foreignKey: "deporte_id",
  as: "deporte",
});

HorarioDeporte.hasMany(Asistencia, {
  foreignKey: "horario_id",
  as: "asistencias",
});
Asistencia.belongsTo(HorarioDeporte, {
  foreignKey: "horario_id",
  as: "horario",
});

UsuarioPisu.hasMany(Asistencia, {
  foreignKey: "estudiante_id",
  as: "asistencias_estudiante",
});
Asistencia.belongsTo(UsuarioPisu, {
  foreignKey: "estudiante_id",
  as: "estudiante",
});

UsuarioPisu.hasMany(Asistencia, {
  foreignKey: "docente_id",
  as: "asistencias_tomadas",
});
Asistencia.belongsTo(UsuarioPisu, {
  foreignKey: "docente_id",
  as: "docente",
});

export {
  Alerta,
  Asistencia,
  Deporte,
  EventoDeporte,
  HorarioDeporte,
  InscripcionDeporte,
  UsuarioPisu,
};
