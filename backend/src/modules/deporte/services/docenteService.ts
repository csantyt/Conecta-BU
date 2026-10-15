/**
 * Servicio del rol Docente del módulo Deporte PISU.
 *
 * ¿Para qué sirve?
 * Contiene TODA la lógica de negocio del docente: qué deportes ve, las clases
 * de hoy, la toma de asistencia (con ventana horaria), el historial, los
 * estudiantes por deporte y el reporte final (incluida la base del Excel).
 *
 * ¿Cómo se relaciona con los demás?
 * - Usa los modelos Sequelize del módulo (`HorarioDeporte`, `Deporte`,
 *   `InscripcionDeporte`, `Asistencia`, `UsuarioPisu`).
 * - Reutiliza `utils/asistencia.ts` para la ventana horaria y la aprobación.
 * - Lo consume `docenteController.ts`, que traduce los errores a códigos HTTP.
 */

import { Op, UniqueConstraintError, fn, col, literal } from "sequelize";
import { sequelize } from "../../../config/database.js";
import type { UsuarioPisuSesion } from "../middlewares/tipos.js";
import {
  Asistencia,
  Deporte,
  DeporteDocente,
  HorarioDeporte,
  InscripcionDeporte,
  UsuarioPisu,
} from "../models/index.js";
import { generarAlertasInasistencia } from "./alertasService.js";
import {
  DIAS_SEMANA,
  aprobacionMinima,
  calcularFilaReporte,
  clasificarAsistencia,
  dentroPlazoEdicion,
  evaluarVentanaAsistencia,
  fechaLarga,
  ignorarHorario,
  semestreFinalizado,
  type EstadoAsistencia,
  type FilaReporte,
} from "../utils/asistencia.js";

// ============================ Errores ============================

export class RecursoDocenteNoEncontradoError extends Error {}
export class ClaseNoAsignadaError extends Error {}
export class VentanaAsistenciaCerradaError extends Error {}
export class EstudianteNoInscritoError extends Error {}
export class DatosAsistenciaInvalidosError extends Error {}
/** La asistencia se intentó guardar fuera de la ventana horaria (422). */
export class FueraDeVentanaAsistenciaError extends Error {}
/** Ya existe una asistencia para ese horario y fecha (409). */
export class AsistenciaDuplicadaError extends Error {}
/** Se intentó editar una asistencia después del plazo de 24 h (422). */
export class EdicionFueraDePlazoError extends Error {}

// ============================ Helpers ============================

function horaCorta(valor: string): string {
  return String(valor).slice(0, 5);
}

function proximaFecha(diaSemana: number, ahora: Date): Date {
  const fecha = new Date(ahora);
  fecha.setHours(0, 0, 0, 0);
  const delta = (diaSemana - fecha.getDay() + 7) % 7;
  fecha.setDate(fecha.getDate() + delta);
  return fecha;
}

export type EstadoHorario = {
  es_hoy: boolean;
  en_curso: boolean;
  finalizada: boolean;
  etiqueta: string;
  detalle: string;
};

/**
 * Describe en lenguaje claro el estado de un horario respecto a "ahora".
 * Se usa tanto en "Mis deportes" como en "Clases de hoy" y la vista semanal.
 */
export function estadoDeHorario(
  params: {
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
  },
  ahora: Date = new Date(),
): EstadoHorario {
  const esHoy = params.dia_semana === ahora.getDay();
  if (!esHoy) {
    const proxima = proximaFecha(params.dia_semana, ahora);
    return {
      es_hoy: false,
      en_curso: false,
      finalizada: false,
      etiqueta: "Próxima",
      detalle: `Próxima clase: ${proxima.toLocaleDateString("es-CO", {
        weekday: "long",
        day: "numeric",
        month: "long",
      })}`,
    };
  }

  const [hI, mI] = horaCorta(params.hora_inicio).split(":").map(Number);
  const [hF, mF] = horaCorta(params.hora_fin).split(":").map(Number);
  const inicio = new Date(ahora);
  inicio.setHours(hI ?? 0, mI ?? 0, 0, 0);
  const fin = new Date(ahora);
  fin.setHours(hF ?? 0, mF ?? 0, 0, 0);

  if (ahora.getTime() < inicio.getTime()) {
    const minutos = Math.max(0, Math.round((inicio.getTime() - ahora.getTime()) / 60_000));
    return {
      es_hoy: true,
      en_curso: false,
      finalizada: false,
      etiqueta: "Hoy",
      detalle: `Comienza en ${minutos} min (${horaCorta(params.hora_inicio)})`,
    };
  }
  if (ahora.getTime() >= inicio.getTime() && ahora.getTime() <= fin.getTime()) {
    const minutos = Math.max(0, Math.round((fin.getTime() - ahora.getTime()) / 60_000));
    return {
      es_hoy: true,
      en_curso: true,
      finalizada: false,
      etiqueta: "En curso",
      detalle: `Termina en ${minutos} min`,
    };
  }
  return {
    es_hoy: true,
    en_curso: false,
    finalizada: true,
    etiqueta: "Finalizada",
    detalle: "Clase finalizada hoy",
  };
}

function hoyISO(ahora: Date = new Date()): string {
  const y = ahora.getFullYear();
  const m = String(ahora.getMonth() + 1).padStart(2, "0");
  const d = String(ahora.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ============================ Mis clases (compat) ============================

export async function listarMisClases(perfil: UsuarioPisuSesion) {
  return HorarioDeporte.findAll({
    where: { docente_id: perfil.id, estado: true },
    include: [{ association: "deporte" }],
    order: [
      ["dia_semana", "ASC"],
      ["hora_inicio", "ASC"],
    ],
  });
}

export async function asegurarClaseDelDocente(params: {
  perfil: UsuarioPisuSesion;
  horarioId: string;
}): Promise<HorarioDeporte> {
  const horario = await HorarioDeporte.findByPk(params.horarioId, {
    include: [{ association: "deporte" }],
  });

  if (!horario) {
    throw new RecursoDocenteNoEncontradoError("La clase no existe.");
  }

  if (horario.docente_id !== params.perfil.id) {
    throw new ClaseNoAsignadaError(
      "No puedes gestionar una clase que no te está asignada (RN-004).",
    );
  }

  return horario;
}

/**
 * Verifica que el docente tenga acceso al deporte: por un horario propio
 * (`deporte.horarios`) o por una asignación directa del administrador
 * (`deporte.deportes_docentes`).
 * @throws RecursoDocenteNoEncontradoError si el deporte no existe.
 * @throws ClaseNoAsignadaError si el deporte no es del docente (→ 403).
 */
export async function asegurarDeporteDelDocente(params: {
  perfil: UsuarioPisuSesion;
  deporteId: string;
}): Promise<Deporte> {
  const deporte = await Deporte.findByPk(params.deporteId);
  if (!deporte) {
    throw new RecursoDocenteNoEncontradoError("El deporte no existe.");
  }
  const [horario, asignacion] = await Promise.all([
    HorarioDeporte.findOne({
      where: { deporte_id: params.deporteId, docente_id: params.perfil.id },
      attributes: ["id"],
    }),
    DeporteDocente.findOne({
      where: { deporte_id: params.deporteId, docente_id: params.perfil.id },
      attributes: ["id"],
    }),
  ]);
  if (!horario && !asignacion) {
    throw new ClaseNoAsignadaError(
      "No puedes gestionar un deporte que no te está asignado (RN-004).",
    );
  }
  return deporte;
}

// ============================ Mis deportes ============================

export type HorarioResumen = {
  id: string;
  dia_semana: number;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  estado: boolean;
  describe: EstadoHorario;
};

export type MiDeporte = {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  cupo_maximo: number;
  categorias_permitidas: string[];
  inscritos: number;
  cupos_disponibles: number;
  porcentaje_asistencia: number | null;
  clases_hoy: number;
  horarios: HorarioResumen[];
};

/**
 * Lista los deportes que el docente puede gestionar: los que tiene por horario
 * y los asignados directamente por el administrador. Incluye métricas.
 * Usa consultas agrupadas: 1 para horarios, 1 para asignaciones, 1 para
 * inscritos y 2 para asistencia.
 */
export async function listarMisDeportes(
  perfil: UsuarioPisuSesion,
  ahora: Date = new Date(),
): Promise<MiDeporte[]> {
  const [horarios, asignados] = await Promise.all([
    HorarioDeporte.findAll({
      where: { docente_id: perfil.id, estado: true },
      include: [{ model: Deporte, as: "deporte" }],
      order: [
        ["dia_semana", "ASC"],
        ["hora_inicio", "ASC"],
      ],
    }),
    DeporteDocente.findAll({
      where: { docente_id: perfil.id },
      include: [{ model: Deporte, as: "deporte" }],
    }),
  ]);

  const deportes = new Map<string, Deporte>();
  for (const horario of horarios) {
    const deporte = (horario as { deporte?: Deporte }).deporte;
    if (deporte && !deportes.has(deporte.id)) {
      deportes.set(deporte.id, deporte);
    }
  }
  for (const asignacion of asignados) {
    const deporte = (asignacion as { deporte?: Deporte }).deporte;
    if (deporte && !deportes.has(deporte.id)) {
      deportes.set(deporte.id, deporte);
    }
  }
  const ids = [...deportes.keys()];
  if (ids.length === 0) {
    return [];
  }

  const [inscritosFilas, asistenciaTotales, asistenciaPresentes] = await Promise.all([
    InscripcionDeporte.findAll({
      attributes: ["deporte_id", [fn("COUNT", col("id")), "total"]],
      where: { deporte_id: { [Op.in]: ids }, estado: "Activa" },
      group: ["deporte_id"],
      raw: true,
    }) as unknown as Promise<Array<{ deporte_id: string; total: string }>>,
    Asistencia.findAll({
      attributes: [
        [col("horario.deporte_id"), "deporte_id"],
        [fn("COUNT", col("Asistencia.id")), "total"],
      ],
      include: [
        {
          model: HorarioDeporte,
          as: "horario",
          attributes: [],
          where: { docente_id: perfil.id },
          required: true,
        },
      ],
      group: [col("horario.deporte_id")],
      raw: true,
    }) as unknown as Promise<Array<{ deporte_id: string; total: string }>>,
    Asistencia.findAll({
      attributes: [
        [col("horario.deporte_id"), "deporte_id"],
        [fn("COUNT", col("Asistencia.id")), "presentes"],
      ],
      include: [
        {
          model: HorarioDeporte,
          as: "horario",
          attributes: [],
          where: { docente_id: perfil.id },
          required: true,
        },
      ],
      where: { presente: true },
      group: [col("horario.deporte_id")],
      raw: true,
    }) as unknown as Promise<Array<{ deporte_id: string; presentes: string }>>,
  ]);

  const inscritosMap = new Map(inscritosFilas.map((f) => [f.deporte_id, Number(f.total)]));
  const totalMap = new Map(asistenciaTotales.map((f) => [f.deporte_id, Number(f.total)]));
  const presentesMap = new Map(asistenciaPresentes.map((f) => [f.deporte_id, Number(f.presentes)]));

  return ids.map((id) => {
    const deporte = deportes.get(id)!;
    const delDeporte = horarios.filter((h) => h.deporte_id === id);
    const inscritos = inscritosMap.get(id) ?? 0;
    const total = totalMap.get(id) ?? 0;
    const presentes = presentesMap.get(id) ?? 0;
    return {
      id: deporte.id,
      nombre: deporte.nombre,
      descripcion: deporte.descripcion ?? null,
      imagen_url: deporte.imagen_url ?? null,
      cupo_maximo: deporte.cupo_maximo,
      categorias_permitidas: deporte.categorias_permitidas ?? [],
      inscritos,
      cupos_disponibles: Math.max(0, deporte.cupo_maximo - inscritos),
      porcentaje_asistencia: total > 0 ? Math.round((presentes / total) * 100) : null,
      clases_hoy: delDeporte.filter((h) => h.dia_semana === ahora.getDay()).length,
      horarios: delDeporte.map((h) => ({
        id: h.id,
        dia_semana: h.dia_semana,
        dia: DIAS_SEMANA[h.dia_semana] ?? "Día",
        hora_inicio: String(h.hora_inicio),
        hora_fin: String(h.hora_fin),
        lugar: h.lugar,
        estado: h.estado,
        describe: estadoDeHorario(
          { dia_semana: h.dia_semana, hora_inicio: String(h.hora_inicio), hora_fin: String(h.hora_fin) },
          ahora,
        ),
      })),
    };
  });
}

// ============================ Clases de hoy ============================

export type ClaseHoy = {
  horario_id: string;
  deporte: { id: string; nombre: string };
  dia_semana: number;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  fecha: string;
  inscritos: number;
  estado: "Por comenzar" | "En curso" | "Finalizada";
  asistencia_registrada: boolean;
  puede_tomar: boolean;
  motivo_no_puede: string | null;
};

export async function listarClasesHoy(
  perfil: UsuarioPisuSesion,
  ahora: Date = new Date(),
): Promise<ClaseHoy[]> {
  const fecha = hoyISO(ahora);
  const horarios = await HorarioDeporte.findAll({
    where: { docente_id: perfil.id, estado: true, dia_semana: ahora.getDay() },
    include: [{ model: Deporte, as: "deporte", attributes: ["id", "nombre"] }],
    order: [["hora_inicio", "ASC"]],
  });
  if (horarios.length === 0) {
    return [];
  }
  const ids = horarios.map((h) => h.id);

  const [inscritosFilas, registradas] = await Promise.all([
    InscripcionDeporte.findAll({
      attributes: [
        [col("deporte.id"), "deporte_id"],
        [fn("COUNT", col("InscripcionDeporte.id")), "total"],
      ],
      include: [
        {
          model: Deporte,
          as: "deporte",
          attributes: [],
          where: { id: { [Op.in]: horarios.map((h) => h.deporte_id) } },
          required: true,
        },
      ],
      where: { estado: "Activa" },
      group: [col("deporte.id")],
      raw: true,
    }) as unknown as Promise<Array<{ deporte_id: string; total: string }>>,
    Asistencia.findAll({
      attributes: ["horario_id"],
      where: { horario_id: { [Op.in]: ids }, fecha },
      group: ["horario_id"],
      raw: true,
    }) as unknown as Promise<Array<{ horario_id: string }>>,
  ]);

  const inscritosMap = new Map(inscritosFilas.map((f) => [f.deporte_id, Number(f.total)]));
  const registradasSet = new Set(registradas.map((f) => f.horario_id));

  return horarios.map((h) => {
    const deporte = (h as { deporte?: Deporte }).deporte;
    const desc = estadoDeHorario(
      { dia_semana: h.dia_semana, hora_inicio: String(h.hora_inicio), hora_fin: String(h.hora_fin) },
      ahora,
    );
    const estado: ClaseHoy["estado"] = desc.en_curso
      ? "En curso"
      : desc.finalizada
        ? "Finalizada"
        : "Por comenzar";
    const ventana = evaluarVentanaAsistencia({
      diaSemana: h.dia_semana,
      horaInicio: String(h.hora_inicio),
      horaFin: String(h.hora_fin),
      fecha,
      ahora,
    });
    const yaRegistrada = registradasSet.has(h.id);
    const puedeTomar = !yaRegistrada && ventana.abierta;
    let motivo: string | null = null;
    if (yaRegistrada) {
      motivo = "La asistencia de esta clase ya fue registrada. Puedes editarla dentro de las 24 horas.";
    } else if (!ventana.abierta) {
      motivo = ventana.motivo;
    }
    return {
      horario_id: h.id,
      deporte: { id: deporte?.id ?? h.deporte_id, nombre: deporte?.nombre ?? "Deporte" },
      dia_semana: h.dia_semana,
      dia: DIAS_SEMANA[h.dia_semana] ?? "Día",
      hora_inicio: String(h.hora_inicio),
      hora_fin: String(h.hora_fin),
      lugar: h.lugar,
      fecha,
      inscritos: inscritosMap.get(h.deporte_id) ?? 0,
      estado,
      asistencia_registrada: yaRegistrada,
      puede_tomar: puedeTomar,
      motivo_no_puede: motivo,
    };
  });
}

// ============================ Estudiantes de clase / lista ============================

export type EstudianteDeClase = {
  inscripcion_id: string;
  estudiante: {
    id: string;
    nombre: string;
    correo: string;
    categoria: string | null;
    rol: string;
    estado: boolean;
  } | null;
};

export async function listarEstudiantesDeClase(params: {
  perfil: UsuarioPisuSesion;
  horarioId: string;
}): Promise<{ horario: HorarioDeporte; estudiantes: EstudianteDeClase[] }> {
  const horario = await asegurarClaseDelDocente(params);

  const inscripciones = await InscripcionDeporte.findAll({
    where: { deporte_id: horario.deporte_id, estado: "Activa" },
    include: [
      {
        model: UsuarioPisu,
        as: "estudiante",
        attributes: ["id", "nombre", "correo", "categoria", "rol", "estado"],
      },
    ],
    order: [["fecha_inscripcion", "ASC"]],
  });

  const estudiantes: EstudianteDeClase[] = inscripciones.map((item) => {
    const estudiante = item.get("estudiante") as UsuarioPisu | undefined;
    return {
      inscripcion_id: item.id,
      estudiante: estudiante
        ? {
            id: estudiante.id,
            nombre: estudiante.nombre,
            correo: estudiante.correo,
            categoria: estudiante.categoria,
            rol: estudiante.rol,
            estado: estudiante.estado,
          }
        : null,
    };
  });

  return { horario, estudiantes };
}

export type FilaLista = {
  estudiante_id: string;
  nombre: string;
  documento: string | null;
  correo: string | null;
  categoria: string | null;
  asistencia_id: string | null;
  presente: boolean | null;
  presentes: number;
  faltas: number;
  dictadas: number;
  porcentaje: number;
  estado: EstadoAsistencia;
};

export type SesionLista = {
  horario: {
    id: string;
    deporte_id: string;
    deporte: string;
    dia_semana: number;
    dia: string;
    hora_inicio: string;
    hora_fin: string;
    lugar: string;
  };
  fecha: string;
  ventana: { abierta: boolean; motivo: string | null; desde: string; hasta: string };
  ignorar_horario: boolean;
  ya_registrada: boolean;
  editable: boolean;
  resumen: { presentes: number; ausentes: number; total: number };
  estudiantes: FilaLista[];
};

/** Número de clases dictadas de un deporte = sesiones con asistencia registrada. */
async function contarClasesDictadas(deporteId: string): Promise<number> {
  const filas = (await Asistencia.findAll({
    attributes: ["horario_id", "fecha"],
    include: [
      {
        model: HorarioDeporte,
        as: "horario",
        attributes: [],
        where: { deporte_id: deporteId },
        required: true,
      },
    ],
    group: ["horario_id", "fecha"],
    raw: true,
  })) as unknown as Array<{ horario_id: string; fecha: string }>;
  return filas.length;
}

/**
 * Datos completos para la pantalla "Llamar a lista".
 * Devuelve los estudiantes con inscripción activa, la ventana horaria y el
 * estado de la asistencia de esa fecha (si ya existe o no).
 */
export async function obtenerSesionLista(params: {
  perfil: UsuarioPisuSesion;
  horarioId: string;
  fecha: string;
  ahora?: Date;
}): Promise<SesionLista> {
  const ahora = params.ahora ?? new Date();
  const horario = await asegurarClaseDelDocente({
    perfil: params.perfil,
    horarioId: params.horarioId,
  });
  const deporte = await Deporte.findByPk(horario.deporte_id, {
    attributes: ["id", "nombre"],
  });

  const inscripciones = await InscripcionDeporte.findAll({
    where: { deporte_id: horario.deporte_id, estado: "Activa" },
    include: [
      {
        model: UsuarioPisu,
        as: "estudiante",
        attributes: ["id", "nombre", "documento", "correo", "categoria"],
      },
    ],
    order: [[{ model: UsuarioPisu, as: "estudiante" }, "nombre", "ASC"]],
  });

  const existentes = await Asistencia.findAll({
    where: { horario_id: horario.id, fecha: params.fecha },
  });
  const porEstudiante = new Map(existentes.map((a) => [a.estudiante_id, a]));

  const dictadas = await contarClasesDictadas(horario.deporte_id);
  const presentesFilas = (await Asistencia.findAll({
    attributes: ["estudiante_id", [fn("COUNT", col("Asistencia.id")), "presentes"]],
    include: [
      {
        model: HorarioDeporte,
        as: "horario",
        attributes: [],
        where: { deporte_id: horario.deporte_id },
        required: true,
      },
    ],
    where: { presente: true },
    group: ["estudiante_id"],
    raw: true,
  })) as unknown as Array<{ estudiante_id: string; presentes: string }>;
  const presentesMap = new Map(presentesFilas.map((f) => [f.estudiante_id, Number(f.presentes)]));

  const estudiantes: FilaLista[] = inscripciones.map((ins) => {
    const est = ins.get("estudiante") as UsuarioPisu | undefined;
    const previa = porEstudiante.get(ins.estudiante_id);
    const presentes = presentesMap.get(ins.estudiante_id) ?? 0;
    return {
      estudiante_id: ins.estudiante_id,
      nombre: est?.nombre ?? "Estudiante",
      documento: est?.documento ?? null,
      correo: est?.correo ?? null,
      categoria: est?.categoria ?? null,
      asistencia_id: previa?.id ?? null,
      presente: previa ? previa.presente : null,
      presentes,
      faltas: Math.max(0, dictadas - presentes),
      dictadas,
      porcentaje: dictadas > 0 ? Math.round((presentes / dictadas) * 100) : 0,
      estado: clasificarAsistencia({ presentes, dictadas }),
    };
  });

  const ventana = evaluarVentanaAsistencia({
    diaSemana: horario.dia_semana,
    horaInicio: String(horario.hora_inicio),
    horaFin: String(horario.hora_fin),
    fecha: params.fecha,
    ahora,
  });

  return {
    horario: {
      id: horario.id,
      deporte_id: horario.deporte_id,
      deporte: deporte?.nombre ?? "Deporte",
      dia_semana: horario.dia_semana,
      dia: DIAS_SEMANA[horario.dia_semana] ?? "Día",
      hora_inicio: String(horario.hora_inicio),
      hora_fin: String(horario.hora_fin),
      lugar: horario.lugar,
    },
    fecha: params.fecha,
    ventana: {
      abierta: ventana.abierta,
      motivo: ventana.motivo,
      desde: ventana.desde.toISOString(),
      hasta: ventana.hasta.toISOString(),
    },
    ignorar_horario: ignorarHorario(),
    ya_registrada: existentes.length > 0,
    editable: existentes.length > 0 && dentroPlazoEdicion({
      fecha: params.fecha,
      horaFin: String(horario.hora_fin),
      ahora,
    }),
    resumen: {
      presentes: estudiantes.filter((e) => e.presente === true).length,
      ausentes: estudiantes.filter((e) => e.presente === false).length,
      total: estudiantes.length,
    },
    estudiantes,
  };
}

// ============================ Registrar / editar ============================

/**
 * Registra la asistencia de una sesión completa dentro de una transacción.
 *
 * Reglas:
 *  a) El docente debe ser dueño del horario (403 si no).
 *  b) Solo dentro de la ventana horaria (422 si no).
 *  c) Si `ASISTENCIA_IGNORAR_HORARIO=true`, la ventana se salta (modo pruebas).
 *  d) No se puede duplicar la sesión (409 si ya existe).
 *
 * @throws RecursoDocenteNoEncontradoError / ClaseNoAsignadaError / FueraDeVentanaAsistenciaError / AsistenciaDuplicadaError / EstudianteNoInscritoError
 */
export async function registrarAsistenciaLista(params: {
  perfil: UsuarioPisuSesion;
  horarioId: string;
  fecha: string;
  registros: Array<{ estudianteId: string; presente: boolean }>;
  ahora?: Date;
}): Promise<Asistencia[]> {
  if (params.registros.length === 0) {
    throw new DatosAsistenciaInvalidosError("Debes enviar al menos un estudiante.");
  }
  const ahora = params.ahora ?? new Date();

  const { guardadas, deporteId } = await sequelize.transaction(async (transaction) => {
    const horario = await HorarioDeporte.findByPk(params.horarioId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!horario) {
      throw new RecursoDocenteNoEncontradoError("La clase no existe.");
    }
    if (horario.docente_id !== params.perfil.id) {
      throw new ClaseNoAsignadaError(
        "No puedes registrar asistencia de una clase que no te está asignada (RN-004).",
      );
    }

    const ventana = evaluarVentanaAsistencia({
      diaSemana: horario.dia_semana,
      horaInicio: String(horario.hora_inicio),
      horaFin: String(horario.hora_fin),
      fecha: params.fecha,
      ahora,
    });
    if (!ventana.abierta) {
      throw new FueraDeVentanaAsistenciaError(
        ventana.motivo ?? "La ventana de asistencia está cerrada.",
      );
    }

    const yaExiste = await Asistencia.count({
      where: { horario_id: horario.id, fecha: params.fecha },
      transaction,
    });
    if (yaExiste > 0) {
      const err = new AsistenciaDuplicadaError(
        "La asistencia de esta clase y fecha ya fue registrada. Puedes editarla dentro de las 24 horas.",
      );
      (err as unknown as Record<string, unknown>).codigo = "ASISTENCIA_DUPLICADA";
      (err as unknown as Record<string, unknown>).conflicto = {
        tipo: "asistencia",
        horarioId: horario.id,
        fecha: params.fecha,
      };
      throw err;
    }

    const guardadas: Asistencia[] = [];
    for (const registro of params.registros) {
      const inscrito = await InscripcionDeporte.findOne({
        where: {
          estudiante_id: registro.estudianteId,
          deporte_id: horario.deporte_id,
          estado: "Activa",
        },
        transaction,
      });
      if (!inscrito) {
        throw new EstudianteNoInscritoError(
          "Hay estudiantes que no están inscritos de forma activa en este deporte.",
        );
      }

      try {
        const creada = await Asistencia.create(
          {
            horario_id: horario.id,
            estudiante_id: registro.estudianteId,
            docente_id: params.perfil.id,
            fecha: params.fecha,
            presente: registro.presente,
          },
          { transaction },
        );
        guardadas.push(creada);
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          const otra = await Asistencia.findOne({
            where: {
              horario_id: horario.id,
              estudiante_id: registro.estudianteId,
              fecha: params.fecha,
            },
            transaction,
          });
          if (otra) {
            await otra.update({ presente: registro.presente }, { transaction });
            guardadas.push(otra);
            continue;
          }
        }
        throw error;
      }
    }

    return { guardadas, deporteId: horario.deporte_id };
  });

  await generarAlertasInasistencia({
    deporteId,
    estudianteIds: params.registros
      .filter((registro) => !registro.presente)
      .map((registro) => registro.estudianteId),
  });

  return guardadas;
}

/**
 * Corrige una asistencia individual dentro de las 24 horas posteriores a la
 * clase. Fuera de ese plazo lanza `EdicionFueraDePlazoError` (422).
 */
export async function editarAsistencia(params: {
  perfil: UsuarioPisuSesion;
  asistenciaId: string;
  presente: boolean;
  ahora?: Date;
}): Promise<Asistencia> {
  const ahora = params.ahora ?? new Date();
  const asistencia = await Asistencia.findByPk(params.asistenciaId);

  if (!asistencia) {
    throw new RecursoDocenteNoEncontradoError("La asistencia no existe.");
  }
  if (asistencia.docente_id !== params.perfil.id) {
    throw new ClaseNoAsignadaError(
      "No puedes editar una asistencia que no registraste (RN-004).",
    );
  }

  const horario = await HorarioDeporte.findByPk(asistencia.horario_id, {
    attributes: ["deporte_id", "hora_fin"],
  });
  if (!horario) {
    throw new RecursoDocenteNoEncontradoError("La clase de esta asistencia no existe.");
  }

  if (
    !dentroPlazoEdicion({
      fecha: asistencia.fecha,
      horaFin: String(horario.hora_fin),
      ahora,
    })
  ) {
    throw new EdicionFueraDePlazoError(
      "Solo puedes corregir la asistencia dentro de las 24 horas posteriores a la clase (RF-016).",
    );
  }

  await asistencia.update({ presente: params.presente });

  if (!params.presente) {
    await generarAlertasInasistencia({
      deporteId: horario.deporte_id,
      estudianteIds: [asistencia.estudiante_id],
    });
  }

  return asistencia;
}

export async function listarAsistenciasDocente(
  perfil: UsuarioPisuSesion,
  fecha?: string,
) {
  const where: { docente_id: string; fecha?: string } = { docente_id: perfil.id };
  if (fecha) {
    where.fecha = fecha;
  }
  return Asistencia.findAll({
    where,
    order: [["fecha", "DESC"]],
  });
}

// ============================ Historial ============================

export type DetalleAsistencia = {
  asistencia_id: string;
  estudiante_id: string;
  nombre: string;
  documento: string | null;
  categoria: string | null;
  presente: boolean;
};

export type SesionHistorial = {
  horario_id: string;
  fecha: string;
  fecha_larga: string;
  deporte: { id: string; nombre: string };
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  presentes: number;
  ausentes: number;
  total: number;
  porcentaje: number;
  puede_editar: boolean;
  detalle: DetalleAsistencia[];
};

/**
 * Historial de sesiones del docente (opcionalmente filtrado por deporte).
 * Agrupa las asistencias por horario+fecha y calcula presentes/ausentes.
 */
export async function listarHistorialAsistencias(
  perfil: UsuarioPisuSesion,
  deporteId?: string,
  ahora: Date = new Date(),
): Promise<SesionHistorial[]> {
  const whereHorario: { docente_id: string; deporte_id?: string } = {
    docente_id: perfil.id,
  };
  if (deporteId) {
    whereHorario.deporte_id = deporteId;
  }

  const asistencias = await Asistencia.findAll({
    include: [
      {
        model: HorarioDeporte,
        as: "horario",
        required: true,
        where: whereHorario,
        include: [{ model: Deporte, as: "deporte", attributes: ["id", "nombre"] }],
      },
      {
        model: UsuarioPisu,
        as: "estudiante",
        attributes: ["id", "nombre", "documento", "categoria"],
      },
    ],
    order: [
      ["fecha", "DESC"],
      ["id", "ASC"],
    ],
  });

  const sesiones = new Map<string, SesionHistorial>();
  for (const asistencia of asistencias) {
    const horario = asistencia.get("horario") as
      | (HorarioDeporte & { deporte?: Deporte })
      | undefined;
    if (!horario) continue;
    const clave = `${asistencia.horario_id}|${asistencia.fecha}`;
    let sesion = sesiones.get(clave);
    if (!sesion) {
      sesion = {
        horario_id: asistencia.horario_id,
        fecha: asistencia.fecha,
        fecha_larga: fechaLarga(asistencia.fecha),
        deporte: {
          id: horario.deporte_id,
          nombre: horario.deporte?.nombre ?? "Deporte",
        },
        dia: DIAS_SEMANA[horario.dia_semana] ?? "Día",
        hora_inicio: String(horario.hora_inicio),
        hora_fin: String(horario.hora_fin),
        lugar: horario.lugar,
        presentes: 0,
        ausentes: 0,
        total: 0,
        porcentaje: 0,
        puede_editar: dentroPlazoEdicion({
          fecha: asistencia.fecha,
          horaFin: String(horario.hora_fin),
          ahora,
        }),
        detalle: [],
      };
      sesiones.set(clave, sesion);
    }
    const est = asistencia.get("estudiante") as UsuarioPisu | undefined;
    sesion.detalle.push({
      asistencia_id: asistencia.id,
      estudiante_id: asistencia.estudiante_id,
      nombre: est?.nombre ?? "Estudiante",
      documento: est?.documento ?? null,
      categoria: est?.categoria ?? null,
      presente: asistencia.presente,
    });
    if (asistencia.presente) sesion.presentes += 1;
    else sesion.ausentes += 1;
    sesion.total += 1;
  }

  return [...sesiones.values()].map((s) => ({
    ...s,
    porcentaje: s.total > 0 ? Math.round((s.presentes / s.total) * 100) : 0,
  }));
}

// ============================ Estudiantes por deporte ============================

export type EstudianteDeporte = {
  estudiante_id: string;
  nombre: string;
  documento: string | null;
  correo: string | null;
  categoria: string | null;
  presentes: number;
  faltas: number;
  dictadas: number;
  porcentaje: number;
  estado: EstadoAsistencia;
};

export async function listarEstudiantesDeDeporte(
  perfil: UsuarioPisuSesion,
  deporteId: string,
): Promise<{ deporte: { id: string; nombre: string; cupo_maximo: number }; dictadas: number; estudiantes: EstudianteDeporte[] }> {
  const deporte = await asegurarDeporteDelDocente({ perfil, deporteId });

  const inscripciones = await InscripcionDeporte.findAll({
    where: { deporte_id: deporteId, estado: "Activa" },
    include: [
      {
        model: UsuarioPisu,
        as: "estudiante",
        attributes: ["id", "nombre", "documento", "correo", "categoria"],
      },
    ],
  });

  const dictadas = await contarClasesDictadas(deporteId);
  const presentesFilas = (await Asistencia.findAll({
    attributes: ["estudiante_id", [fn("COUNT", col("Asistencia.id")), "presentes"]],
    include: [
      {
        model: HorarioDeporte,
        as: "horario",
        attributes: [],
        where: { deporte_id: deporteId },
        required: true,
      },
    ],
    where: { presente: true },
    group: ["estudiante_id"],
    raw: true,
  })) as unknown as Array<{ estudiante_id: string; presentes: string }>;
  const presentesMap = new Map(presentesFilas.map((f) => [f.estudiante_id, Number(f.presentes)]));

  const estudiantes: EstudianteDeporte[] = inscripciones
    .map((ins) => {
      const est = ins.get("estudiante") as UsuarioPisu | undefined;
      const presentes = presentesMap.get(ins.estudiante_id) ?? 0;
      return {
        estudiante_id: ins.estudiante_id,
        nombre: est?.nombre ?? "Estudiante",
        documento: est?.documento ?? null,
        correo: est?.correo ?? null,
        categoria: est?.categoria ?? null,
        presentes,
        faltas: Math.max(0, dictadas - presentes),
        dictadas,
        porcentaje: dictadas > 0 ? Math.round((presentes / dictadas) * 100) : 0,
        estado: clasificarAsistencia({ presentes, dictadas }),
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return {
    deporte: { id: deporte.id, nombre: deporte.nombre, cupo_maximo: deporte.cupo_maximo },
    dictadas,
    estudiantes,
  };
}

// ============================ Reporte final ============================

export type SesionReporte = {
  horario_id: string;
  fecha: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
};

export type ReporteDeporte = {
  deporte: { id: string; nombre: string };
  docente: string;
  periodo: string;
  horarios: Array<{ dia: string; hora_inicio: string; hora_fin: string; lugar: string }>;
  generado: string;
  tipo: "REPORTE FINAL" | "REPORTE PARCIAL";
  semestre_finalizado: boolean;
  minimo: number;
  dictadas: number;
  total_estudiantes: number;
  aprobados: number;
  reprobados: number;
  promedio: number;
  sesiones: SesionReporte[];
  estudiantes: FilaReporte[];
  /** matriz[estudianteId][`horarioId|fecha`] = presente */
  matriz: Record<string, Record<string, boolean>>;
};

/**
 * Calcula el reporte de un deporte. Es la ÚNICA fuente de los números: la
 * pantalla y el Excel usan este mismo resultado para que siempre coincidan.
 */
export async function calcularReporteDeporte(params: {
  perfil: UsuarioPisuSesion;
  deporteId: string;
  ahora?: Date;
}): Promise<ReporteDeporte> {
  const ahora = params.ahora ?? new Date();
  const deporte = await asegurarDeporteDelDocente({
    perfil: params.perfil,
    deporteId: params.deporteId,
  });

  const horarios = await HorarioDeporte.findAll({
    where: { deporte_id: params.deporteId, docente_id: params.perfil.id },
    order: [
      ["dia_semana", "ASC"],
      ["hora_inicio", "ASC"],
    ],
  });
  const horarioIds = horarios.map((h) => h.id);

  const asistencias = horarioIds.length
    ? await Asistencia.findAll({
        where: { horario_id: { [Op.in]: horarioIds } },
        include: [
          {
            model: UsuarioPisu,
            as: "estudiante",
            attributes: ["id", "nombre", "documento", "correo", "categoria"],
          },
        ],
      })
    : [];

  const horariosMap = new Map(horarios.map((h) => [h.id, h]));
  const sesionesMap = new Map<string, SesionReporte>();
  const presentesPorEstudiante = new Map<string, number>();
  const matriz: Record<string, Record<string, boolean>> = {};
  const datosEstudiante = new Map<
    string,
    { nombre: string; documento: string | null; correo: string | null; categoria: string | null }
  >();

  for (const asistencia of asistencias) {
    const horario = horariosMap.get(asistencia.horario_id);
    if (!horario) continue;
    const claveSesion = `${asistencia.horario_id}|${asistencia.fecha}`;
    if (!sesionesMap.has(claveSesion)) {
      sesionesMap.set(claveSesion, {
        horario_id: asistencia.horario_id,
        fecha: asistencia.fecha,
        dia: DIAS_SEMANA[horario.dia_semana] ?? "Día",
        hora_inicio: String(horario.hora_inicio),
        hora_fin: String(horario.hora_fin),
        lugar: horario.lugar,
      });
    }
    const est = asistencia.get("estudiante") as UsuarioPisu | undefined;
    if (!datosEstudiante.has(asistencia.estudiante_id)) {
      datosEstudiante.set(asistencia.estudiante_id, {
        nombre: est?.nombre ?? "Estudiante",
        documento: est?.documento ?? null,
        correo: est?.correo ?? null,
        categoria: est?.categoria ?? null,
      });
    }
    if (asistencia.presente) {
      presentesPorEstudiante.set(
        asistencia.estudiante_id,
        (presentesPorEstudiante.get(asistencia.estudiante_id) ?? 0) + 1,
      );
    }
    matriz[asistencia.estudiante_id] = matriz[asistencia.estudiante_id] ?? {};
    matriz[asistencia.estudiante_id]![claveSesion] = asistencia.presente;
  }

  const dictadas = sesionesMap.size;
  // Incluye también a estudiantes sin asistencias (recién inscritos).
  const inscripciones = await InscripcionDeporte.findAll({
    where: { deporte_id: params.deporteId, estado: "Activa" },
    include: [
      {
        model: UsuarioPisu,
        as: "estudiante",
        attributes: ["id", "nombre", "documento", "correo", "categoria"],
      },
    ],
  });
  for (const ins of inscripciones) {
    if (datosEstudiante.has(ins.estudiante_id)) continue;
    const est = ins.get("estudiante") as UsuarioPisu | undefined;
    datosEstudiante.set(ins.estudiante_id, {
      nombre: est?.nombre ?? "Estudiante",
      documento: est?.documento ?? null,
      correo: est?.correo ?? null,
      categoria: est?.categoria ?? null,
    });
  }

  const estudiantes: FilaReporte[] = [...datosEstudiante.entries()]
    .map(([id, datos]) =>
      calcularFilaReporte({
        estudiante_id: id,
        nombre: datos.nombre,
        documento: datos.documento,
        correo: datos.correo,
        categoria: datos.categoria,
        presentes: presentesPorEstudiante.get(id) ?? 0,
        dictadas,
      }),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const aprobados = estudiantes.filter((e) => e.aprobado).length;
  const promedio =
    estudiantes.length > 0
      ? Math.round(estudiantes.reduce((acc, e) => acc + e.porcentaje, 0) / estudiantes.length)
      : 0;

  return {
    deporte: { id: deporte.id, nombre: deporte.nombre },
    docente: params.perfil.nombre,
    periodo: `${process.env["SEMESTRE_INICIO"] ?? "—"} a ${process.env["SEMESTRE_FIN"] ?? "—"}`,
    horarios: horarios.map((h) => ({
      dia: DIAS_SEMANA[h.dia_semana] ?? "Día",
      hora_inicio: String(h.hora_inicio),
      hora_fin: String(h.hora_fin),
      lugar: h.lugar,
    })),
    generado: ahora.toISOString(),
    tipo: semestreFinalizado(ahora) ? "REPORTE FINAL" : "REPORTE PARCIAL",
    semestre_finalizado: semestreFinalizado(ahora),
    minimo: aprobacionMinima(),
    dictadas,
    total_estudiantes: estudiantes.length,
    aprobados,
    reprobados: estudiantes.length - aprobados,
    promedio,
    sesiones: [...sesionesMap.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    estudiantes,
    matriz,
  };
}
