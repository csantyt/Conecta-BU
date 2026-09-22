import type { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Usuario } from "../models/Usuario.js";

const DOMINIO_INSTITUCIONAL = "@uniautonoma.edu.co";

const loginGoogleSchema = z.object({
  idToken: z.string().min(1, "El idToken de Google es obligatorio."),
});

function obtenerJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error("La variable de entorno JWT_SECRET es obligatoria.");
  }
  return secret;
}

function obtenerGoogleClientId(): string {
  const clientId = process.env["GOOGLE_CLIENT_ID"];
  if (!clientId) {
    throw new Error("La variable de entorno GOOGLE_CLIENT_ID es obligatoria.");
  }
  return clientId;
}

export async function loginGoogle(req: Request, res: Response): Promise<void> {
  const parsedBody = loginGoogleSchema.safeParse(req.body);

  if (!parsedBody.success) {
    res.status(400).json({
      message: "Cuerpo de la petición inválido.",
      errors: parsedBody.error.flatten(),
    });
    return;
  }

  const { idToken } = parsedBody.data;
  const googleClientId = obtenerGoogleClientId();
  const client = new OAuth2Client(googleClientId);

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();
    const nombreCompleto = payload?.name ?? email ?? "";

    if (!email) {
      res.status(401).json({
        message: "No fue posible obtener el correo desde Google.",
      });
      return;
    }

    if (!email.endsWith(DOMINIO_INSTITUCIONAL)) {
      res.status(403).json({
        message: `Solo se permite el acceso con correos institucionales ${DOMINIO_INSTITUCIONAL}.`,
      });
      return;
    }

    const [usuario] = await Usuario.findOrCreate({
      where: { email },
      defaults: {
        email,
        nombre_completo: nombreCompleto,
      },
    });

    if (nombreCompleto && usuario.nombre_completo !== nombreCompleto) {
      await usuario.update({ nombre_completo: nombreCompleto });
    }

    if (!usuario.estado) {
      res.status(403).json({
        message: "La cuenta se encuentra inactiva.",
      });
      return;
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
      },
      obtenerJwtSecret(),
      { expiresIn: "8h" },
    );

    res.status(200).json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre_completo: usuario.nombre_completo,
        rol: usuario.rol,
        estado: usuario.estado,
      },
    });
  } catch (error) {
    console.error("Error en loginGoogle:", error);
    res.status(401).json({
      message: "No se pudo verificar el token de Google.",
    });
  }
}
