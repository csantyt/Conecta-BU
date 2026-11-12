import type { Request, Response } from "express";
import {
  InscripcionDeporte,
  HorarioDeporte,
  UsuarioPisu,
} from "../models/index.js";
import {
  listarInscritosDeporte,
  listarEstudiantesGeneral,
  listarInscripcionesCompletas,
  obtenerAsistenciaResumen,
} from "../services/inscritosService.js";
import { RecursoAdminNoEncontradoError } from "../services/adminService.js";

function idRuta(req: Request, nombre: string): string | null {
  const valor = req.params[nombre];
  return Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null);
}

function numQuery(req: Request, key: string, def: number): number {
  const v = req.query[key];
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) ? n : def;
}

export async function getInscritosDeporte(req: Request, res: Response): Promise<void> {
  const deporteId = idRuta(req, "id");
  if (!deporteId) {
    res.status(400).json({ message: "Identificador de deporte inválido." });
    return;
  }
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }

  // Permission checks
  if (perfil.rol === "Estudiante") {
    const own = await InscripcionDeporte.findOne({
      where: { estudiante_id: perfil.id, deporte_id: deporteId, estado: "Activa" },
    });
    if (!own) {
      res.status(403).json({ message: "Sin acceso a este grupo." });
      return;
    }
  } else if (perfil.rol === "Docente") {
    const own = await HorarioDeporte.findOne({
      where: { docente_id: perfil.id, deporte_id: deporteId, estado: true },
    });
    if (!own) {
      res.status(403).json({ message: "Sin acceso a este grupo." });
      return;
    }
  } else if (perfil.rol !== "Administrador") {
    res.status(403).json({ message: "Sin acceso." });
    return;
  }

  const q = typeof req.query.q === "string" ? req.query.q : "";
  const categoria = typeof req.query.categoria === "string" ? req.query.categoria : "";
  const ordenRaw = typeof req.query.orden === "string" ? req.query.orden : "nombre";
  const orden = (["nombre", "fecha", "inasistencias"].includes(ordenRaw) ? ordenRaw : "nombre") as
    | "nombre"
    | "fecha"
    | "inasistencias";
  const page = numQuery(req, "page", 1);
  const pageSize = numQuery(req, "pageSize", 20);

  const resultado = await listarInscritosDeporte({
    deporteId,
    page,
    pageSize,
    q,
    categoria,
    orden,
  });

  // student reduced payload
  if (perfil.rol === "Estudiante") {
    res.status(200).json({
      ...resultado,
      filas: resultado.filas.map((f) => ({ nombre: f.nombre, categoria: f.categoria })),
      reducido: true,
    });
    return;
  }

  res.status(200).json(resultado);
}

export async function getEstudiantesGeneral(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil || perfil.rol !== "Administrador") {
    res.status(403).json({ message: "Sin acceso." });
    return;
  }
  const params: { deporteId?: string; categoria?: string; sinInscripcion?: boolean; q?: string } = {};
  if (typeof req.query.deporteId === "string") params.deporteId = req.query.deporteId;
  if (typeof req.query.categoria === "string") params.categoria = req.query.categoria;
  if (req.query.sinInscripcion === "true") params.sinInscripcion = true;
  if (typeof req.query.q === "string") params.q = req.query.q;
  const estudiantes = await listarEstudiantesGeneral(params);
  res.status(200).json({ estudiantes });
}

export async function getMisInscripcionesCompletas(req: Request, res: Response): Promise<void> {
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  const inscripciones = await listarInscripcionesCompletas(perfil.id);
  res.status(200).json({ inscripciones });
}

export async function getInscripcionesEstudiante(req: Request, res: Response): Promise<void> {
  const id = idRuta(req, "id");
  if (!id) {
    res.status(400).json({ message: "Identificador de estudiante inválido." });
    return;
  }
  const perfil = req.usuarioPisu;
  if (!perfil) {
    res.status(401).json({ message: "No autenticado." });
    return;
  }
  if (perfil.rol !== "Administrador" && perfil.id !== id) {
    res.status(403).json({ message: "Sin acceso." });
    return;
  }
  const inscripciones = await listarInscripcionesCompletas(id);
  res.status(200).json({ inscripciones });
}