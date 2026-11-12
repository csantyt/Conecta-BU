export const ROLES = {
  USUARIO: "USUARIO",
  ADMINISTRADOR: "ADMINISTRADOR",
  DOCENTE: "DOCENTE",
  ESTUDIANTE: "ESTUDIANTE",
} as const;

export type RolUsuario = (typeof ROLES)[keyof typeof ROLES];

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
