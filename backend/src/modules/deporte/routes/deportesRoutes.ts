import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import {
  getAlertas,
  getCompaneros,
  getDeportes,
  getEventos,
} from "../controllers/deportesController.js";
<<<<<<< HEAD
import { getInscritosDeporte } from "../controllers/inscritosController.js";
=======
import {
  getMiHorario,
  postAutoinscripcion,
  patchCancelarInscripcion,
} from "../controllers/estudianteController.js";
>>>>>>> origin/main
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  cualquierRolPisu,
  soloEstudiantePisu,
} from "../middlewares/rbacMiddleware.js";

export const deportesRoutes = Router();

deportesRoutes.use(authMiddleware, cualquierRolPisu);
deportesRoutes.get("/", asyncHandler(getDeportes));
deportesRoutes.get("/:id/inscritos", asyncHandler(getInscritosDeporte));
deportesRoutes.get("/eventos", asyncHandler(getEventos));
deportesRoutes.get("/alertas", asyncHandler(getAlertas));
deportesRoutes.get(
  "/mi-horario",
  soloEstudiantePisu,
  asyncHandler(getMiHorario),
);
deportesRoutes.post(
  "/:id/inscripcion",
  soloEstudiantePisu,
  asyncHandler(postAutoinscripcion),
);
deportesRoutes.delete(
  "/inscripciones/:id",
  soloEstudiantePisu,
  asyncHandler(patchCancelarInscripcion),
);
deportesRoutes.get(
  "/:id/companeros",
  soloEstudiantePisu,
  asyncHandler(getCompaneros),
);
