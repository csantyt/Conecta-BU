import { Op } from "sequelize";
import { Usuario } from "../../auth/models/Usuario.js";
import type { CategoriaPisu, RolPisu } from "../constantes.js";
import { CATEGORIAS_PISU, ROLES_PISU } from "../constantes.js";
import { Alerta } from "../models/Alerta.js";
import { Asistencia } from "../models/Asistencia.js";
import { Deporte } from "../models/Deporte.js";
import { InscripcionDeporte } from "../models/InscripcionDeporte.js";
import { UsuarioPisu } from "../models/UsuarioPisu.js";

export class UsuarioPisuNoEncontradoError extends Error {}
export class DatosRolPisuInvalidosError extends Error {}
export class DeporteDuplicadoError extends Error {}

export type FichaDirectorioPisu = {
  id: string | null;
  auth_usuario_id: string | null;
  nombre: string;
  correo: string;
  rol: RolPisu | null;
  categoria: CategoriaPisu | null;
  estado: boolean;
};

export async function listarUsuariosPisu(): Promise<FichaDirectorioPisu[]> {
  const [fichas, cuentas] = await Promise.all([
    UsuarioPisu.findAll({
      attributes: [
        "id",
        "auth_usuario_id",
        "nombre",
        "correo",
        "rol",
        "categoria",
        "estado",
      ],
      order: [["nombre", "ASC"]],
    }),
    Usuario.findAll({
      attributes: ["id", "email", "nombre_completo", "estado"],
      order: [["nombre_completo", "ASC"]],
    }),
  ]);

  const usadas = new Set<string>();
  const filas: FichaDirectorioPisu[] = [];

  for (const cuenta of cuentas) {
    const ficha =
      fichas.find((item) => item.auth_usuario_id === cuenta.id) ??
      fichas.find(
        (item) => item.correo.toLowerCase() === cuenta.email.toLowerCase(),
      );
    if (ficha) {
      usadas.add(ficha.id);
    }
    filas.push({
      id: ficha?.id ?? null,
      auth_usuario_id: cuenta.id,
      nombre: ficha?.nombre || cuenta.nombre_completo || cuenta.email,
      correo: cuenta.email,
      rol: ficha?.rol ?? null,
      categoria: ficha?.categoria ?? null,
      estado: ficha ? ficha.estado !== false : cuenta.estado !== false,
    });
  }

  for (const ficha of fichas) {
    if (usadas.has(ficha.id)) {
      continue;
    }
    filas.push({
      id: ficha.id,
      auth_usuario_id: ficha.auth_usuario_id ?? null,
      nombre: ficha.nombre,
      correo: ficha.correo,
      rol: ficha.rol,
      categoria: ficha.categoria ?? null,
      estado: ficha.estado !== false,
    });
  }

  return filas.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

function normalizarCategoria(params: {
  rol: RolPisu;
  categoria?: CategoriaPisu | null;
}): CategoriaPisu | null {
  if (params.rol === "Estudiante") {
    return params.categoria &&
      (CATEGORIAS_PISU as readonly string[]).includes(params.categoria)
      ? params.categoria
      : "Pregrado";
  }
  return null;
}

export async function asignarRolPisu(params: {
  pisuId?: string | null;
  authUsuarioId?: string | null;
  rol: RolPisu;
  categoria?: CategoriaPisu | null;
}): Promise<UsuarioPisu> {
  if (!(ROLES_PISU as readonly string[]).includes(params.rol)) {
    throw new DatosRolPisuInvalidosError("Rol PISU inválido.");
  }

  const categoria = normalizarCategoria({
    rol: params.rol,
    categoria: params.categoria,
  });

  let perfil: UsuarioPisu | null = null;
  if (params.pisuId) {
    perfil = await UsuarioPisu.findByPk(params.pisuId);
  }
  if (!perfil && params.authUsuarioId) {
    perfil = await UsuarioPisu.findOne({
      where: { auth_usuario_id: params.authUsuarioId },
    });
  }

  if (perfil) {
    await perfil.update({ rol: params.rol, categoria });
    return perfil;
  }

  if (!params.authUsuarioId) {
    throw new UsuarioPisuNoEncontradoError("La persona no tiene ficha PISU.");
  }

  const cuenta = await Usuario.findByPk(params.authUsuarioId);
  if (!cuenta) {
    throw new UsuarioPisuNoEncontradoError("La cuenta Conecta no existe.");
  }

  return UsuarioPisu.create({
    auth_usuario_id: cuenta.id,
    nombre: cuenta.nombre_completo?.trim() || cuenta.email,
    correo: cuenta.email,
    rol: params.rol,
    categoria,
  });
}

export async function resumenAdministracion() {
  const [usuarios, deportes, inscripcionesActivas, asistencias, alertas] =
    await Promise.all([
      UsuarioPisu.count(),
      Deporte.count({ where: { estado: true } }),
      InscripcionDeporte.count({ where: { estado: "Activa" } }),
      Asistencia.count(),
      Alerta.count(),
    ]);

  return {
    usuarios,
    deportes_activos: deportes,
    inscripciones_activas: inscripcionesActivas,
    asistencias,
    alertas,
  };
}

export async function crearDeporte(params: {
  nombre: string;
  descripcion?: string | null;
  cupo_maximo: number;
  categorias_permitidas?: CategoriaPisu[];
}): Promise<Deporte> {
  const nombre = params.nombre.trim();
  if (nombre.length < 2) {
    throw new DatosRolPisuInvalidosError("El nombre del deporte es obligatorio.");
  }
  if (params.cupo_maximo < 1) {
    throw new DatosRolPisuInvalidosError("El cupo máximo debe ser al menos 1.");
  }

  const existente = await Deporte.findOne({
    where: { nombre: { [Op.iLike]: nombre } },
  });
  if (existente) {
    throw new DeporteDuplicadoError("Ya existe un deporte con ese nombre.");
  }

  return Deporte.create({
    nombre,
    descripcion: params.descripcion ?? null,
    cupo_maximo: params.cupo_maximo,
    ...(params.categorias_permitidas
      ? { categorias_permitidas: params.categorias_permitidas }
      : {}),
  });
}
