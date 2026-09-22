import { Rol } from "./models/Rol.js";
import type { RolUsuario } from "./models/Usuario.js";

const ROLES: { codigo: RolUsuario; nombre: string }[] = [
  { codigo: "USUARIO", nombre: "Usuario" },
  { codigo: "ADMINISTRADOR", nombre: "Administrador" },
];

export async function sembrarRoles(): Promise<void> {
  for (const rol of ROLES) {
    await Rol.findOrCreate({
      where: { codigo: rol.codigo },
      defaults: rol,
    });
  }
}
