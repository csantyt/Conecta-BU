import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import { getEventos } from "../controllers/deportesController.js";
import {
  deleteInscripcionEvento,
  postInscripcionEvento,
} from "../controllers/estudianteController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { soloEstudiantePisu } from "../middlewares/rbacMiddleware.js";

export const eventosAliasRoutes = Router();
eventosAliasRoutes.use(authMiddleware);
eventosAliasRoutes.get("/", asyncHandler(getEventos));
eventosAliasRoutes.post(
  "/:id/participacion",
  soloEstudiantePisu,
  asyncHandler(postInscripcionEvento),
);
eventosAliasRoutes.delete(
  "/:id/participacion",
  soloEstudiantePisu,
  asyncHandler(deleteInscripcionEvento),
);