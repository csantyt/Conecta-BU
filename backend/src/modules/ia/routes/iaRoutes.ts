import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import {
  consultarOrientacion,
  consultarRecomendaciones,
} from "../controllers/iaController.js";

const iaRoutes = Router();

iaRoutes.use(authMiddleware);
iaRoutes.post("/orientacion", asyncHandler(consultarOrientacion));
iaRoutes.post("/recomendaciones", asyncHandler(consultarRecomendaciones));

export default iaRoutes;
