import { Rol } from "./models/Rol.js";
import { ROLES, type RolUsuario } from "./roles.js";

const ROLES_INICIALES: { codigo: RolUsuario; nombre: string }[] = [
  { codigo: ROLES.USUARIO, nombre: "Usuario" },
  { codigo: ROLES.ADMINISTRADOR, nombre: "Administrador" },
];

export async function sembrarRoles(): Promise<void> {
  for (const rol of ROLES_INICIALES) {
    await Rol.findOrCreate({
      where: { codigo: rol.codigo },
      defaults: rol,
    });
  }
}
