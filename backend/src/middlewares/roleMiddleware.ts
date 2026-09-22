import type { NextFunction, Request, Response } from "express";
import { ROLES, type RolUsuario } from "../modules/auth/roles.js";

export function roleMiddleware(rolesPermitidos: RolUsuario[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const usuario = req.user;

    if (!usuario) {
      res.status(401).json({ message: "No autenticado." });
      return;
    }

    if (!rolesPermitidos.includes(usuario.rol)) {
      res.status(403).json({
        message: "No tienes permisos para acceder a este recurso.",
      });
      return;
    }

    next();
  };
}

export const soloUsuario = roleMiddleware([ROLES.USUARIO, ROLES.ADMINISTRADOR]);
export const soloAdministrador = roleMiddleware([ROLES.ADMINISTRADOR]);
