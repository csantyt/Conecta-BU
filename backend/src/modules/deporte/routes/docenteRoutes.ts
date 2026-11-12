/**
 * Rutas del rol Docente (módulo Deporte PISU).
 *
 * Todas cuelgan de `/api/v1/docente` y están protegidas por:
 *   1) `authMiddleware`  → valida el JWT y resuelve el perfil PISU.
 *   2) `soloDocentePisu` → solo el rol Docente (estudiante/administrador → 403).
 */

import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import {
  getAsistenciasDocente,
  getClasesHoy,
  getEstudiantesDeClase,
  getEstudiantesDeDeporte,
  getHistorial,
  getHorariosDocente,
  getMisClases,
  getMisDeportes,
  getPerfilDocente,
  getReporte,
  getReporteExcel,
  getSesionLista,
  postAsistencia,
  putAsistencia,
} from "../controllers/docenteController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { soloDocentePisu } from "../middlewares/rbacMiddleware.js";

export const docenteRoutes = Router();

docenteRoutes.use(authMiddleware, soloDocentePisu);

docenteRoutes.get("/perfil", asyncHandler(getPerfilDocente));
docenteRoutes.get("/mis-deportes", asyncHandler(getMisDeportes));
docenteRoutes.get("/hoy", asyncHandler(getClasesHoy));
docenteRoutes.get("/mis-clases", asyncHandler(getMisClases));
docenteRoutes.get("/horarios", asyncHandler(getHorariosDocente));
docenteRoutes.get("/historial", asyncHandler(getHistorial));

docenteRoutes.get("/clases/:horarioId/estudiantes", asyncHandler(getEstudiantesDeClase));
docenteRoutes.get("/clases/:horarioId/lista", asyncHandler(getSesionLista));

docenteRoutes.get("/asistencias", asyncHandler(getAsistenciasDocente));
docenteRoutes.post("/asistencia", asyncHandler(postAsistencia));
docenteRoutes.put("/asistencia/:asistenciaId", asyncHandler(putAsistencia));

docenteRoutes.get("/deportes/:deporteId/estudiantes", asyncHandler(getEstudiantesDeDeporte));
docenteRoutes.get("/deportes/:deporteId/reporte", asyncHandler(getReporte));
docenteRoutes.get("/deportes/:deporteId/reporte/excel", asyncHandler(getReporteExcel));
