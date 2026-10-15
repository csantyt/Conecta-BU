import { Op, type InferAttributes } from "sequelize";
import { Alerta } from "../models/Alerta.js";
import { Deporte } from "../models/Deporte.js";
import { HorarioDeporte } from "../models/HorarioDeporte.js";
import { InscripcionDeporte } from "../models/InscripcionDeporte.js";
import { UsuarioPisu } from "../models/UsuarioPisu.js";
import type { UsuarioPisuSesion } from "../middlewares/tipos.js";

export type DeporteCatalogo = InferAttributes<Deporte> & {
  cupo_disponible: number;
  inscrito: boolean;
  inscripcion_id: string | null;
  horarios: HorarioDeporte[];
};

export type FiltrosDeportes = {
  nombre?: string | undefined;
  dia?: number | string | undefined;
};

export async function listarDeportesActivos(
  perfil?: UsuarioPisuSesion,
  filtros?: FiltrosDeportes,
): Promise<DeporteCatalogo[]> {
  const where: Record<string, unknown> = { estado: true };
  if (filtros?.nombre && String(filtros.nombre).trim().length > 0) {
    where["nombre"] = { [Op.iLike]: `%${String(filtros.nombre).trim()}%` };
  }

  const deportes = await Deporte.findAll({
    where,
    order: [["nombre", "ASC"]],
  });

  const diaFiltro =
    filtros?.dia === undefined || filtros?.dia === null || filtros?.dia === ""
      ? null
      : Number(filtros.dia);

  const ids = deportes.map((item) => item.id);
  const [ocupadas, mias, horarios] = await Promise.all([
    ids.length === 0
      ? Promise.resolve([])
      : InscripcionDeporte.findAll({
          where: { deporte_id: { [Op.in]: ids }, estado: "Activa" },
          attributes: ["deporte_id"],
        }),
    perfil
      ? InscripcionDeporte.findAll({
          where: { estudiante_id: perfil.id, estado: "Activa" },
          attributes: ["deporte_id", "id"],
        })
      : Promise.resolve([]),
    ids.length === 0
      ? Promise.resolve([])
      : HorarioDeporte.findAll({
          where: { deporte_id: { [Op.in]: ids }, estado: true },
          include: [{ model: UsuarioPisu, as: "docente", attributes: ["id", "nombre"] }],
          order: [
            ["dia_semana", "ASC"],
            ["hora_inicio", "ASC"],
          ],
        }),
  ]);

  const conteo = new Map<string, number>();
  for (const fila of ocupadas) {
    conteo.set(fila.deporte_id, (conteo.get(fila.deporte_id) ?? 0) + 1);
  }
  const inscritoEn = new Map(mias.map((item) => [item.deporte_id, item.id]));

  const deportesPermitidos = deportes.filter((deporte) => {
    if (perfil?.rol === "Estudiante" && perfil.categoria) {
      const categorias = deporte.categorias_permitidas ?? [];
      if (!categorias.includes(perfil.categoria)) {
        return false;
      }
    }
    const horariosDeporte = horarios.filter(
      (item) => item.deporte_id === deporte.id && item.estado !== false,
    );
    if (diaFiltro !== null && !Number.isNaN(diaFiltro)) {
      return horariosDeporte.some((item) => item.dia_semana === diaFiltro);
    }
    return true;
  });

  return deportesPermitidos.map((deporte) => {
    const usados = conteo.get(deporte.id) ?? 0;
    const horariosDeporte = horarios.filter(
      (item) => item.deporte_id === deporte.id,
    );
    const deporteJson = deporte.toJSON() as Record<string, unknown>;
    return {
      ...deporteJson,
      imagenUrl: null, //,
      cupo_disponible: Math.max(0, deporte.cupo_maximo - usados),
      cuposDisponibles: Math.max(0, deporte.cupo_maximo - usados),
      inscrito: inscritoEn.has(deporte.id),
      yaInscrito: inscritoEn.has(deporte.id),
      inscripcion_id: inscritoEn.get(deporte.id) ?? null,
      horarios: horariosDeporte,
    };
  }) as unknown as DeporteCatalogo[];
}

export async function listarCompanerosDeporte(
  perfil: UsuarioPisuSesion,
  deporteId: string,
): Promise<{
  deporte: { id: string; nombre: string; cupo_maximo: number };
  companeros: Array<{ nombre: string; categoria: string | null }>;
  cuposLibres: number;
  cupoTotal: number;
  ocupados: number;
}> {
  if (perfil.rol !== "Estudiante") {
    throw new Error("Los compañeros solo están disponibles para estudiantes.");
  }

  const propia = await InscripcionDeporte.findOne({
    where: { estudiante_id: perfil.id, deporte_id: deporteId, estado: "Activa" },
  });
  if (!propia) {
    throw new Error("No estás inscrito en este deporte.");
  }

  const deporte = await Deporte.findByPk(deporteId);
  if (!deporte) {
    throw new Error("El deporte no existe.");
  }

  const inscripciones = await InscripcionDeporte.findAll({
    where: { deporte_id: deporteId, estado: "Activa" },
    include: [
      { model: UsuarioPisu, as: "estudiante", attributes: ["nombre", "categoria"] },
    ],
  });

  const companeros = inscripciones.map((item) => {
    const estudiante = item.get("estudiante") as UsuarioPisu | undefined;
    return {
      nombre: estudiante?.nombre ?? "Estudiante",
      categoria: estudiante?.categoria ?? null,
    };
  });

  const ocupados = inscripciones.length;
  const cuposLibres = Math.max(0, deporte.cupo_maximo - ocupados);
  return {
    deporte: { id: deporte.id, nombre: deporte.nombre, cupo_maximo: deporte.cupo_maximo },
    companeros,
    cuposLibres,
    cupoTotal: deporte.cupo_maximo,
    ocupados,
  };
}

export async function listarAlertasPara(perfil: UsuarioPisuSesion) {
  if (perfil.rol === "Administrador") {
    return Alerta.findAll({ order: [["fecha_creacion", "DESC"]] });
  }

  const audiencias =
    perfil.rol === "Docente" ? ["Todos", "Docentes"] : ["Todos", "Estudiantes"];
  const destinatario =
    perfil.rol === "Estudiante"
      ? { [Op.or]: [{ estudiante_id: null }, { estudiante_id: perfil.id }] }
      : { estudiante_id: null };

  return Alerta.findAll({
    where: { audiencia: { [Op.in]: audiencias }, ...destinatario },
    order: [["fecha_creacion", "DESC"]],
  });
}
