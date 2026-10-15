import type { NextFunction, Request, Response } from "express";
import { UniqueConstraintError } from "sequelize";
import { authMiddleware as verificarJwtConecta } from "../../../middlewares/authMiddleware.js";
import { Usuario } from "../../auth/models/Usuario.js";
import { ROLES, normalizarCorreoInstitucional } from "../../auth/roles.js";
import { UsuarioPisu } from "../models/UsuarioPisu.js";
import { serializarPerfilPisu } from "./tipos.js";

/**
 * Resuelve (y crea si hace falta) la ficha PISU del usuario autenticado.
 *
 * Reglas de negocio (sección 10.1):
 *  - Todo usuario autenticado con correo institucional verificado entra al
 *    módulo como Estudiante si no tiene un rol administrativo o docente.
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

  const correo =
    normalizarCorreoInstitucional(authUser.email) ??
    authUser.email.trim().toLowerCase();

  // 1) Ficha ya vinculada a esta cuenta (camino normal).
  let perfil = await UsuarioPisu.findOne({
    where: { auth_usuario_id: authUser.id },
  });

  // 2) Ficha creada por administración/seed con el mismo correo y sin vincular:
  //    se adopta. Si ya pertenece a OTRA cuenta no se toca (evita suplantación).
  if (!perfil) {
    const sinVincular = await UsuarioPisu.findOne({
      where: { correo, auth_usuario_id: null },
    });
    if (sinVincular) {
      perfil = await sinVincular.update({ auth_usuario_id: authUser.id });
    }
  }

  // 3) Primer ingreso: se crea la ficha con los datos verificados de Google.
  if (!perfil) {
    const cuentaAuth = await Usuario.findByPk(authUser.id);
    const esAdminConecta = authUser.rol === ROLES.ADMINISTRADOR;
    const esDocenteConecta = authUser.rol === ROLES.DOCENTE;
    const rolPisu = esAdminConecta
      ? "Administrador"
      : esDocenteConecta
        ? "Docente"
        : "Estudiante";
    const nombre = cuentaAuth?.nombre_completo?.trim() || authUser.email;

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
