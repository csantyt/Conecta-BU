import type { NextFunction, Request, Response } from "express";
import { ROLES } from "../../auth/roles.js";
import type { RolPisu } from "../constantes.js";

export function rbacMiddleware(rolesPermitidos: RolPisu[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const perfil = req.usuarioPisu;

    if (!perfil) {
      res.status(401).json({ message: "No autenticado." });
      return;
    }

    if (!perfil.estado) {
      res.status(403).json({ message: "La cuenta PISU se encuentra inactiva." });
      return;
    }

    if (!rolesPermitidos.includes(perfil.rol)) {
      res.status(403).json({
        message: "No tienes permisos para acceder a este recurso.",
        rol_requerido: rolesPermitidos,
        rol_actual: perfil.rol,
      });
      return;
    }

    next();
  };
}

export function administradorPisuOConecta(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  if (!perfil.estado) {
    res.status(403).json({ message: "La cuenta PISU se encuentra inactiva." });
    return;
  }
  if (perfil.rol === "Administrador" || req.user?.rol === ROLES.ADMINISTRADOR) {
    next();
    return;
  }
  res.status(403).json({
    message: "No tienes permisos de administración PISU.",
  });
}

export const soloAdministradorPisu = rbacMiddleware(["Administrador"]);
export const soloDocentePisu = rbacMiddleware(["Docente", "Administrador"]);
export const soloEstudiantePisu = rbacMiddleware(["Estudiante", "Administrador"]);
export const cualquierRolPisu = rbacMiddleware([
  "Administrador",
  "Docente",
  "Estudiante",
]);
