import type { Request, Response } from "express";
import {
  listarAsistenciasDocente,
  listarHorariosDocente,
} from "../services/docenteService.js";

export async function getPerfilDocente(req: Request, res: Response): Promise<void> {
  res.status(200).json({ perfil: req.usuarioPisu });
}

export async function getHorariosDocente(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const horarios = await listarHorariosDocente(perfil);
  res.status(200).json({ horarios });
}

export async function getAsistenciasDocente(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const fechaParam = req.query["fecha"];
  const fecha = typeof fechaParam === "string" ? fechaParam : undefined;
  const asistencias = await listarAsistenciasDocente(perfil, fecha);
  res.status(200).json({ asistencias });
}
