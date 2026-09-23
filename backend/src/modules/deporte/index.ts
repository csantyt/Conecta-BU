/** Schema PostgreSQL: deporte — Módulo Deportes PISU */
export { NOMBRE_MODULO } from "./nombre.js";
export {
  AUDIENCIAS_ALERTA_PISU,
  CATEGORIAS_PISU,
  ESTADOS_INSCRIPCION_PISU,
  ROLES_PISU,
} from "./constantes.js";
export {
  Alerta,
  Asistencia,
  Deporte,
  EventoDeporte,
  HorarioDeporte,
  InscripcionDeporte,
  UsuarioPisu,
} from "./models/index.js";
