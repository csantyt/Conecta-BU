import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import {
  deleteDeporteDocente,
  deleteEstudianteDocente,
  deleteHorarioDocente,
  getAsistenciasDocente,
  getEstudiantesDeClase,
  getEstudiantesDocente,
  getHorariosDocente,
  getMisClases,
  getMisClasesHoy,
  getPerfilDocente,
  patchDeporteDocente,
  patchEstudianteDocente,
  patchHorarioDocente,
  postAsistencia,
  postHorarioDocente,
  putAsistencia,
} from "../controllers/docenteController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  propiedadAsistenciaMiddleware,
  propiedadClaseBodyMiddleware,
  propiedadClaseMiddleware,
} from "../middlewares/propiedadRecursoMiddleware.js";
import { soloDocentePisu } from "../middlewares/rbacMiddleware.js";

export const docenteRoutes = Router();

docenteRoutes.use(authMiddleware, soloDocentePisu);
docenteRoutes.get("/perfil", asyncHandler(getPerfilDocente));
docenteRoutes.get("/mis-clases", asyncHandler(getMisClases));
docenteRoutes.get("/mis-clases/hoy", asyncHandler(getMisClasesHoy));
docenteRoutes.get("/horarios", asyncHandler(getHorariosDocente));
docenteRoutes.get(
  "/clases/:horarioId/estudiantes",
  propiedadClaseMiddleware(),
  asyncHandler(getEstudiantesDeClase),
);
docenteRoutes.get("/asistencias", asyncHandler(getAsistenciasDocente));

docenteRoutes.get("/estudiantes-gestion", asyncHandler(getEstudiantesDocente));
docenteRoutes.patch("/estudiantes-gestion/:id", asyncHandler(patchEstudianteDocente));
docenteRoutes.delete("/estudiantes-gestion/:id", asyncHandler(deleteEstudianteDocente));

docenteRoutes.patch("/deportes-gestion/:id", asyncHandler(patchDeporteDocente));
docenteRoutes.delete("/deportes-gestion/:id", asyncHandler(deleteDeporteDocente));

docenteRoutes.post("/horarios", asyncHandler(postHorarioDocente));
docenteRoutes.patch("/horarios-gestion/:id", asyncHandler(patchHorarioDocente));
docenteRoutes.delete("/horarios-gestion/:id", asyncHandler(deleteHorarioDocente));

docenteRoutes.post(
  "/asistencia",
  propiedadClaseBodyMiddleware(),
  asyncHandler(postAsistencia),
);
docenteRoutes.put(
  "/asistencia/:asistenciaId",
  propiedadAsistenciaMiddleware,
  asyncHandler(putAsistencia),
);
