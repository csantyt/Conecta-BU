export const ROLES = {
  USUARIO: "USUARIO",
  ADMINISTRADOR: "ADMINISTRADOR",
} as const;

export type RolUsuario = (typeof ROLES)[keyof typeof ROLES];

export function obtenerDominioInstitucional(): string {
  const dominio = process.env["GOOGLE_HOSTED_DOMAIN"] ?? "uniautonoma.edu.co";
  return dominio.replace(/^@/, "").toLowerCase();
}

export function esCorreoInstitucional(email: string): boolean {
  return email.toLowerCase().endsWith(`@${obtenerDominioInstitucional()}`);
}
