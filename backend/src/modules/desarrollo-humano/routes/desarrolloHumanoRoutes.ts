import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../../middlewares/roleMiddleware.js";
import {
  cancelarCita,
  cancelarInscripcion,
  crearCita,
  crearEvento,
  crearHorario,
  inscribirseEvento,
  listarCitas,
  listarEventos,
  listarServicios,
  registrarAsistencia,
} from "../controllers/desarrolloHumanoController.js";

const desarrolloHumanoRoutes = Router();

desarrolloHumanoRoutes.use(authMiddleware);

desarrolloHumanoRoutes.get("/servicios", asyncHandler(listarServicios));
desarrolloHumanoRoutes.post(
  "/horarios",
  roleMiddleware(["ADMINISTRADOR"]),
  asyncHandler(crearHorario),
);

desarrolloHumanoRoutes.get("/citas", asyncHandler(listarCitas));
desarrolloHumanoRoutes.post("/citas", asyncHandler(crearCita));
desarrolloHumanoRoutes.patch("/citas/:id/cancelar", asyncHandler(cancelarCita));
desarrolloHumanoRoutes.patch(
  "/citas/:id/asistencia",
  roleMiddleware(["ADMINISTRADOR"]),
  asyncHandler(registrarAsistencia),
);

desarrolloHumanoRoutes.get("/eventos", asyncHandler(listarEventos));
desarrolloHumanoRoutes.post(
  "/eventos",
  roleMiddleware(["ADMINISTRADOR"]),
  asyncHandler(crearEvento),
);
desarrolloHumanoRoutes.post(
  "/eventos/:id/inscripciones",
  asyncHandler(inscribirseEvento),
);
desarrolloHumanoRoutes.delete(
  "/eventos/:id/inscripciones",
  asyncHandler(cancelarInscripcion),
);

export default desarrolloHumanoRoutes;
