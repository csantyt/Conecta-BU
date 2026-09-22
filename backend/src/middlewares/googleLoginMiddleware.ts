import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import {
  DominioNoPermitidoError,
  TokenGoogleInvalidoError,
  verificarIdTokenGoogle,
  type IdentidadGoogle,
} from "../modules/auth/services/googleIdentity.js";

const loginGoogleSchema = z.object({
  idToken: z.string().min(1, "El idToken de Google es obligatorio."),
});

declare global {
  namespace Express {
    interface Request {
      googleIdentity?: IdentidadGoogle;
    }
  }
}

export async function googleLoginMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const parsedBody = loginGoogleSchema.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(400).json({
      message: "Cuerpo de la petición inválido.",
      errors: parsedBody.error.flatten(),
    });
    return;
  }

  try {
    req.googleIdentity = await verificarIdTokenGoogle(parsedBody.data.idToken);
    next();
  } catch (error) {
    if (error instanceof DominioNoPermitidoError) {
      res.status(403).json({ message: error.message });
      return;
    }

    if (error instanceof TokenGoogleInvalidoError) {
      res.status(401).json({ message: error.message });
      return;
    }

    console.error("Error en googleLoginMiddleware:", error);
    res.status(401).json({
      message: "No se pudo verificar el token de Google.",
    });
  }
}
