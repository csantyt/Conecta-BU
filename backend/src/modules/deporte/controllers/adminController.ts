import type { Request, Response } from "express";
import {
  listarUsuariosPisu,
  resumenAdministracion,
} from "../services/adminService.js";
import { listarAlertasPara } from "../services/deportesService.js";

export async function getResumenAdmin(req: Request, res: Response): Promise<void> {
  const resumen = await resumenAdministracion();
  res.status(200).json({ resumen, perfil: req.usuarioPisu });
}

export async function getUsuariosAdmin(_req: Request, res: Response): Promise<void> {
  const usuarios = await listarUsuariosPisu();
  res.status(200).json({ usuarios });
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
