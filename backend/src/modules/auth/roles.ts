export const ROLES = {
  USUARIO: "USUARIO",
  ADMINISTRADOR: "ADMINISTRADOR",
  DOCENTE: "DOCENTE",
  ESTUDIANTE: "ESTUDIANTE",
} as const;

export type RolUsuario = (typeof ROLES)[keyof typeof ROLES];

/** Normaliza un rol recibido (incluye el legado `USUARIO` → `ESTUDIANTE`). */
export function normalizarRolAuth(valor: unknown): RolUsuario | null {
  if (typeof valor !== "string") {
    return null;
  }
  const rol = valor.trim().toUpperCase();
  if (rol === ROLES.ESTUDIANTE || rol === ROLES.USUARIO) {
    return ROLES.ESTUDIANTE;
  }
  if (rol === ROLES.DOCENTE) {
    return ROLES.DOCENTE;
  }
  if (rol === ROLES.ADMINISTRADOR) {
    return ROLES.ADMINISTRADOR;
  }
  return null;
}

/**
 * Correos que siempre entran como administrador, aunque sea su primer login.
 * Se configura con `ADMIN_EMAILS` (lista separada por comas).
 */
export function correosAdministradores(): string[] {
  const raw = process.env["ADMIN_EMAILS"] ?? "estiven.realpe.h@uniautonoma.edu.co";
  return raw
    .split(",")
    .map((correo) => correo.trim().toLowerCase())
    .filter((correo) => correo.length > 0);
}

export function esAdministradorBootstrap(email: string): boolean {
  const normalizado = email.trim().toLowerCase();
  return correosAdministradores().includes(normalizado);
}

/** Dominio institucional autorizado, sin `@`, sin espacios y en minúsculas. */
export function obtenerDominioInstitucional(): string {
  const dominio = process.env["GOOGLE_HOSTED_DOMAIN"] ?? "uniautonoma.edu.co";
  return dominio.trim().replace(/^@/, "").toLowerCase();
}

/**
 * Normaliza y valida un correo institucional (sección 10.1).
 *
 * Reglas de negocio:
 *  - se quitan los espacios al inicio y al final;
 *  - el dominio se compara sin distinguir mayúsculas de minúsculas;
 *  - debe existir EXACTAMENTE un `@` (local y dominio no vacíos);
 *  - el dominio debe ser EXACTAMENTE el institucional: no vale un subdominio
 *    ni una dirección que solo contenga el texto del dominio, por ejemplo
 *    `estudiante@uniautonoma.edu.co.otrodominio.com` (rechazada).
 *
 * @returns el correo normalizado (`usuario@dominio`) o `null` si no es elegible.
 */
export function normalizarCorreoInstitucional(
  email: string | null | undefined,
): string | null {
  if (typeof email !== "string") {
    return null;
  }
  const limpio = email.trim().toLowerCase();
  if (!limpio || /\s/.test(limpio)) {
    return null;
  }
  const arroba = limpio.indexOf("@");
  if (arroba <= 0 || arroba !== limpio.lastIndexOf("@")) {
    return null;
  }
  const local = limpio.slice(0, arroba);
  const dominio = limpio.slice(arroba + 1);
  if (!local || !dominio) {
    return null;
  }
  if (dominio !== obtenerDominioInstitucional()) {
    return null;
  }
  return limpio;
}

/** ¿El correo pertenece exactamente al dominio institucional autorizado? */
export function esCorreoInstitucional(email: string): boolean {
  return normalizarCorreoInstitucional(email) !== null;
}
