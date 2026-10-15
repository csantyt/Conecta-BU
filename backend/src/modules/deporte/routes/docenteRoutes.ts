import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import {
  getAsistenciasDocente,
  getEstudiantesDeClase,
  getHorariosDocente,
  getMisClases,
  getMisClasesHoy,
  getPerfilDocente,
  postAsistencia,
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
