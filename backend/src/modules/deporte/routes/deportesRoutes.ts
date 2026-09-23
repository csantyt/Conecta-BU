import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import {
  getAlertas,
  getDeportes,
  getEventos,
} from "../controllers/deportesController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { cualquierRolPisu } from "../middlewares/rbacMiddleware.js";

export const deportesRoutes = Router();

deportesRoutes.use(authMiddleware, cualquierRolPisu);
deportesRoutes.get("/", asyncHandler(getDeportes));
deportesRoutes.get("/eventos", asyncHandler(getEventos));
deportesRoutes.get("/alertas", asyncHandler(getAlertas));
