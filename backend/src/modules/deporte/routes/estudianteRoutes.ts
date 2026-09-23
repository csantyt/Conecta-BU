import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import {
  getHorariosEstudiante,
  getInscripciones,
  getPerfilEstudiante,
} from "../controllers/estudianteController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { soloEstudiantePisu } from "../middlewares/rbacMiddleware.js";

export const estudianteRoutes = Router();

estudianteRoutes.use(authMiddleware, soloEstudiantePisu);
estudianteRoutes.get("/perfil", asyncHandler(getPerfilEstudiante));
estudianteRoutes.get("/inscripciones", asyncHandler(getInscripciones));
estudianteRoutes.get("/horarios", asyncHandler(getHorariosEstudiante));
