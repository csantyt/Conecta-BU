import type { CategoriaPisu, RolPisu } from "../constantes.js";

export type UsuarioPisuSesion = {
  id: string;
  auth_usuario_id: string | null;
  nombre: string;
  correo: string;
  rol: RolPisu;
  categoria: CategoriaPisu | null;
  estado: boolean;
};

declare global {
  namespace Express {
    interface Request {
      usuarioPisu?: UsuarioPisuSesion;
    }
  }
}

export function serializarPerfilPisu(perfil: {
  id: string;
  auth_usuario_id: string | null;
  nombre: string;
  correo: string;
  rol: RolPisu;
  categoria: CategoriaPisu | null;
  estado: boolean;
}): UsuarioPisuSesion {
  return {
    id: perfil.id,
    auth_usuario_id: perfil.auth_usuario_id,
    nombre: perfil.nombre,
    correo: perfil.correo,
    rol: perfil.rol,
    categoria: perfil.categoria,
    estado: perfil.estado,
  };
}
