import { Router } from "express";
import { loginGoogle } from "../controllers/authController.js";

const authRoutes = Router();

authRoutes.post("/login/google", loginGoogle);

export default authRoutes;
