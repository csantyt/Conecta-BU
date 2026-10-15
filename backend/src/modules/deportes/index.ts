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
export { authMiddleware } from "./middlewares/authMiddleware.js";
export { rbacMiddleware } from "./middlewares/rbacMiddleware.js";
export {
  adminRoutes,
  deportesRoutes,
  docenteRoutes,
  estudianteRoutes,
} from "./routes/index.js";
