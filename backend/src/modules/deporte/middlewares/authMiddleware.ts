import type { NextFunction, Request, Response } from "express";
import { UniqueConstraintError } from "sequelize";
import { authMiddleware as verificarJwtConecta } from "../../../middlewares/authMiddleware.js";
import { Usuario } from "../../auth/models/Usuario.js";
import {
  ROLES,
  normalizarCorreoInstitucional,
  normalizarRolAuth,
} from "../../auth/roles.js";
import { rolPisuDesdeAuth } from "../../auth/services/sincronizacionRoles.js";
import { UsuarioPisu } from "../models/UsuarioPisu.js";
import { serializarPerfilPisu } from "./tipos.js";

/**
 * Resuelve (y crea si hace falta) la ficha PISU del usuario autenticado.
 *
 * Reglas de negocio (sección 10.1):
 *  - Todo usuario autenticado con correo institucional verificado entra al
 *    módulo con el rol que le asignó la administración: Administrador, Docente
 *    o Estudiante (por defecto).
 *  - La ficha queda ligada de forma ÚNICA a la cuenta de Conecta (`auth_usuario_id`),
 *    con un índice único en base de datos; si otra petición simultánea la crea
 *    primero, se reutiliza la existente (no se duplican perfiles).
 *  - NO se inventan datos personales: la categoría académica nace vacía y el
 *    estudiante la completa después (`PATCH /estudiante/perfil`).
 */
async function resolverPerfilPisu(req: Request, res: Response): Promise<boolean> {
  const authUser = req.user;
  if (!authUser) {
    res.status(401).json({ message: "No autenticado." });
    return false;
  }

  // El rol se refresca desde la cuenta: si un administrador lo cambia, aplica
  // de inmediato aunque el JWT conserve el rol del momento del login.
  let cuentaAuth: Usuario | null = null;
  try {
    cuentaAuth = await Usuario.findByPk(authUser.id);
  } catch (error) {
    console.warn(
      "No se pudo leer la cuenta Conecta:",
      (error as Error).message,
    );
  }

  if (cuentaAuth) {
    if (!cuentaAuth.estado) {
      res.status(403).json({ message: "La cuenta se encuentra inactiva." });
      return false;
    }
    const rolActual = normalizarRolAuth(cuentaAuth.rol);
    if (rolActual) {
      authUser.rol = rolActual;
    }
  }

  const correo =
    normalizarCorreoInstitucional(authUser.email) ??
    authUser.email.trim().toLowerCase();

  // 1) Ficha ya vinculada a esta cuenta (camino normal).
  let perfil = await UsuarioPisu.findOne({
    where: { auth_usuario_id: authUser.id },
  });

  // 2) Ficha creada por administración/seed con el mismo correo: se adopta.
  //    Si el enlace guardado ya no corresponde a ninguna cuenta, se repara.
  //    Si pertenece a OTRA cuenta existente no se toca (evita suplantación).
  if (!perfil) {
    const porCorreo = await UsuarioPisu.findOne({
      where: { correo },
      order: [["fecha_creacion", "ASC"]],
    });

    if (porCorreo) {
      let enlaceVigente = false;
      if (porCorreo.auth_usuario_id) {
        try {
          enlaceVigente =
            (await Usuario.findByPk(porCorreo.auth_usuario_id)) !== null;
        } catch {
          enlaceVigente = false;
        }
      }
      if (!porCorreo.auth_usuario_id || !enlaceVigente) {
        perfil = await porCorreo.update({ auth_usuario_id: authUser.id });
      }
    }
  }

  // 3) Primer ingreso: se crea la ficha con los datos verificados de Google y
  //    el rol que tenga la cuenta (Estudiante si no se le asignó otro).
  if (!perfil) {
    const rolPisu = rolPisuDesdeAuth(authUser.rol);
    const nombre = cuentaAuth?.nombre_completo?.trim() || correo;

    try {
      perfil = await UsuarioPisu.create({
        auth_usuario_id: authUser.id,
        nombre,
        correo,
        rol: rolPisu,
        // La categoría es obligatoria para inscribirse, pero NO se inventa:
        // el estudiante la completa en su perfil.
        categoria: null,
      });
    } catch (error) {
      if (!(error instanceof UniqueConstraintError)) {
        throw error;
      }
      // Carrera con otra petición: la ficha ya existe, se reutiliza.
      perfil = await UsuarioPisu.findOne({
        where: { auth_usuario_id: authUser.id },
      });
      if (!perfil) {
        throw error;
      }
    }
  }

  // Un administrador siempre conserva privilegios de administración en PISU.
  if (
    perfil.rol !== "Administrador" &&
    authUser.rol === ROLES.ADMINISTRADOR
  ) {
    perfil = await perfil.update({ rol: "Administrador", categoria: null });
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
    estado: true,
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
