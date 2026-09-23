import type { Request, Response } from "express";
import {
  listarAlertasPara,
  listarDeportesActivos,
  listarEventosActivos,
} from "../services/deportesService.js";

export async function getDeportes(req: Request, res: Response): Promise<void> {
  const deportes = await listarDeportesActivos(req.usuarioPisu);
  res.status(200).json({ deportes, perfil: req.usuarioPisu });
}

export async function getEventos(_req: Request, res: Response): Promise<void> {
  const eventos = await listarEventosActivos();
  res.status(200).json({ eventos });
}

export async function getAlertas(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const alertas = await listarAlertasPara(perfil);
  res.status(200).json({ alertas });
}
