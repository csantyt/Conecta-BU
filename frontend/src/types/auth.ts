export type RolUsuario = "USUARIO" | "ADMINISTRADOR";

export type Usuario = {
  id: string;
  email: string;
  nombre_completo: string;
  rol: RolUsuario;
  estado: boolean;
};

export function etiquetaRol(rol: string): string {
  if (rol === "ADMINISTRADOR") {
    return "Administrador";
  }
  return "Usuario";
}

export type LoginGoogleResponse = {
  token: string;
  usuario: Usuario;
};
