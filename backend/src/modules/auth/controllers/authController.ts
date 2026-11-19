import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ROLES, esAdministradorBootstrap, normalizarRolAuth } from "../roles.js";
import { Usuario } from "../models/Usuario.js";
import { sincronizarRolPisu } from "../services/sincronizacionRoles.js";

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

  const esAdminBootstrap = esAdministradorBootstrap(identidad.email);

  const [usuario] = await Usuario.findOrCreate({
    where: { email: identidad.email },
    defaults: {
      email: identidad.email,
      nombre_completo: identidad.nombreCompleto,
      rol: esAdminBootstrap ? ROLES.ADMINISTRADOR : ROLES.ESTUDIANTE,
    },
  });

  if (
    identidad.nombreCompleto &&
    usuario.nombre_completo !== identidad.nombreCompleto
  ) {
    await usuario.update({ nombre_completo: identidad.nombreCompleto });
  }

  // `USUARIO` era el rol legado de estudiante; se normaliza al rol nuevo.
  if (usuario.rol === ROLES.USUARIO) {
    await usuario.update({ rol: ROLES.ESTUDIANTE });
  }

  if (esAdminBootstrap && usuario.rol !== ROLES.ADMINISTRADOR) {
    await usuario.update({ rol: ROLES.ADMINISTRADOR });
  }

  if (!usuario.estado) {
    res.status(403).json({
      message: "La cuenta se encuentra inactiva.",
    });
    return;
  }

  if (esAdminBootstrap) {
    await sincronizarRolPisu({
      authUsuarioId: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    });
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
  const rol = normalizarRolAuth(req.body?.rol);

  if (!rol) {
    res.status(400).json({
      message: "Rol inválido. Usa Estudiante, Docente o Administrador.",
    });
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

  if (usuario.rol === ROLES.ADMINISTRADOR && rol !== ROLES.ADMINISTRADOR) {
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

  await usuario.update({ rol });

  // El rol de Deporte (PISU) acompaña al rol de la cuenta.
  await sincronizarRolPisu({
    authUsuarioId: usuario.id,
    email: usuario.email,
    rol,
  });

  res.status(200).json({
    usuario: serializarUsuario(usuario),
  });
}
