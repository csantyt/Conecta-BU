import { Router } from "express";
import { asyncHandler } from "../../../middlewares/asyncHandler.js";
import { authMiddleware } from "../../../middlewares/authMiddleware.js";
import { googleLoginMiddleware } from "../../../middlewares/googleLoginMiddleware.js";
import { soloAdministrador } from "../../../middlewares/roleMiddleware.js";
import {
  actualizarRol,
  listarUsuarios,
  loginGoogle,
} from "../controllers/authController.js";

const authRoutes = Router();

authRoutes.post("/login/google", googleLoginMiddleware, asyncHandler(loginGoogle));

authRoutes.get(
  "/usuarios",
  authMiddleware,
  soloAdministrador,
  asyncHandler(listarUsuarios),
);

authRoutes.patch(
  "/usuarios/:id/rol",
  authMiddleware,
  soloAdministrador,
  asyncHandler(actualizarRol),
);

export default authRoutes;
