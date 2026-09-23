import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import {
  getAlertasAdmin,
  getResumenAdmin,
  getUsuariosAdmin,
} from "../controllers/adminController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { soloAdministradorPisu } from "../middlewares/rbacMiddleware.js";

export const adminRoutes = Router();

adminRoutes.use(authMiddleware, soloAdministradorPisu);
adminRoutes.get("/resumen", asyncHandler(getResumenAdmin));
adminRoutes.get("/usuarios", asyncHandler(getUsuariosAdmin));
adminRoutes.get("/alertas", asyncHandler(getAlertasAdmin));
