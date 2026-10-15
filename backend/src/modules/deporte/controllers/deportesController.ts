import type { Request, Response } from "express";
import {
  listarAlertasPara,
  listarCompanerosDeporte,
  listarDeportesActivos,
} from "../services/deportesService.js";
import { listarEventosActivos } from "../services/eventosService.js";

export async function getDeportes(req: Request, res: Response): Promise<void> {
  const nombre =
    typeof req.query["nombre"] === "string" ? req.query["nombre"] : undefined;
  const diaRaw = req.query["dia"];
  const dia =
    typeof diaRaw === "string" || typeof diaRaw === "number"
      ? diaRaw
      : undefined;
  const deportes = await listarDeportesActivos(req.usuarioPisu, { nombre, dia });
  res.status(200).json({ deportes, perfil: req.usuarioPisu });
}

export async function getEventos(req: Request, res: Response): Promise<void> {
  const eventos = await listarEventosActivos(req.usuarioPisu);
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

export async function getCompaneros(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const id = req.params["id"];
  const deporteId = Array.isArray(id) ? id[0] : id;
  if (!deporteId) {
    res.status(400).json({ message: "Identificador inválido." });
    return;
  }
  try {
    const resultado = await listarCompanerosDeporte(perfil, deporteId);
    res.status(200).json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno.";
    if (message.includes("inscrito")) {
      res.status(404).json({ message });
      return;
    }
    if (message.includes("no existe")) {
      res.status(404).json({ message });
      return;
    }
    res.status(403).json({ message });
  }
}
