import { fn, col, Op, type Includeable, type WhereOptions } from "sequelize";
import { Asistencia } from "../models/Asistencia.js";
import { AsistenciaDetalle } from "../models/AsistenciaDetalle.js";
import { Deporte } from "../models/Deporte.js";
import { HorarioDeporte } from "../models/HorarioDeporte.js";
import { InscripcionDeporte } from "../models/InscripcionDeporte.js";
import { UsuarioPisu } from "../models/UsuarioPisu.js";

export type InscritoRow = {
  id: string;
  estudiante_id: string;
  nombre: string;
  documento: string | null;
  correo: string | null;
  categoria: string | null;
  fecha_inscripcion: string;
  asistencias_total: number;
  asistencias_presentes: number;
  porcentaje_asistencia: number | null;
  inasistencias: number;
};

type Orden = "nombre" | "fecha" | "inasistencias";

export async function obtenerAsistenciaResumen(
  estudianteIds: string[],
  deporteId: string,
): Promise<Map<string, { total: number; presentes: number }>> {
  const resultado = new Map<string, { total: number; presentes: number }>();
  if (estudianteIds.length === 0) return resultado;

  const filas = await AsistenciaDetalle.findAll({
    attributes: [
      "estudiante_id",
      [fn("COUNT", col("AsistenciaDetalle.id")), "total"],
    ],
    include: [
      {
        model: Asistencia,
        as: "asistencia",
        attributes: [],
        required: true,
        include: [
          {
            model: HorarioDeporte,
            as: "horario",
            attributes: [],
            where: { deporte_id: deporteId },
            required: true,
          },
        ],
      },
    ],
    where: { estudiante_id: { [Op.in]: estudianteIds } },
    group: ["estudiante_id"],
    raw: true,
  }) as unknown as Array<{ estudiante_id: string; total: string }>;

  const presentesFilas = await AsistenciaDetalle.findAll({
    attributes: ["estudiante_id", [fn("COUNT", col("AsistenciaDetalle.id")), "presentes"]],
    include: [
      {
        model: Asistencia,
        as: "asistencia",
        attributes: [],
        required: true,
        include: [
          {
            model: HorarioDeporte,
            as: "horario",
            attributes: [],
            where: { deporte_id: deporteId },
            required: true,
          },
        ],
      },
    ],
    where: { estudiante_id: { [Op.in]: estudianteIds }, presente: true },
    group: ["estudiante_id"],
    raw: true,
  }) as unknown as Array<{ estudiante_id: string; presentes: string }>;

  const presentesMap = new Map(presentesFilas.map((f) => [f.estudiante_id, Number(f.presentes)]));
  for (const f of filas) {
    resultado.set(f.estudiante_id, {
      total: Number(f.total),
      presentes: presentesMap.get(f.estudiante_id) ?? 0,
    });
  }
  return resultado;
}

export async function listarInscritosDeporte(params: {
  deporteId: string;
  page: number;
  pageSize: number;
  q?: string;
  categoria?: string;
  orden?: Orden;
}): Promise<{ filas: InscritoRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, params.page);
  const pageSize = Math.min(100, Math.max(1, params.pageSize));
  const offset = (page - 1) * pageSize;

  const whereEstudiante: Record<string, unknown> = {};
  if (params.categoria) whereEstudiante.categoria = params.categoria;
  if (params.q?.trim()) {
    const q = `%${params.q.trim()}%`;
    Object.assign(whereEstudiante, {
      [Op.or]: [
        { nombre: { [Op.iLike]: q } },
        { documento: { [Op.iLike]: q } },
      ],
    });
  }

  let order: unknown = [["fecha_inscripcion", "ASC"]];
  if (params.orden === "nombre") {
    order = [["estudiante", "nombre", "ASC"]];
  } else if (params.orden === "fecha") {
    order = [["fecha_inscripcion", "DESC"]];
  }

  const { rows, count } = await InscripcionDeporte.findAndCountAll({
    where: { deporte_id: params.deporteId, estado: "Activa" },
    include: [
      {
        model: UsuarioPisu,
        as: "estudiante",
        attributes: ["id", "nombre", "documento", "correo", "categoria"],
        where: Object.keys(whereEstudiante).length ? (whereEstudiante as WhereOptions) : ({} as WhereOptions),
        required: true,
      },
    ],
    order: order as never,
    limit: pageSize,
    offset,
    distinct: true,
  });

  const estudianteIds = rows.map((r) => r.estudiante_id);
  const resumen = await obtenerAsistenciaResumen(estudianteIds, params.deporteId);

  const filas: InscritoRow[] = rows.map((r) => {
    const est = (r as { estudiante?: UsuarioPisu }).estudiante;
    const asist = resumen.get(r.estudiante_id) ?? { total: 0, presentes: 0 };
    const pct = asist.total > 0 ? Math.round((asist.presentes / asist.total) * 100) : null;
    return {
      id: r.id,
      estudiante_id: r.estudiante_id,
      nombre: est?.nombre ?? "Estudiante",
      documento: est?.documento ?? null,
      correo: est?.correo ?? null,
      categoria: est?.categoria ?? null,
      fecha_inscripcion: r.fecha_inscripcion ? new Date(r.fecha_inscripcion).toISOString() : "",
      asistencias_total: asist.total,
      asistencias_presentes: asist.presentes,
      porcentaje_asistencia: pct,
      inasistencias: asist.total - asist.presentes,
    };
  });

  // orden by inasistencias client-side if requested
  if (params.orden === "inasistencias") {
    filas.sort((a, b) => b.inasistencias - a.inasistencias);
  }

  return { filas, total: typeof count === "number" ? count : (count as unknown as { length: number }).length, page, pageSize };
}

export type InscripcionAgrupada = {
  deporte: { id: string; nombre: string; cupo_maximo: number; estado: boolean };
  total: number;
  inscritos: Array<Omit<InscritoRow, "id" | "estudiante_id">>;
};

type FilaInterna = {
  estudiante_id: string;
  fila: Omit<InscritoRow, "id" | "estudiante_id">;
};

export async function listarInscripcionesAgrupadas(params?: {
  q?: string;
  categoria?: string;
}): Promise<InscripcionAgrupada[]> {
  const whereEstudiante: Record<string, unknown> = {};
  if (params?.categoria) whereEstudiante.categoria = params.categoria;
  if (params?.q?.trim()) {
    const q = `%${params.q.trim()}%`;
    Object.assign(whereEstudiante, {
      [Op.or]: [
        { nombre: { [Op.iLike]: q } },
        { documento: { [Op.iLike]: q } },
      ],
    });
  }

  const inscripciones = await InscripcionDeporte.findAll({
    where: { estado: "Activa" },
    include: [
      {
        model: Deporte,
        as: "deporte",
        attributes: ["id", "nombre", "cupo_maximo", "estado"],
      },
      {
        model: UsuarioPisu,
        as: "estudiante",
        attributes: ["id", "nombre", "documento", "correo", "categoria"],
        where: Object.keys(whereEstudiante).length ? (whereEstudiante as WhereOptions) : ({} as WhereOptions),
        required: true,
      },
    ],
    order: [["fecha_inscripcion", "DESC"]],
  });

  const deportes = await Deporte.findAll({
    where: { estado: true },
    attributes: ["id", "nombre", "cupo_maximo", "estado"],
    order: [["nombre", "ASC"]],
  });

  const grupos = new Map<string, { deporte: InscripcionAgrupada["deporte"]; filas: FilaInterna[] }>();
  for (const d of deportes) {
    grupos.set(d.id, {
      deporte: {
        id: d.id,
        nombre: d.nombre,
        cupo_maximo: d.cupo_maximo,
        estado: d.estado,
      },
      filas: [],
    });
  }

  for (const ins of inscripciones) {
    const grupo = grupos.get(ins.deporte_id);
    const est = (ins as { estudiante?: UsuarioPisu }).estudiante;
    if (!grupo || !est) continue;
    grupo.filas.push({
      estudiante_id: ins.estudiante_id,
      fila: {
        nombre: est.nombre,
        documento: est.documento ?? null,
        correo: est.correo ?? null,
        categoria: est.categoria ?? null,
        fecha_inscripcion: ins.fecha_inscripcion ? new Date(ins.fecha_inscripcion).toISOString() : "",
        asistencias_total: 0,
        asistencias_presentes: 0,
        porcentaje_asistencia: null,
        inasistencias: 0,
      },
    });
  }

  const resultado: InscripcionAgrupada[] = [];
  for (const grupo of grupos.values()) {
    grupo.filas.sort((a, b) => a.fila.nombre.localeCompare(b.fila.nombre, "es"));
    const resumen = await obtenerAsistenciaResumen(grupo.filas.map((f) => f.estudiante_id), grupo.deporte.id);
    resultado.push({
      deporte: grupo.deporte,
      total: grupo.filas.length,
      inscritos: grupo.filas.map(({ estudiante_id, fila }) => {
        const asist = resumen.get(estudiante_id) ?? { total: 0, presentes: 0 };
        const pct = asist.total > 0 ? Math.round((asist.presentes / asist.total) * 100) : null;
        return {
          ...fila,
          asistencias_total: asist.total,
          asistencias_presentes: asist.presentes,
          porcentaje_asistencia: pct,
          inasistencias: asist.total - asist.presentes,
        };
      }),
    });
  }
  return resultado;
}

export async function listarEstudiantesGeneral(params: {
  deporteId?: string;
  categoria?: string;
  sinInscripcion?: boolean;
  q?: string;
}): Promise<UsuarioPisu[]> {
  const where: Record<string, unknown> = { rol: "Estudiante" };
  if (params.categoria) where.categoria = params.categoria;
  if (params.q?.trim()) {
    const q = `%${params.q.trim()}%`;
    Object.assign(where, {
      [Op.or]: [
        { nombre: { [Op.iLike]: q } },
        { documento: { [Op.iLike]: q } },
      ],
    });
  }

  const include: Includeable[] = [
    {
      model: InscripcionDeporte,
      as: "inscripciones",
      where: { estado: "Activa" },
      required: false,
      include: [{ model: Deporte, as: "deporte", attributes: ["id", "nombre"] }],
    },
  ];

  const estudiantes = await UsuarioPisu.findAll({
    where,
    include,
    order: [["nombre", "ASC"]],
  });

  if (params.deporteId) {
    return estudiantes.filter((e) =>
      (e.get("inscripciones") as Array<{ deporte_id: string }> | undefined)?.some(
        (i) => i.deporte_id === params.deporteId,
      ),
    );
  }
  if (params.sinInscripcion) {
    return estudiantes.filter(
      (e) =>
        !((e.get("inscripciones") as unknown[] | undefined)?.length),
    );
  }
  return estudiantes;
}

export async function listarInscripcionesCompletas(estudianteId: string): Promise<
  Array<{
    inscripcion_id: string;
    fecha_inscripcion: string;
    deporte: { id: string; nombre: string } | null;
    horarios: Array<{ dia_semana: number; hora_inicio: string; hora_fin: string; lugar: string; docente: { nombre: string } | null }>;
    asistencia: { total: number; presentes: number; porcentaje: number | null; inasistencias: number };
  }>
> {
  const inscripciones = await InscripcionDeporte.findAll({
    where: { estudiante_id: estudianteId, estado: "Activa" },
    include: [
      { model: Deporte, as: "deporte", attributes: ["id", "nombre"] },
    ],
    order: [["fecha_inscripcion", "DESC"]],
  });

  const resultado = [];
  for (const ins of inscripciones) {
    const deporteId = ins.deporte_id;
    const horarios = await HorarioDeporte.findAll({
      where: { deporte_id: deporteId, estado: true },
      include: [{ model: UsuarioPisu, as: "docente", attributes: ["id", "nombre"] }],
      order: [["dia_semana", "ASC"], ["hora_inicio", "ASC"]],
    });
    const resumen = await obtenerAsistenciaResumen([estudianteId], deporteId);
    const asist = resumen.get(estudianteId) ?? { total: 0, presentes: 0 };
    resultado.push({
      inscripcion_id: ins.id,
      fecha_inscripcion: ins.fecha_inscripcion ? new Date(ins.fecha_inscripcion).toISOString() : "",
      deporte: (ins as { deporte?: { id: string; nombre: string } }).deporte ?? null,
      horarios: horarios.map((h) => ({
        dia_semana: h.dia_semana,
        hora_inicio: String(h.hora_inicio),
        hora_fin: String(h.hora_fin),
        lugar: h.lugar,
        docente: (h as { docente?: { nombre: string } }).docente ?? null,
      })),
      asistencia: {
        total: asist.total,
        presentes: asist.presentes,
        porcentaje: asist.total > 0 ? Math.round((asist.presentes / asist.total) * 100) : null,
        inasistencias: asist.total - asist.presentes,
      },
    });
  }
  return resultado;
}