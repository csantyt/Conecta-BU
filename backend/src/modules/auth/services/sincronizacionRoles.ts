import { sequelize } from "../../../config/database.js";
import { Usuario } from "../models/Usuario.js";
import {
  ROLES,
  esCorreoInstitucional,
  type RolUsuario,
} from "../roles.js";

/** Roles del módulo Deporte (PISU). */
export type RolPisu = "Administrador" | "Docente" | "Estudiante";

export function rolPisuDesdeAuth(rol: string): RolPisu {
  const normalizado = rol.trim().toUpperCase();
  if (normalizado === ROLES.ADMINISTRADOR) {
    return "Administrador";
  }
  if (normalizado === ROLES.DOCENTE) {
    return "Docente";
  }
  return "Estudiante";
}

export function rolAuthDesdePisu(rol: RolPisu): RolUsuario {
  if (rol === "Administrador") {
    return ROLES.ADMINISTRADOR;
  }
  if (rol === "Docente") {
    return ROLES.DOCENTE;
  }
  return ROLES.ESTUDIANTE;
}

/**
 * Aplica el rol de la cuenta Conecta sobre la ficha PISU vinculada (o sobre la
 * ficha sembrada por correo que aún no tiene cuenta). Así el cambio hecho por un
 * administrador se refleja en Deporte sin que la persona vuelva a iniciar sesión.
 */
export async function sincronizarRolPisu(params: {
  authUsuarioId?: string | null;
  email: string;
  rol: RolUsuario;
}): Promise<void> {
  const rolPisu = rolPisuDesdeAuth(params.rol);
  const email = params.email.trim().toLowerCase();

  try {
    await sequelize.query(
      `UPDATE deporte.usuarios AS u
          SET rol = :rolPisu,
              categoria = CASE
                WHEN :rolPisu = 'Estudiante' THEN COALESCE(u.categoria, 'Pregrado')
                ELSE NULL
              END
        WHERE u.auth_usuario_id = :authUsuarioId
           OR (
             lower(u.correo) = :email
             AND (
               u.auth_usuario_id IS NULL
               OR NOT EXISTS (
                 SELECT 1 FROM conecta_auth.usuarios a
                  WHERE a.id = u.auth_usuario_id
               )
             )
           )`,
      {
        replacements: {
          rolPisu,
          email,
          authUsuarioId: params.authUsuarioId ?? null,
        },
      },
    );
  } catch (error) {
    console.warn(
      "No se pudo sincronizar el rol PISU:",
      (error as Error).message,
    );
  }
}

/**
 * Camino inverso: cuando el administrador asigna un rol PISU, la cuenta Conecta
 * queda con el mismo rol (creándola por correo si aún no ha iniciado sesión).
 */
export async function sincronizarRolAuth(params: {
  authUsuarioId?: string | null;
  correo: string;
  nombre?: string | null;
  rolPisu: RolPisu;
}): Promise<void> {
  const rol = rolAuthDesdePisu(params.rolPisu);
  const correo = params.correo.trim().toLowerCase();

  if (params.authUsuarioId) {
    const cuenta = await Usuario.findByPk(params.authUsuarioId);
    if (cuenta) {
      if (cuenta.rol !== rol) {
        await cuenta.update({ rol });
      }
      return;
    }
  }

  if (!esCorreoInstitucional(correo)) {
    return;
  }

  const [cuenta] = await Usuario.findOrCreate({
    where: { email: correo },
    defaults: {
      email: correo,
      nombre_completo: params.nombre?.trim() || correo,
      rol,
    },
  });

  if (cuenta.rol !== rol) {
    await cuenta.update({ rol });
  }
}
