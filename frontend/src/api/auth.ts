import { api } from "./http";
import type { LoginGoogleResponse, Usuario } from "../types/auth";

export async function loginConGoogle(idToken: string): Promise<LoginGoogleResponse> {
  const { data } = await api.post<LoginGoogleResponse>("/auth/login/google", {
    idToken,
  });

  return data;
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const { data } = await api.get<{ usuarios: Usuario[] }>("/auth/usuarios");
  return data.usuarios;
}

export async function actualizarRolUsuario(
  id: string,
  rol: Usuario["rol"],
): Promise<Usuario> {
  const { data } = await api.patch<{ usuario: Usuario }>(`/auth/usuarios/${id}/rol`, {
    rol,
  });
  return data.usuario;
}
