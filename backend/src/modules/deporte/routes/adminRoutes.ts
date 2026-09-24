import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import {
  getAlertasAdmin,
  getResumenAdmin,
  getUsuariosAdmin,
  patchRolUsuarioAdmin,
  postDeporteAdmin,
} from "../controllers/adminController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import {
  administradorPisuOConecta,
  soloAdministradorPisu,
} from "../middlewares/rbacMiddleware.js";

export const adminRoutes = Router();

adminRoutes.use(authMiddleware);
adminRoutes.get("/resumen", soloAdministradorPisu, asyncHandler(getResumenAdmin));
adminRoutes.get(
  "/usuarios",
  administradorPisuOConecta,
  asyncHandler(getUsuariosAdmin),
);
adminRoutes.patch(
  "/usuarios/:id",
  administradorPisuOConecta,
  asyncHandler(patchRolUsuarioAdmin),
);
adminRoutes.post("/deportes", soloAdministradorPisu, asyncHandler(postDeporteAdmin));
adminRoutes.get("/alertas", soloAdministradorPisu, asyncHandler(getAlertasAdmin));
