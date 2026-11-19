import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Usuario } from "../modules/auth/models/Usuario.js";
import {
  normalizarCorreoInstitucional,
  normalizarRolAuth,
} from "../modules/auth/roles.js";
import type { RolUsuario } from "../modules/auth/roles.js";

export interface AuthUser {
  id: string;
  email: string;
  rol: RolUsuario;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function obtenerJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error("La variable de entorno JWT_SECRET es obligatoria.");
  }
  return secret;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).json({
      message: "Token de autenticación no proporcionado.",
    });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    res.status(401).json({
      message: "Token de autenticación no proporcionado.",
    });
    return;
  }

  try {
    const payload = jwt.verify(token, obtenerJwtSecret());

    if (
      typeof payload === "string" ||
      !payload["id"] ||
      !payload["email"] ||
      !payload["rol"]
    ) {
      res.status(401).json({ message: "Token inválido o expirado." });
      return;
    }

    // Solo se admiten tokens de correos institucionales verificados.
    const email = normalizarCorreoInstitucional(String(payload["email"]));

    if (!email) {
      res.status(403).json({
        message: "El token no corresponde a un correo institucional.",
      });
      return;
    }

    const id = String(payload["id"]);
    let rol = payload["rol"] as RolUsuario;

    // El rol vigente vive en la cuenta: así una degradación o ascenso hecho por
    // el administrador aplica sin esperar a que el token expire.
    try {
      const cuenta = await Usuario.findByPk(id, {
        attributes: ["id", "email", "rol", "estado"],
      });
      if (cuenta) {
        if (!cuenta.estado) {
          res.status(403).json({ message: "La cuenta se encuentra inactiva." });
          return;
        }
        rol = normalizarRolAuth(cuenta.rol) ?? rol;
      }
    } catch (error) {
      console.warn(
        "No se pudo refrescar el rol desde la base:",
        (error as Error).message,
      );
    }

    req.user = {
      id,
      email,
      rol,
    };

    next();
  } catch {
    res.status(401).json({ message: "Token inválido o expirado." });
  }
}
