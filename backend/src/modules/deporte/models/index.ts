import { Alerta } from "./Alerta.js";
import { Asistencia } from "./Asistencia.js";
import { AsistenciaDetalle } from "./AsistenciaDetalle.js";
import { Comunicado } from "./Comunicado.js";
import { Deporte } from "./Deporte.js";
import { DeporteDocente } from "./DeporteDocente.js";
import { EventoDeporte } from "./EventoDeporte.js";
import { HorarioDeporte } from "./HorarioDeporte.js";
import { InscripcionDeporte } from "./InscripcionDeporte.js";
import { InscripcionEvento } from "./InscripcionEvento.js";
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

// Asignación directa docente ↔ deporte (hecha por el administrador).
UsuarioPisu.hasMany(DeporteDocente, {
  foreignKey: "docente_id",
  as: "deportes_asignados",
});
DeporteDocente.belongsTo(UsuarioPisu, {
  foreignKey: "docente_id",
  as: "docente",
});
Deporte.hasMany(DeporteDocente, {
  foreignKey: "deporte_id",
  as: "docentes_asignados",
});
DeporteDocente.belongsTo(Deporte, {
  foreignKey: "deporte_id",
  as: "deporte",
});

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
  as: "sesiones_asistencia",
});
Asistencia.belongsTo(HorarioDeporte, {
  foreignKey: "horario_id",
  as: "horario",
});

UsuarioPisu.hasMany(Asistencia, {
  foreignKey: "docente_id",
  as: "asistencias_tomadas",
});
Asistencia.belongsTo(UsuarioPisu, {
  foreignKey: "docente_id",
  as: "docente",
});

Asistencia.hasMany(AsistenciaDetalle, {
  foreignKey: "asistencia_id",
  as: "detalles",
});
AsistenciaDetalle.belongsTo(Asistencia, {
  foreignKey: "asistencia_id",
  as: "asistencia",
});

UsuarioPisu.hasMany(AsistenciaDetalle, {
  foreignKey: "estudiante_id",
  as: "asistencias_estudiante_detalle",
});
AsistenciaDetalle.belongsTo(UsuarioPisu, {
  foreignKey: "estudiante_id",
  as: "estudiante",
});

EventoDeporte.hasMany(InscripcionEvento, {
  foreignKey: "evento_id",
  as: "inscripciones",
});
InscripcionEvento.belongsTo(EventoDeporte, {
  foreignKey: "evento_id",
  as: "evento",
});

UsuarioPisu.hasMany(InscripcionEvento, {
  foreignKey: "estudiante_id",
  as: "inscripciones_eventos",
});
InscripcionEvento.belongsTo(UsuarioPisu, {
  foreignKey: "estudiante_id",
  as: "estudiante",
});

// Evento ↔ Deporte (un evento del docente pertenece a uno de sus deportes).
Deporte.hasMany(EventoDeporte, { foreignKey: "deporte_id", as: "eventos" });
EventoDeporte.belongsTo(Deporte, { foreignKey: "deporte_id", as: "deporte" });

// Evento ↔ creador (docente o administrador que lo registró).
UsuarioPisu.hasMany(EventoDeporte, {
  foreignKey: "creado_por_id",
  as: "eventos_creados",
});
EventoDeporte.belongsTo(UsuarioPisu, {
  foreignKey: "creado_por_id",
  as: "creador",
});

UsuarioPisu.hasMany(Alerta, {
  foreignKey: "estudiante_id",
  as: "alertas_personales",
});
Alerta.belongsTo(UsuarioPisu, {
  foreignKey: "estudiante_id",
  as: "estudiante",
});

export {
  Alerta,
  Asistencia,
  AsistenciaDetalle,
  Comunicado,
  Deporte,
  DeporteDocente,
  EventoDeporte,
  HorarioDeporte,
  InscripcionDeporte,
  InscripcionEvento,
  UsuarioPisu,
};