import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import {
  deleteAlertaAdmin,
  deleteDeporteAdmin,
  getAlertasAdmin,
  getBuscarEstudiantesAdmin,
  getDashboardAdmin,
  getDeportesAdmin,
  getVerificacionAdmin,
  getDocentesAdmin,
  getEstudiantesAdmin,
  getEventosAdmin,
  getHorariosAdmin,
  getInscritosAgrupadosAdmin,
  getInscritosEventoAdmin,
  getResumenAdmin,
  getUsuariosAdmin,
  patchCancelarInscripcionManualAdmin,
  patchDeporteAdmin,
  patchDocenteAdmin,
  patchEstudianteAdmin,
  patchEventoAdmin,
  patchHorarioAdmin,
  patchRolUsuarioAdmin,
  postAdministradorPisuAdmin,
  postAlertaAdmin,
  postDeporteAdmin,
  postDocenteAdmin,
  postDocentesCsvAdmin,
  postEventoAdmin,
  postHorarioAdmin,
  postInscripcionManualAdmin,
  putDeportesDocenteAdmin,
} from "../controllers/adminController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { administradorPisuOConecta } from "../middlewares/rbacMiddleware.js";
import {
  getInscripcionesEstudiante,
  getInscritosDeporte,
} from "../controllers/inscritosController.js";

export const adminRoutes = Router();

adminRoutes.use(authMiddleware);
adminRoutes.use(administradorPisuOConecta);

adminRoutes.get("/resumen", asyncHandler(getResumenAdmin));
adminRoutes.get("/dashboard", asyncHandler(getDashboardAdmin));
adminRoutes.get("/verificacion", asyncHandler(getVerificacionAdmin));
adminRoutes.get("/usuarios", asyncHandler(getUsuariosAdmin));
adminRoutes.get("/docentes", asyncHandler(getDocentesAdmin));
adminRoutes.post("/docentes", asyncHandler(postDocenteAdmin));
adminRoutes.patch("/docentes/:id", asyncHandler(patchDocenteAdmin));
adminRoutes.put("/docentes/:id/deportes", asyncHandler(putDeportesDocenteAdmin));
adminRoutes.post("/docentes/csv", asyncHandler(postDocentesCsvAdmin));
adminRoutes.get("/estudiantes", asyncHandler(getEstudiantesAdmin));
adminRoutes.get("/inscripciones/agrupadas", asyncHandler(getInscritosAgrupadosAdmin));
adminRoutes.get("/estudiantes/buscar", asyncHandler(getBuscarEstudiantesAdmin));
adminRoutes.get("/estudiantes/:id/inscripciones", asyncHandler(getInscripcionesEstudiante));
adminRoutes.patch("/estudiantes/:id", asyncHandler(patchEstudianteAdmin));
adminRoutes.post("/inscripciones", asyncHandler(postInscripcionManualAdmin));
adminRoutes.patch("/inscripciones/:id/cancelar", asyncHandler(patchCancelarInscripcionManualAdmin));
adminRoutes.post("/administradores", asyncHandler(postAdministradorPisuAdmin));
adminRoutes.patch("/usuarios/:id", asyncHandler(patchRolUsuarioAdmin));

adminRoutes.get("/deportes", asyncHandler(getDeportesAdmin));
adminRoutes.post("/deportes", asyncHandler(postDeporteAdmin));
adminRoutes.patch("/deportes/:id", asyncHandler(patchDeporteAdmin));
adminRoutes.delete("/deportes/:id", asyncHandler(deleteDeporteAdmin));

adminRoutes.get("/horarios", asyncHandler(getHorariosAdmin));
adminRoutes.post("/horarios", asyncHandler(postHorarioAdmin));
adminRoutes.patch("/horarios/:id", asyncHandler(patchHorarioAdmin));

adminRoutes.get("/eventos", asyncHandler(getEventosAdmin));
adminRoutes.get("/eventos/:id/inscritos", asyncHandler(getInscritosEventoAdmin));
adminRoutes.post("/eventos", asyncHandler(postEventoAdmin));
adminRoutes.patch("/eventos/:id", asyncHandler(patchEventoAdmin));

adminRoutes.get("/alertas", asyncHandler(getAlertasAdmin));
adminRoutes.post("/alertas", asyncHandler(postAlertaAdmin));
adminRoutes.delete("/alertas/:id", asyncHandler(deleteAlertaAdmin));
