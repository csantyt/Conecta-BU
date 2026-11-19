export type RolUsuario =
  | "ESTUDIANTE"
  | "DOCENTE"
  | "ADMINISTRADOR"
  | "USUARIO";

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
  if (rol === "DOCENTE") {
    return "Docente";
  }
  return "Estudiante";
}

export type LoginGoogleResponse = {
  token: string;
  usuario: Usuario;
};
