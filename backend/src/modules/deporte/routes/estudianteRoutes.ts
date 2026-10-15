import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import {
  deleteInscripcionEvento,
  getAsistenciasEstudiante,
  getHorariosEstudiante,
  getInscripciones,
  getPerfilEstudiante,
  patchCancelarInscripcion,
  postAutoinscripcion,
  postInscripcionEvento,
} from "../controllers/estudianteController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { soloEstudiantePisu } from "../middlewares/rbacMiddleware.js";

export const estudianteRoutes = Router();

estudianteRoutes.use(authMiddleware, soloEstudiantePisu);
estudianteRoutes.get("/perfil", asyncHandler(getPerfilEstudiante));
estudianteRoutes.get("/inscripciones", asyncHandler(getInscripciones));
estudianteRoutes.post("/inscripciones", asyncHandler(postAutoinscripcion));
estudianteRoutes.patch(
  "/inscripciones/:id/cancelar",
  asyncHandler(patchCancelarInscripcion),
);
estudianteRoutes.get("/horarios", asyncHandler(getHorariosEstudiante));
estudianteRoutes.get("/asistencias", asyncHandler(getAsistenciasEstudiante));
estudianteRoutes.post(
  "/eventos/:id/inscripcion",
  asyncHandler(postInscripcionEvento),
);
estudianteRoutes.post(
  "/eventos/:id/participacion",
  asyncHandler(postInscripcionEvento),
);
estudianteRoutes.delete(
  "/eventos/:id/inscripcion",
  asyncHandler(deleteInscripcionEvento),
);
estudianteRoutes.delete(
  "/eventos/:id/participacion",
  asyncHandler(deleteInscripcionEvento),
);
