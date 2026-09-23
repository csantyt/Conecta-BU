import type { Request, Response } from "express";
import {
  listarHorariosDeInscripciones,
  listarInscripcionesEstudiante,
} from "../services/estudianteService.js";

export async function getPerfilEstudiante(
  req: Request,
  res: Response,
): Promise<void> {
  res.status(200).json({ perfil: req.usuarioPisu });
}

export async function getInscripciones(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const inscripciones = await listarInscripcionesEstudiante(perfil);
  res.status(200).json({ inscripciones });
}

export async function getHorariosEstudiante(
  req: Request,
  res: Response,
): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const horarios = await listarHorariosDeInscripciones(perfil);
  res.status(200).json({ horarios });
}
