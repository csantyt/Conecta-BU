import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import {
  deleteAlertaAdmin,
  getAlertasAdmin,
  getDeportesAdmin,
  getDocentesAdmin,
  getEventosAdmin,
  getHorariosAdmin,
  getResumenAdmin,
  getUsuariosAdmin,
  patchDeporteAdmin,
  patchEventoAdmin,
  patchHorarioAdmin,
  patchRolUsuarioAdmin,
  postAlertaAdmin,
  postDeporteAdmin,
  postEventoAdmin,
  postHorarioAdmin,
} from "../controllers/adminController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { administradorPisuOConecta } from "../middlewares/rbacMiddleware.js";

export const adminRoutes = Router();

adminRoutes.use(authMiddleware);
adminRoutes.use(administradorPisuOConecta);

adminRoutes.get("/resumen", asyncHandler(getResumenAdmin));
adminRoutes.get("/usuarios", asyncHandler(getUsuariosAdmin));
adminRoutes.get("/docentes", asyncHandler(getDocentesAdmin));
adminRoutes.patch("/usuarios/:id", asyncHandler(patchRolUsuarioAdmin));

adminRoutes.get("/deportes", asyncHandler(getDeportesAdmin));
adminRoutes.post("/deportes", asyncHandler(postDeporteAdmin));
adminRoutes.patch("/deportes/:id", asyncHandler(patchDeporteAdmin));

adminRoutes.get("/horarios", asyncHandler(getHorariosAdmin));
adminRoutes.post("/horarios", asyncHandler(postHorarioAdmin));
adminRoutes.patch("/horarios/:id", asyncHandler(patchHorarioAdmin));

adminRoutes.get("/eventos", asyncHandler(getEventosAdmin));
adminRoutes.post("/eventos", asyncHandler(postEventoAdmin));
adminRoutes.patch("/eventos/:id", asyncHandler(patchEventoAdmin));

adminRoutes.get("/alertas", asyncHandler(getAlertasAdmin));
adminRoutes.post("/alertas", asyncHandler(postAlertaAdmin));
adminRoutes.delete("/alertas/:id", asyncHandler(deleteAlertaAdmin));
