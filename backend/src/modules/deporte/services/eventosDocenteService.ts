/**
 * Servicio de eventos creados por docentes (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Un docente puede crear torneos, masterclass, amistosos o jornadas de práctica
 * ligados a uno de SUS deportes. Este servicio valida las reglas de negocio,
 * detecta conflictos de lugar (con otros eventos o con clases de deporte),
 * gestiona la cancelación con comunicados y expone la lista de inscritos / CSV.
 *
 * ¿Cómo se relaciona con los demás?
 * - Usa `asegurarDeporteDelDocente` (docenteService) para el control de acceso:
 *   el docente solo puede crear eventos en deportes que tenga asignados.
 * - Usa `hayTraslape` (utils/horarios) con el mismo criterio que los horarios,
 *   para que la detección de choques sea consistente.
 * - Crea `Alerta` personales (audiencia Estudiantes + `estudiante_id`) para que
 *   los comunicados aparezcan en la campana del estudiante.
 *
 * Reglas de negocio destacadas (con ejemplo):
 * - Ventana de conflicto de lugar: dos eventos chocan si comparten lugar, el
 *   mismo día y sus franjas horarias se solapan. Ejemplo: evento A de 16:00 a
 *   18:00 y evento B de 17:00 a 19:00 en "Cancha principal" → hay choque.
 * - Cupo: nunca puede bajar por debajo de los ya inscritos. Ejemplo: si hay 8
 *   inscritos, el cupo mínimo aceptable es 8.
 * - Fecha límite: debe ser anterior al inicio del evento. Ejemplo: evento el
 *   20/10 a las 16:00 → límite válido 19/10 o 20/10 a las 15:59, inválido 20/10 16:30.
 */

import { Op } from "sequelize";
import { sequelize } from "../../../config/database.js";
import type { CategoriaPisu } from "../constantes.js";
import type { UsuarioPisuSesion } from "../middlewares/tipos.js";
import { Alerta } from "../models/Alerta.js";
import { Deporte } from "../models/Deporte.js";
import { DeporteDocente } from "../models/DeporteDocente.js";
import { EventoDeporte } from "../models/EventoDeporte.js";
import { HorarioDeporte } from "../models/HorarioDeporte.js";
import { InscripcionDeporte } from "../models/InscripcionDeporte.js";
import { InscripcionEvento } from "../models/InscripcionEvento.js";
import { UsuarioPisu } from "../models/UsuarioPisu.js";
import { hayTraslape } from "../utils/horarios.js";
import { asegurarDeporteDelDocente } from "./docenteService.js";

export const DIAS_EVENTO = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

// ============================== Errores ==============================

export class EventoDocenteNoEncontradoError extends Error {}
export class EventoDocenteNoPermitidoError extends Error {}
export class EventoDocenteInvalidoError extends Error {}

/**
 * Se intenta bajar el cupo por debajo de los inscritos actuales (409).
 * Lleva `inscritos` para que el frontend explique el mínimo permitido.
 */
export class CupoMenorQueInscritosError extends Error {
  inscritos: number;
  constructor(mensaje: string, inscritos: number) {
    super(mensaje);
    this.inscritos = inscritos;
  }
}

export type ConflictoLugar = {
  tipo: "evento" | "clase";
  nombre: string;
  lugar: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
};

/**
 * Conflicto de lugar/franja (409). Mantiene el cuerpo estructurado que el
 * frontend usa para resaltar lugar/fecha/horas y ofrecer alternativas.
 */
export class ConflictoEventoDocenteError extends Error {
  codigo: string;
  conflicto: ConflictoLugar;
  alternativas: string[];
  constructor(
    mensaje: string,
    conflicto: ConflictoLugar,
    alternativas: string[],
    codigo: string,
  ) {
    super(mensaje);
    this.codigo = codigo;
    this.conflicto = conflicto;
    this.alternativas = alternativas;
  }
}

// ============================== Tipos ==============================

export type DatosEventoDocente = {
  nombre?: string | undefined;
  descripcion?: string | null | undefined;
  tipo?: string | undefined;
  deporte_id?: string | undefined;
  fecha?: string | undefined;
  hora_inicio?: string | undefined;
  hora_fin?: string | undefined;
  lugar?: string | undefined;
  cupo_maximo?: number | undefined;
  fecha_limite_inscripcion?: string | null | undefined;
  categorias_permitidas?: CategoriaPisu[] | undefined;
};

type Ocupacion = {
  tipo: "evento" | "clase";
  nombre: string;
  lugar: string;
  horaInicio: string;
  horaFin: string;
};

// ============================== Utilidades de fecha ==============================

function diaSemanaDe(fechaISO: string): number {
  const valor = new Date(`${fechaISO}T12:00:00`);
  return valor.getDay();
}

function hora12(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  const sufijo = (h ?? 0) >= 12 ? "p. m." : "a. m.";
  const h12 = (h ?? 0) % 12 === 0 ? 12 : (h ?? 0) % 12;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${sufijo}`;
}

function fechaLarga(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(fecha);
}

/** Extrae la parte "YYYY-MM-DD" de un string de fecha (o `null` si no aplica). */
function extraerDia(fecha: string): string | null {
  const coincidencia = /^(\d{4}-\d{2}-\d{2})/.exec(fecha);
  return coincidencia ? (coincidencia[1] ?? null) : null;
}

function momentoDelDia(dia: string, hora: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return null;
  if (!/^\d{2}:\d{2}$/.test(hora)) return null;
  const valor = new Date(`${dia}T${hora}:00`);
  return Number.isNaN(valor.getTime()) ? null : valor;
}

function finDelEvento(evento: EventoDeporte): Date {
  const base = new Date(evento.fecha);
  if (evento.hora_fin) {
    const [h, m] = evento.hora_fin.split(":").map(Number);
    base.setHours(h ?? 0, m ?? 0, 0, 0);
  }
  return base;
}

// ============================== Ocupación de lugar ==============================

/** Todos los lugares conocidos (clases + eventos) para proponer alternativas. */
async function lugaresConocidos(): Promise<string[]> {
  const [horarios, eventos] = await Promise.all([
    HorarioDeporte.findAll({ where: { estado: true }, attributes: ["lugar"] }),
    EventoDeporte.findAll({ attributes: ["lugar"] }),
  ]);
  const lugares = new Set<string>();
  for (const fila of [...horarios, ...eventos]) {
    const lugar = fila.lugar.trim();
    if (lugar.length > 0) lugares.add(lugar);
  }
  return [...lugares].sort((a, b) => a.localeCompare(b, "es"));
}

/** Ocupaciones (eventos y clases) que se solapan con la franja indicada ese día. */
async function ocupacionesEnBloque(params: {
  fechaISO: string;
  horaInicio: string;
  horaFin: string;
  excluirEventoId?: string;
}): Promise<Ocupacion[]> {
  const dia = diaSemanaDe(params.fechaISO);
  const inicioDia = new Date(`${params.fechaISO}T00:00:00`);
  const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

  const [eventos, horarios] = await Promise.all([
    EventoDeporte.findAll({
      where: {
        estado: true,
        estado_evento: "publicado",
        fecha: { [Op.gte]: inicioDia, [Op.lt]: finDia },
        ...(params.excluirEventoId
          ? { id: { [Op.ne]: params.excluirEventoId } }
          : {}),
      },
      include: [{ model: Deporte, as: "deporte", attributes: ["nombre"] }],
    }),
    HorarioDeporte.findAll({
      where: { estado: true, dia_semana: dia },
      include: [
        { model: Deporte, as: "deporte", attributes: ["nombre"] },
        { model: UsuarioPisu, as: "docente", attributes: ["id", "nombre"] },
      ],
    }),
  ]);

  const ocupaciones: Ocupacion[] = [];

  for (const evento of eventos) {
    if (!evento.hora_inicio || !evento.hora_fin) continue;
    if (
      !hayTraslape(
        params.horaInicio,
        params.horaFin,
        evento.hora_inicio,
        evento.hora_fin,
      )
    ) {
      continue;
    }
    ocupaciones.push({
      tipo: "evento",
      nombre: evento.nombre,
      lugar: evento.lugar.trim(),
      horaInicio: evento.hora_inicio,
      horaFin: evento.hora_fin,
    });
  }

  for (const horario of horarios) {
    const inicio = String(horario.hora_inicio).slice(0, 5);
    const fin = String(horario.hora_fin).slice(0, 5);
    if (!hayTraslape(params.horaInicio, params.horaFin, inicio, fin)) continue;
    const deporte = (horario as { deporte?: { nombre?: string } }).deporte;
    ocupaciones.push({
      tipo: "clase",
      nombre: deporte?.nombre ?? "otra clase",
      lugar: horario.lugar.trim(),
      horaInicio: inicio,
      horaFin: fin,
    });
  }

  return ocupaciones;
}

/** Lugares libres ese día y franja (para ofrecer alternativas sin bloquear). */
async function lugaresLibresEnBloque(params: {
  fechaISO: string;
  horaInicio: string;
  horaFin: string;
}): Promise<string[]> {
  const [conocidos, ocupaciones] = await Promise.all([
    lugaresConocidos(),
    ocupacionesEnBloque(params),
  ]);
  const ocupados = new Set(ocupaciones.map((item) => item.lugar.toLowerCase()));
  return conocidos.filter((lugar) => !ocupados.has(lugar.toLowerCase())).slice(0, 6);
}

/**
 * Devuelve el primer conflicto de lugar (si existe) o `null`.
 * @throws ConflictoEventoDocenteError con cuerpo estructurado cuando hay choque.
 */
async function asegurarLugarLibre(params: {
  fechaISO: string;
  horaInicio: string;
  horaFin: string;
  lugar: string;
  excluirEventoId?: string;
}): Promise<void> {
  const ocupaciones = await ocupacionesEnBloque(params);
  const choque = ocupaciones.find(
    (item) => item.lugar.toLowerCase() === params.lugar.trim().toLowerCase(),
  );
  if (!choque) return;

  const dia = DIAS_EVENTO[diaSemanaDe(params.fechaISO)];
  const mensaje = `El lugar '${params.lugar.trim()}' ya está ocupado por '${choque.nombre}' el ${dia} de ${hora12(choque.horaInicio)} a ${hora12(choque.horaFin)}.`;
  const alternativas = await lugaresLibresEnBloque(params);
  throw new ConflictoEventoDocenteError(
    mensaje,
    {
      tipo: choque.tipo,
      nombre: choque.nombre,
      lugar: params.lugar.trim(),
      fecha: params.fechaISO,
      horaInicio: choque.horaInicio,
      horaFin: choque.horaFin,
    },
    alternativas,
    choque.tipo === "clase" ? "CONFLICTO_CLASE" : "CONFLICTO_EVENTO",
  );
}

/** Clase del propio docente que coincide con el bloque (aviso, no bloquea). */
async function clasePropiaEnBloque(params: {
  perfil: UsuarioPisuSesion;
  fechaISO: string;
  horaInicio: string;
  horaFin: string;
}): Promise<string | null> {
  const dia = diaSemanaDe(params.fechaISO);
  const horarios = await HorarioDeporte.findAll({
    where: { docente_id: params.perfil.id, dia_semana: dia, estado: true },
    include: [{ model: Deporte, as: "deporte", attributes: ["nombre"] }],
  });
  for (const horario of horarios) {
    const inicio = String(horario.hora_inicio).slice(0, 5);
    const fin = String(horario.hora_fin).slice(0, 5);
    if (!hayTraslape(params.horaInicio, params.horaFin, inicio, fin)) continue;
    const deporte = (horario as { deporte?: { nombre?: string } }).deporte;
    return `Tienes tu clase de '${deporte?.nombre ?? "un deporte"}' de ${hora12(inicio)} a ${hora12(fin)}; revisa que no te quede encima.`;
  }
  return null;
}

// ============================== Validación ==============================

type EventoNormalizado = {
  nombre: string;
  descripcion: string | null;
  tipo: string;
  dia: string;
  horaInicio: string;
  horaFin: string;
  lugar: string;
  cupoMaximo: number;
  fechaLimite: Date | null;
  categorias: CategoriaPisu[];
  inicio: Date;
};

function normalizarCategorias(
  solicitadas: CategoriaPisu[] | undefined,
  delDeporte: CategoriaPisu[],
): CategoriaPisu[] {
  if (!solicitadas || solicitadas.length === 0) return delDeporte;
  const fuera = solicitadas.filter((item) => !delDeporte.includes(item));
  if (fuera.length > 0) {
    throw new EventoDocenteInvalidoError(
      `Estas categorías no pertenecen al deporte: ${fuera.join(", ")}.`,
    );
  }
  return solicitadas;
}

/**
 * Valida y normaliza los datos del evento (crear o editar).
 * @param verificarFechaPasada si es `true`, la fecha+hora de inicio no puede ser pasada.
 */
function validarEvento(params: {
  datos: Required<Pick<DatosEventoDocente, "nombre" | "fecha" | "hora_inicio" | "hora_fin" | "lugar" | "cupo_maximo">> &
    DatosEventoDocente;
  tipoPorDefecto: string;
  categoriasDelDeporte: CategoriaPisu[];
  verificarFechaPasada: boolean;
  ahora?: Date;
}): EventoNormalizado {
  const ahora = params.ahora ?? new Date();
  const nombre = (params.datos.nombre ?? "").trim();
  if (nombre.length < 2) {
    throw new EventoDocenteInvalidoError("El nombre del evento es obligatorio.");
  }

  const dia = params.datos.fecha ? extraerDia(params.datos.fecha) : null;
  if (!dia) {
    throw new EventoDocenteInvalidoError("La fecha del evento no es válida.");
  }

  const horaInicio = params.datos.hora_inicio ?? "";
  const horaFin = params.datos.hora_fin ?? "";
  const inicio = momentoDelDia(dia, horaInicio);
  const fin = momentoDelDia(dia, horaFin);
  if (!inicio || !fin) {
    throw new EventoDocenteInvalidoError("Las horas del evento no son válidas.");
  }
  if (fin.getTime() <= inicio.getTime()) {
    throw new EventoDocenteInvalidoError(
      "La hora de fin debe ser posterior a la hora de inicio.",
    );
  }
  if (params.verificarFechaPasada && inicio.getTime() < ahora.getTime()) {
    throw new EventoDocenteInvalidoError(
      "La fecha y hora del evento no pueden ser pasadas.",
    );
  }

  const cupoMaximo = params.datos.cupo_maximo ?? 0;
  if (!Number.isInteger(cupoMaximo) || cupoMaximo < 1) {
    throw new EventoDocenteInvalidoError("El cupo debe ser mayor que 0.");
  }

  let fechaLimite: Date | null = null;
  if (params.datos.fecha_limite_inscripcion) {
    const diaLimite = extraerDia(params.datos.fecha_limite_inscripcion);
    fechaLimite = diaLimite ? momentoDelDia(diaLimite, "23:59") : null;
    if (!fechaLimite) {
      throw new EventoDocenteInvalidoError(
        "La fecha límite de inscripción no es válida.",
      );
    }
    if (fechaLimite.getTime() >= inicio.getTime()) {
      throw new EventoDocenteInvalidoError(
        "La fecha límite de inscripción debe ser anterior al inicio del evento.",
      );
    }
  }

  const descripcion =
    typeof params.datos.descripcion === "string" && params.datos.descripcion.trim()
      ? params.datos.descripcion.trim()
      : null;

  return {
    nombre,
    descripcion,
    tipo: (params.datos.tipo ?? params.tipoPorDefecto).trim() || params.tipoPorDefecto,
    dia,
    horaInicio,
    horaFin,
    lugar: (params.datos.lugar ?? "").trim(),
    cupoMaximo,
    fechaLimite,
    categorias: normalizarCategorias(
      params.datos.categorias_permitidas,
      params.categoriasDelDeporte,
    ),
    inicio,
  };
}

// ============================== Comunicados ==============================

/** Crea comunicados personales (campana) para una lista de estudiantes. */
async function comunicarAEstudiantes(params: {
  estudiantes: string[];
  titulo: string;
  mensaje: string;
  clave: (estudianteId: string) => string;
}): Promise<number> {
  const unicos = [...new Set(params.estudiantes)];
  if (unicos.length === 0) return 0;
  await Alerta.bulkCreate(
    unicos.map((estudianteId) => ({
      titulo: params.titulo,
      mensaje: params.mensaje,
      audiencia: "Estudiantes" as const,
      estudiante_id: estudianteId,
      clave: params.clave(estudianteId),
    })),
    { ignoreDuplicates: true, validate: false },
  );
  return unicos.length;
}

async function inscritosDelDeporte(deporteId: string): Promise<string[]> {
  const filas = await InscripcionDeporte.findAll({
    where: { deporte_id: deporteId, estado: "Activa" },
    attributes: ["estudiante_id"],
  });
  return filas.map((fila) => fila.estudiante_id);
}

async function inscritosDelEvento(eventoId: string): Promise<string[]> {
  const filas = await InscripcionEvento.findAll({
    where: { evento_id: eventoId, estado: "Activa" },
    attributes: ["estudiante_id"],
  });
  return filas.map((fila) => fila.estudiante_id);
}

// ============================== Serialización ==============================

export type EventoDocenteDetalle = ReturnType<typeof serializarEventoDocente>;

function serializarEventoDocente(
  evento: EventoDeporte,
  inscritos: number,
): Record<string, unknown> & {
  inscritos: number;
  cupos_libres: number;
  finalizado: boolean;
} {
  const base = evento.toJSON() as Record<string, unknown>;
  const finalizado =
    evento.estado_evento === "publicado" && finDelEvento(evento).getTime() < Date.now();
  return {
    ...base,
    inscritos,
    cupos_libres: Math.max(0, evento.cupo_maximo - inscritos),
    finalizado,
  };
}

async function conteoInscritos(ids: string[]): Promise<Map<string, number>> {
  const conteo = new Map<string, number>();
  if (ids.length === 0) return conteo;
  const filas = await InscripcionEvento.findAll({
    where: { evento_id: { [Op.in]: ids }, estado: "Activa" },
    attributes: ["evento_id"],
  });
  for (const fila of filas) {
    conteo.set(fila.evento_id, (conteo.get(fila.evento_id) ?? 0) + 1);
  }
  return conteo;
}

/** IDs de los deportes que el docente puede gestionar (horario o asignación). */
async function idsDeportesDelDocente(perfil: UsuarioPisuSesion): Promise<string[]> {
  const [horarios, asignados] = await Promise.all([
    HorarioDeporte.findAll({
      where: { docente_id: perfil.id, estado: true },
      attributes: ["deporte_id"],
    }),
    DeporteDocente.findAll({
      where: { docente_id: perfil.id },
      attributes: ["deporte_id"],
    }),
  ]);
  const ids = new Set<string>();
  for (const fila of [...horarios, ...asignados]) ids.add(fila.deporte_id);
  return [...ids];
}

// ============================== Operaciones ==============================

const INCLUDE_EVENTO = [
  { model: Deporte, as: "deporte", attributes: ["id", "nombre", "categorias_permitidas"] },
  { model: UsuarioPisu, as: "creador", attributes: ["id", "nombre"] },
];

/** Lista los eventos creados por el docente o ligados a sus deportes. */
export async function listarEventosDocente(perfil: UsuarioPisuSesion) {
  const deporteIds = await idsDeportesDelDocente(perfil);
  const condiciones = [
    { creado_por_id: perfil.id },
    ...(deporteIds.length > 0 ? [{ deporte_id: { [Op.in]: deporteIds } }] : []),
  ];
  const eventos = await EventoDeporte.findAll({
    where: { [Op.or]: condiciones },
    include: INCLUDE_EVENTO,
    order: [
      ["fecha", "DESC"],
      ["fecha_creacion", "DESC"],
    ],
  });
  const conteo = await conteoInscritos(eventos.map((item) => item.id));
  return eventos.map((evento) => serializarEventoDocente(evento, conteo.get(evento.id) ?? 0));
}

/** Verifica que el evento exista y sea del docente; devuelve el evento. */
async function eventoPropio(
  perfil: UsuarioPisuSesion,
  eventoId: string,
): Promise<EventoDeporte> {
  const evento = await EventoDeporte.findByPk(eventoId);
  if (!evento) {
    throw new EventoDocenteNoEncontradoError("El evento no existe.");
  }
  if (evento.creado_por_id !== perfil.id) {
    throw new EventoDocenteNoPermitidoError(
      "Solo puedes gestionar los eventos que tú creaste.",
    );
  }
  return evento;
}

export async function crearEventoDocente(params: {
  perfil: UsuarioPisuSesion;
  datos: DatosEventoDocente;
}) {
  const { perfil, datos } = params;
  if (!datos.deporte_id) {
    throw new EventoDocenteInvalidoError("Debes elegir un deporte para el evento.");
  }
  // Control de acceso: el deporte debe estar asignado al docente (403 si no).
  const deporte = await asegurarDeporteDelDocente({
    perfil,
    deporteId: datos.deporte_id,
  });

  const normalizado = validarEvento({
    datos: datos as Parameters<typeof validarEvento>[0]["datos"],
    tipoPorDefecto: "Otro",
    categoriasDelDeporte: deporte.categorias_permitidas as CategoriaPisu[],
    verificarFechaPasada: true,
  });

  await asegurarLugarLibre({
    fechaISO: normalizado.dia,
    horaInicio: normalizado.horaInicio,
    horaFin: normalizado.horaFin,
    lugar: normalizado.lugar,
  });

  const aviso = await clasePropiaEnBloque({
    perfil,
    fechaISO: normalizado.dia,
    horaInicio: normalizado.horaInicio,
    horaFin: normalizado.horaFin,
  });

  const evento = await EventoDeporte.create({
    nombre: normalizado.nombre,
    descripcion: normalizado.descripcion,
    tipo: normalizado.tipo,
    fecha: new Date(`${normalizado.dia}T00:00:00`),
    hora_inicio: normalizado.horaInicio,
    hora_fin: normalizado.horaFin,
    lugar: normalizado.lugar,
    cupo_maximo: normalizado.cupoMaximo,
    fecha_limite_inscripcion: normalizado.fechaLimite,
    categorias_permitidas: normalizado.categorias,
    estado_evento: "publicado",
    deporte_id: deporte.id,
    creado_por_id: perfil.id,
    estado: true,
  });

  // Comunicado a los estudiantes ya inscritos en el deporte.
  const estudiantes = await inscritosDelDeporte(deporte.id);
  const notificados = await comunicarAEstudiantes({
    estudiantes,
    titulo: `Nuevo evento: ${normalizado.nombre}`,
    mensaje: `El docente creó el evento "${normalizado.nombre}" (${deporte.nombre}) el ${fechaLarga(new Date(`${normalizado.dia}T00:00:00`))} de ${hora12(normalizado.horaInicio)} a ${hora12(normalizado.horaFin)} en ${normalizado.lugar}.`,
    clave: (estudianteId) => `evento:${evento.id}:nuevo:${estudianteId}`,
  });

  return {
    evento: await recargarEvento(evento.id),
    aviso,
    notificados,
  };
}

async function recargarEvento(eventoId: string) {
  const evento = await EventoDeporte.findByPk(eventoId, { include: INCLUDE_EVENTO });
  if (!evento) throw new EventoDocenteNoEncontradoError("El evento no existe.");
  const inscritos = await InscripcionEvento.count({
    where: { evento_id: eventoId, estado: "Activa" },
  });
  return serializarEventoDocente(evento, inscritos);
}

export async function actualizarEventoDocente(params: {
  perfil: UsuarioPisuSesion;
  eventoId: string;
  datos: DatosEventoDocente;
}) {
  const { perfil, eventoId, datos } = params;
  const evento = await eventoPropio(perfil, eventoId);

  const deporteId = datos.deporte_id ?? evento.deporte_id;
  if (!deporteId) {
    throw new EventoDocenteInvalidoError("El evento debe estar ligado a un deporte.");
  }
  const deporte = await asegurarDeporteDelDocente({ perfil, deporteId });

  // Solo se valida "no pasada" si se cambia la fecha/hora de inicio.
  const cambiaFecha = datos.fecha !== undefined || datos.hora_inicio !== undefined;

  const normalizado = validarEvento({
    datos: {
      nombre: datos.nombre ?? evento.nombre,
      descripcion: datos.descripcion ?? evento.descripcion,
      tipo: datos.tipo ?? evento.tipo,
      fecha: datos.fecha ?? extraerDia(evento.fecha.toISOString()) ?? "",
      hora_inicio: datos.hora_inicio ?? evento.hora_inicio ?? "",
      hora_fin: datos.hora_fin ?? evento.hora_fin ?? "",
      lugar: datos.lugar ?? evento.lugar,
      cupo_maximo: datos.cupo_maximo ?? evento.cupo_maximo,
      fecha_limite_inscripcion:
        datos.fecha_limite_inscripcion !== undefined
          ? datos.fecha_limite_inscripcion
          : evento.fecha_limite_inscripcion
            ? extraerDia(evento.fecha_limite_inscripcion.toISOString())
            : null,
      categorias_permitidas:
        datos.categorias_permitidas ??
        (evento.categorias_permitidas as CategoriaPisu[] | null) ??
        undefined,
    },
    tipoPorDefecto: evento.tipo || "Otro",
    categoriasDelDeporte: deporte.categorias_permitidas as CategoriaPisu[],
    verificarFechaPasada: cambiaFecha,
  });

  const inscritos = await InscripcionEvento.count({
    where: { evento_id: evento.id, estado: "Activa" },
  });
  if (normalizado.cupoMaximo < inscritos) {
    throw new CupoMenorQueInscritosError(
      `No puedes bajar el cupo a ${normalizado.cupoMaximo}: ya hay ${inscritos} inscrito(s).`,
      inscritos,
    );
  }

  await asegurarLugarLibre({
    fechaISO: normalizado.dia,
    horaInicio: normalizado.horaInicio,
    horaFin: normalizado.horaFin,
    lugar: normalizado.lugar,
    excluirEventoId: evento.id,
  });

  const cambiaLugar =
    normalizado.lugar.toLowerCase() !== evento.lugar.trim().toLowerCase();
  const cambiaBloque =
    cambiaFecha ||
    normalizado.horaInicio !== (evento.hora_inicio ?? "") ||
    normalizado.horaFin !== (evento.hora_fin ?? "") ||
    cambiaLugar;

  await evento.update({
    nombre: normalizado.nombre,
    descripcion: normalizado.descripcion,
    tipo: normalizado.tipo,
    fecha: new Date(`${normalizado.dia}T00:00:00`),
    hora_inicio: normalizado.horaInicio,
    hora_fin: normalizado.horaFin,
    lugar: normalizado.lugar,
    cupo_maximo: normalizado.cupoMaximo,
    fecha_limite_inscripcion: normalizado.fechaLimite,
    categorias_permitidas: normalizado.categorias,
    deporte_id: deporte.id,
  });

  let notificados = 0;
  let aviso: string | null = null;
  if (cambiaBloque && inscritos > 0) {
    const estudiantes = await inscritosDelEvento(evento.id);
    notificados = await comunicarAEstudiantes({
      estudiantes,
      titulo: `Cambio en el evento: ${normalizado.nombre}`,
      mensaje: `El evento se movió a ${fechaLarga(new Date(`${normalizado.dia}T00:00:00`))} de ${hora12(normalizado.horaInicio)} a ${hora12(normalizado.horaFin)} en ${normalizado.lugar}.`,
      clave: (estudianteId) =>
        `evento:${evento.id}:cambio:${estudianteId}:${normalizado.dia}-${normalizado.horaInicio}`,
    });
    aviso = `Se avisó a ${notificados} inscrito(s) sobre el cambio de fecha, hora o lugar.`;
  }

  return { evento: await recargarEvento(evento.id), aviso, notificados };
}

export async function cancelarEventoDocente(params: {
  perfil: UsuarioPisuSesion;
  eventoId: string;
  motivo: string;
}) {
  const { perfil, eventoId } = params;
  const motivo = params.motivo.trim();
  if (motivo.length < 3) {
    throw new EventoDocenteInvalidoError("Debes indicar el motivo de la cancelación.");
  }
  const evento = await eventoPropio(perfil, eventoId);

  return sequelize.transaction(async (transaction) => {
    const inscritos = await InscripcionEvento.count({
      where: { evento_id: evento.id, estado: "Activa" },
      transaction,
    });

    if (inscritos === 0) {
      await EventoDeporte.destroy({ where: { id: evento.id }, transaction });
      return { eliminado: true, notificados: 0, inscritos: 0 };
    }

    await evento.update(
      { estado_evento: "cancelado", motivo_cancelacion: motivo },
      { transaction },
    );
    const estudiantes = await inscritosDelEvento(evento.id);
    const notificados = await comunicarAEstudiantes({
      estudiantes,
      titulo: `Evento cancelado: ${evento.nombre}`,
      mensaje: `El evento "${evento.nombre}" fue cancelado. Motivo: ${motivo}.`,
      clave: (estudianteId) => `evento:${evento.id}:cancelado:${estudianteId}`,
    });
    return { eliminado: false, notificados, inscritos };
  });
}

export type InscritoEventoDocente = {
  id: string;
  nombre: string;
  documento: string | null;
  correo: string;
  categoria: string | null;
  fecha_inscripcion: string;
};

/** Lista los inscritos al evento (con búsqueda por nombre, documento o correo). */
export async function listarInscritosEventoDocente(params: {
  perfil: UsuarioPisuSesion;
  eventoId: string;
  busqueda?: string | undefined;
}) {
  const evento = await eventoPropio(params.perfil, params.eventoId);
  const busqueda = params.busqueda?.trim();

  const inscripciones = await InscripcionEvento.findAll({
    where: { evento_id: evento.id, estado: "Activa" },
    include: [
      {
        model: UsuarioPisu,
        as: "estudiante",
        attributes: ["id", "nombre", "documento", "correo", "categoria"],
        ...(busqueda
          ? {
              where: {
                [Op.or]: [
                  { nombre: { [Op.iLike]: `%${busqueda}%` } },
                  { documento: { [Op.iLike]: `%${busqueda}%` } },
                  { correo: { [Op.iLike]: `%${busqueda}%` } },
                ],
              },
              required: true,
            }
          : {}),
      },
    ],
    order: [["fecha_inscripcion", "ASC"]],
  });

  const inscritos: InscritoEventoDocente[] = inscripciones.map((fila) => {
    const estudiante = (
      fila as unknown as {
        estudiante?: {
          id: string;
          nombre: string;
          documento: string | null;
          correo: string;
          categoria: string | null;
        };
      }
    ).estudiante;
    return {
      id: fila.id,
      nombre: estudiante?.nombre ?? "—",
      documento: estudiante?.documento ?? null,
      correo: estudiante?.correo ?? "—",
      categoria: estudiante?.categoria ?? null,
      fecha_inscripcion: fila.fecha_inscripcion.toISOString(),
    };
  });

  return { evento: serializarEventoDocente(evento, inscritos.length), inscritos };
}

/** Genera el CSV de inscritos (UTF-8 con BOM para Excel). */
export function construirCsvInscritos(inscritos: InscritoEventoDocente[]): string {
  const cabecera = ["Nombre", "Documento", "Categoría", "Correo", "Fecha de inscripción"];
  const celda = (valor: string): string => `"${valor.replace(/"/g, '""')}"`;
  const filas = inscritos.map((item) =>
    [
      item.nombre,
      item.documento ?? "",
      item.categoria ?? "",
      item.correo,
      new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(item.fecha_inscripcion)),
    ].map(celda),
  );
  return `\uFEFF${[cabecera.map(celda), ...filas].map((fila) => fila.join(",")).join("\r\n")}\r\n`;
}
