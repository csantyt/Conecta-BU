import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";

export function crearRouterModuloPendiente(nombrePublico: string): Router {
  const router = Router();

  router.use(authMiddleware);
  router.use((_req, res) => {
    res.status(501).json({
      message: `El módulo ${nombrePublico} aún no está implementado.`,
    });
  });

  return router;
}
