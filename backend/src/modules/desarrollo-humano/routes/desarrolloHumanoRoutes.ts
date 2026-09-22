import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { soloAdministrador } from "../../../middlewares/roleMiddleware.js";
import {
  actualizarHorario,
  cancelarCita,
  cancelarInscripcion,
  consultarHorariosDisponibles,
  crearCita,
  crearEvento,
  crearHorario,
  desactivarHorario,
  inscribirseEvento,
  listarCitas,
  listarEventos,
  listarHorarios,
  listarServicios,
  registrarAsistencia,
} from "../controllers/desarrolloHumanoController.js";

const desarrolloHumanoRoutes = Router();

desarrolloHumanoRoutes.use(authMiddleware);

desarrolloHumanoRoutes.get("/servicios", asyncHandler(listarServicios));
desarrolloHumanoRoutes.get(
  "/horarios/disponibles",
  asyncHandler(consultarHorariosDisponibles),
);
desarrolloHumanoRoutes.get(
  "/horarios",
  soloAdministrador,
  asyncHandler(listarHorarios),
);
desarrolloHumanoRoutes.post(
  "/horarios",
  soloAdministrador,
  asyncHandler(crearHorario),
);
desarrolloHumanoRoutes.patch(
  "/horarios/:id",
  soloAdministrador,
  asyncHandler(actualizarHorario),
);
desarrolloHumanoRoutes.patch(
  "/horarios/:id/deshabilitar",
  soloAdministrador,
  asyncHandler(desactivarHorario),
);

desarrolloHumanoRoutes.get("/citas", asyncHandler(listarCitas));
desarrolloHumanoRoutes.post("/citas", asyncHandler(crearCita));
desarrolloHumanoRoutes.patch("/citas/:id/cancelar", asyncHandler(cancelarCita));
desarrolloHumanoRoutes.patch(
  "/citas/:id/asistencia",
  soloAdministrador,
  asyncHandler(registrarAsistencia),
);

desarrolloHumanoRoutes.get("/eventos", asyncHandler(listarEventos));
desarrolloHumanoRoutes.post(
  "/eventos",
  soloAdministrador,
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
