import type { NextFunction, Request, Response } from "express";
import { authMiddleware as verificarJwtConecta } from "../../../middlewares/authMiddleware.js";
import { Usuario } from "../../auth/models/Usuario.js";
import { ROLES } from "../../auth/roles.js";
import { UsuarioPisu } from "../models/UsuarioPisu.js";
import { serializarPerfilPisu } from "./tipos.js";

async function resolverPerfilPisu(req: Request, res: Response): Promise<boolean> {
  const authUser = req.user;
  if (!authUser) {
    res.status(401).json({ message: "No autenticado." });
    return false;
  }

  let perfil =
    (await UsuarioPisu.findOne({ where: { auth_usuario_id: authUser.id } })) ??
    (await UsuarioPisu.findOne({ where: { correo: authUser.email } }));

  if (!perfil) {
    const cuentaAuth = await Usuario.findByPk(authUser.id);
    const esAdminConecta = authUser.rol === ROLES.ADMINISTRADOR;
    const rolPisu = esAdminConecta ? "Administrador" : "Estudiante";
    const nombre = cuentaAuth?.nombre_completo?.trim() || authUser.email;

    perfil = await UsuarioPisu.create({
      auth_usuario_id: authUser.id,
      nombre,
      correo: authUser.email,
      rol: rolPisu,
      ...(rolPisu === "Estudiante" ? { categoria: "Pregrado" as const } : {}),
    });
  } else if (!perfil.auth_usuario_id) {
    await perfil.update({ auth_usuario_id: authUser.id });
  }

  if (perfil.estado === false) {
    res.status(403).json({ message: "La cuenta PISU se encuentra inactiva." });
    return false;
  }

  req.usuarioPisu = serializarPerfilPisu({
    id: perfil.id,
    auth_usuario_id: perfil.auth_usuario_id ?? null,
    nombre: perfil.nombre,
    correo: perfil.correo,
    rol: perfil.rol,
    categoria: perfil.categoria ?? null,
    estado: perfil.estado !== false,
  });
  return true;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  verificarJwtConecta(req, res, () => {
    void resolverPerfilPisu(req, res)
      .then((ok) => {
        if (ok) {
          next();
        }
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Error interno del servidor." });
        }
      });
  });
}
