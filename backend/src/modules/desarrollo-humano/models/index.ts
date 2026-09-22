import { Servicio } from "./Servicio.js";
import { Horario } from "./Horario.js";
import { Cita } from "./Cita.js";
import { Evento } from "./Evento.js";
import { Inscripcion } from "./Inscripcion.js";

Servicio.hasMany(Horario, { foreignKey: "servicio_id", as: "horarios" });
Horario.belongsTo(Servicio, { foreignKey: "servicio_id", as: "servicio" });

Servicio.hasMany(Cita, { foreignKey: "servicio_id", as: "citas" });
Cita.belongsTo(Servicio, { foreignKey: "servicio_id", as: "servicio" });
Horario.hasMany(Cita, { foreignKey: "horario_id", as: "citas" });
Cita.belongsTo(Horario, { foreignKey: "horario_id", as: "horario" });

Evento.hasMany(Inscripcion, { foreignKey: "evento_id", as: "inscripciones" });
Inscripcion.belongsTo(Evento, { foreignKey: "evento_id", as: "evento" });

export { Cita, Evento, Horario, Inscripcion, Servicio };
