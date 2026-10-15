/**
 * Rutas de eventos creados por el docente.
 *
 * Se montan en `/api/v1/deportes/docente/eventos` (según la especificación) y
 * están protegidas por:
 *   1) `authMiddleware`  → valida el JWT y resuelve el perfil PISU.
 *   2) `soloDocentePisu` → solo el rol Docente (otros roles → 403).
 *
 * El administrador conserva sus propias rutas en `/api/v1/admin/eventos`.
 */

import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import {
  getEventosDocente,
  getInscritosEventoDocente,
  postCancelarEventoDocente,
  postEventoDocente,
  putEventoDocente,
} from "../controllers/eventosDocenteController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { soloDocentePisu } from "../middlewares/rbacMiddleware.js";

export const docenteEventosRoutes = Router();

docenteEventosRoutes.use(authMiddleware, soloDocentePisu);

docenteEventosRoutes.get("/", asyncHandler(getEventosDocente));
docenteEventosRoutes.post("/", asyncHandler(postEventoDocente));
docenteEventosRoutes.get("/:id/inscritos", asyncHandler(getInscritosEventoDocente));
docenteEventosRoutes.put("/:id", asyncHandler(putEventoDocente));
docenteEventosRoutes.post("/:id/cancelar", asyncHandler(postCancelarEventoDocente));
