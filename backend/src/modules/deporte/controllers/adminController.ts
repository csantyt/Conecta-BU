import type { Request, Response } from "express";
import {
  DatosRolPisuInvalidosError,
  DeporteDuplicadoError,
  UsuarioPisuNoEncontradoError,
  asignarRolPisu,
  crearDeporte,
  listarUsuariosPisu,
  resumenAdministracion,
} from "../services/adminService.js";
import { listarAlertasPara } from "../services/deportesService.js";
import { asignarRolPisuSchema, crearDeporteSchema } from "../validators.js";

function idDeRuta(req: Request, nombre: string): string | null {
  const valor = req.params[nombre];
  const id = Array.isArray(valor) ? valor[0] : valor;
  return id && id !== "nuevo" ? id : null;
}

export async function getResumenAdmin(req: Request, res: Response): Promise<void> {
  const resumen = await resumenAdministracion();
  res.status(200).json({ resumen, perfil: req.usuarioPisu });
}

export async function getUsuariosAdmin(_req: Request, res: Response): Promise<void> {
  const usuarios = await listarUsuariosPisu();
  res.status(200).json({ usuarios });
}

export async function patchRolUsuarioAdmin(
  req: Request,
  res: Response,
): Promise<void> {
  const parsed = asignarRolPisuSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Debes enviar un rol PISU válido (Administrador, Docente o Estudiante).",
    });
    return;
  }

  const pisuId = idDeRuta(req, "id");
  const authUsuarioId = parsed.data.auth_usuario_id ?? null;

  try {
    const usuario = await asignarRolPisu({
      pisuId,
      authUsuarioId,
      rol: parsed.data.rol,
      categoria: parsed.data.categoria ?? null,
    });
    res.status(200).json({
      message: `Rol PISU actualizado a ${parsed.data.rol}.`,
      usuario,
    });
  } catch (error) {
    if (error instanceof DatosRolPisuInvalidosError) {
      res.status(400).json({ message: error.message });
      return;
    }
    if (error instanceof UsuarioPisuNoEncontradoError) {
      res.status(404).json({ message: error.message });
      return;
    }
    throw error;
  }
}

export async function getAlertasAdmin(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const alertas = await listarAlertasPara(perfil);
  res.status(200).json({ alertas });
}

export async function postDeporteAdmin(req: Request, res: Response): Promise<void> {
  const parsed = crearDeporteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Datos inválidos. Se requiere nombre y cupo_maximo (>= 1).",
    });
    return;
  }

  try {
    const deporte = await crearDeporte({
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion ?? null,
      cupo_maximo: parsed.data.cupo_maximo,
      ...(parsed.data.categorias_permitidas
        ? { categorias_permitidas: parsed.data.categorias_permitidas }
        : {}),
    });
    res.status(201).json({ message: "Deporte creado.", deporte });
  } catch (error) {
    if (error instanceof DatosRolPisuInvalidosError) {
      res.status(400).json({ message: error.message });
      return;
    }
    if (error instanceof DeporteDuplicadoError) {
      res.status(409).json({ message: error.message });
      return;
    }
    throw error;
  }
}
