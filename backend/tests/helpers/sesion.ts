import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { Usuario } from "../../src/modules/auth/models/Usuario.js";
import { ROLES, type RolUsuario } from "../../src/modules/auth/roles.js";
import type { CategoriaPisu, RolPisu } from "../../src/modules/deporte/constantes.js";
import { UsuarioPisu } from "../../src/modules/deporte/models/UsuarioPisu.js";

function secret(): string {
  const valor = process.env["JWT_SECRET"];
  if (!valor) {
    throw new Error("JWT_SECRET es obligatorio para las pruebas.");
  }
  return valor;
}

export type SesionPrueba = {
  token: string;
  authId: string;
  pisuId: string;
  email: string;
};

export async function crearSesionPisu(params: {
  rolPisu: RolPisu;
  rolConecta?: RolUsuario;
  categoria?: CategoriaPisu | null;
}): Promise<SesionPrueba> {
  const stamp = randomUUID().slice(0, 8);
  const email = `jest.${params.rolPisu.toLowerCase()}.${stamp}@uniautonoma.edu.co`;
  const rolConecta =
    params.rolConecta ??
    (params.rolPisu === "Administrador" ? ROLES.ADMINISTRADOR : ROLES.USUARIO);

  const cuenta = await Usuario.create({
    email,
    nombre_completo: `Jest ${params.rolPisu} ${stamp}`,
    rol: rolConecta,
  });

  const ficha = await UsuarioPisu.create({
    auth_usuario_id: cuenta.id,
    nombre: cuenta.nombre_completo ?? email,
    correo: email,
    rol: params.rolPisu,
    ...(params.rolPisu === "Estudiante"
      ? { categoria: params.categoria ?? "Pregrado" }
      : { categoria: null }),
  });

  const token = jwt.sign(
    { id: cuenta.id, email, rol: cuenta.rol },
    secret(),
    { expiresIn: "1h" },
  );

  return { token, authId: cuenta.id, pisuId: ficha.id, email };
}

export function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
