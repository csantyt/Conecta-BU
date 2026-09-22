import type { Usuario } from "../types/auth";

export const TOKEN_KEY = "token";
export const USER_KEY = "usuario";

export function leerToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function leerUsuario(): Usuario | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Usuario;
  } catch {
    return null;
  }
}

export function guardarSesion(token: string, usuario: Usuario): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(usuario));
}

export function limpiarSesion(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
