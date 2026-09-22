import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { ROLES } from "../roles.js";
import { Usuario } from "../models/Usuario.js";

function obtenerJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret) {
    throw new Error("La variable de entorno JWT_SECRET es obligatoria.");
  }
  return secret;
}

function emitirToken(usuario: Usuario): string {
  return jwt.sign(
    {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    },
    obtenerJwtSecret(),
    { expiresIn: "8h" },
  );
}

function serializarUsuario(usuario: Usuario) {
  return {
    id: usuario.id,
    email: usuario.email,
    nombre_completo: usuario.nombre_completo,
    rol: usuario.rol,
    estado: usuario.estado,
  };
}

export async function loginGoogle(req: Request, res: Response): Promise<void> {
  const identidad = req.googleIdentity;

  if (!identidad) {
    res.status(401).json({
      message: "No se pudo verificar la identidad de Google.",
    });
    return;
  }

  const [usuario] = await Usuario.findOrCreate({
    where: { email: identidad.email },
    defaults: {
      email: identidad.email,
      nombre_completo: identidad.nombreCompleto,
      rol: ROLES.USUARIO,
    },
  });

  if (
    identidad.nombreCompleto &&
    usuario.nombre_completo !== identidad.nombreCompleto
  ) {
    await usuario.update({ nombre_completo: identidad.nombreCompleto });
  }

  if (!usuario.estado) {
    res.status(403).json({
      message: "La cuenta se encuentra inactiva.",
    });
    return;
  }

  res.status(200).json({
    token: emitirToken(usuario),
    usuario: serializarUsuario(usuario),
  });
}

export async function listarUsuarios(_req: Request, res: Response): Promise<void> {
  const usuarios = await Usuario.findAll({
    order: [["nombre_completo", "ASC"]],
    attributes: ["id", "email", "nombre_completo", "rol", "estado"],
  });

  res.status(200).json({ usuarios });
}

export async function actualizarRol(req: Request, res: Response): Promise<void> {
  const parsed = z
    .object({
      rol: z.enum([ROLES.USUARIO, ROLES.ADMINISTRADOR]),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ message: "Rol inválido." });
    return;
  }

  const idParam = req.params["id"];
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  if (!id) {
    res.status(400).json({ message: "Identificador inválido." });
    return;
  }

  const usuario = await Usuario.findByPk(id);
  if (!usuario) {
    res.status(404).json({ message: "El usuario no existe." });
    return;
  }

  if (
    req.user?.id === usuario.id &&
    usuario.rol === ROLES.ADMINISTRADOR &&
    parsed.data.rol === ROLES.USUARIO
  ) {
    const administradores = await Usuario.count({
      where: { rol: ROLES.ADMINISTRADOR, estado: true },
    });
    if (administradores <= 1) {
      res.status(409).json({
        message: "Debe quedar al menos un administrador activo.",
      });
      return;
    }
  }

  await usuario.update({ rol: parsed.data.rol });
  res.status(200).json({
    usuario: serializarUsuario(usuario),
  });
}
