import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { RolUsuario } from "../modules/auth/models/Usuario.js";

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

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
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

    if (typeof payload === "string" || !payload["id"] || !payload["email"] || !payload["rol"]) {
      res.status(401).json({ message: "Token inválido o expirado." });
      return;
    }

    req.user = {
      id: String(payload["id"]),
      email: String(payload["email"]),
      rol: payload["rol"] as RolUsuario,
    };

    next();
  } catch {
    res.status(401).json({ message: "Token inválido o expirado." });
  }
}
