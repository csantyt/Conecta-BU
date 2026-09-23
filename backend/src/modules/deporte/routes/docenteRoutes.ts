import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import {
  getAsistenciasDocente,
  getHorariosDocente,
  getPerfilDocente,
} from "../controllers/docenteController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { soloDocentePisu } from "../middlewares/rbacMiddleware.js";

export const docenteRoutes = Router();

docenteRoutes.use(authMiddleware, soloDocentePisu);
docenteRoutes.get("/perfil", asyncHandler(getPerfilDocente));
docenteRoutes.get("/horarios", asyncHandler(getHorariosDocente));
docenteRoutes.get("/asistencias", asyncHandler(getAsistenciasDocente));
