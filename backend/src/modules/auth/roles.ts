export const ROLES = {
  USUARIO: "USUARIO",
  ADMINISTRADOR: "ADMINISTRADOR",
  DOCENTE: "DOCENTE",
} as const;

export type RolUsuario = (typeof ROLES)[keyof typeof ROLES];

/** Dominio institucional autorizado, sin `@`, sin espacios y en minúsculas. */
export function obtenerDominioInstitucional(): string {
  const dominio = process.env["GOOGLE_HOSTED_DOMAIN"] ?? "uniautonoma.edu.co";
  return dominio.trim().replace(/^@/, "").toLowerCase();
}

export function esCorreoInstitucional(email: string): boolean {
  return email.toLowerCase().endsWith(`@${obtenerDominioInstitucional()}`);
}