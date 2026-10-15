/**
 * Utilidades de asistencia y aprobación del módulo Deporte PISU.
 *
 * ¿Para qué sirve este archivo?
 * Concentra las REGLAS DE NEGOCIO del rol Docente para que el servicio, el
 * controlador y los tests usen exactamente la misma fórmula:
 *   - La ventana horaria en la que se puede "llamar a lista".
 *   - El plazo de 24 horas para corregir una asistencia después de la clase.
 *   - El criterio de aprobación de un deporte (porcentaje mínimo de asistencia).
 *
 * ¿Cómo se relaciona con los demás?
 * `docenteService.ts` importa estas funciones para validar y calcular; los
 * valores configurables salen de las variables de entorno del backend.
 */

import { normalizarHora } from "./horarios.js";

export const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

const MINUTOS_ANTES_POR_DEFECTO = 15;
const MINUTOS_DESPUES_POR_DEFECTO = 120;
const APROBACION_POR_DEFECTO = 80;
const HORAS_EDICION = 24;

function leerNumero(nombre: string, porDefecto: number): number {
  const valor = Number(process.env[nombre]);
  return Number.isFinite(valor) && valor >= 0 ? valor : porDefecto;
}

/** Minutos antes del inicio de la clase en que se abre la toma de asistencia. */
export function minutosAntes(): number {
  return leerNumero("ASISTENCIA_MINUTOS_ANTES", MINUTOS_ANTES_POR_DEFECTO);
}

/** Minutos después del fin de la clase en que se cierra la toma de asistencia. */
export function minutosDespues(): number {
  return leerNumero("ASISTENCIA_MINUTOS_DESPUES", MINUTOS_DESPUES_POR_DEFECTO);
}

/**
 * Modo de pruebas: si `ASISTENCIA_IGNORAR_HORARIO=true` la ventana se salta.
 * Sirve para tomar asistencia a cualquier hora durante el desarrollo.
 */
export function ignorarHorario(): boolean {
  return String(process.env["ASISTENCIA_IGNORAR_HORARIO"] ?? "").toLowerCase() === "true";
}

/** Porcentaje mínimo de asistencia para aprobar (por defecto 80). */
export function aprobacionMinima(): number {
  const valor = Number(process.env["APROBACION_MIN_ASISTENCIA"]);
  if (!Number.isFinite(valor) || valor <= 0 || valor > 100) {
    return APROBACION_POR_DEFECTO;
  }
  return valor;
}

/**
 * Convierte una fecha ISO corta (`YYYY-MM-DD`) más una hora (`HH:MM[:SS]`) en un
 * `Date` local. Se construye por partes para evitar que `new Date("2026-01-01")`
 * se interprete como UTC y desplace el día según la zona horaria.
 */
export function construirFechaHora(fecha: string, hora: string): Date {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const [horas, minutos] = normalizarHora(hora).split(":").map(Number);
  return new Date(
    anio ?? 1970,
    (mes ?? 1) - 1,
    dia ?? 1,
    horas ?? 0,
    minutos ?? 0,
    0,
    0,
  );
}

export type VentanaAsistencia = {
  /** ¿Se puede tomar asistencia en este instante? */
  abierta: boolean;
  /** Momento en que se habilita. */
  desde: Date;
  /** Momento en que se cierra. */
  hasta: Date;
  /** Explicación legible cuando `abierta` es false. */
  motivo: string | null;
};

/**
 * Evalúa la ventana horaria de una sesión.
 *
 * Regla (RF-015): solo se toma asistencia el día de la clase y entre
 * `inicio - ASISTENCIA_MINUTOS_ANTES` y `fin + ASISTENCIA_MINUTOS_DESPUES`.
 *
 * Ejemplo numérico: clase lunes 16:00–18:00, con 15 min antes y 120 min después,
 * la ventana abre a las 15:45 y cierra a las 20:00. Si intento a las 14:00 el
 * backend responde 422; si intento a las 17:00 se registra.
 *
 * @param params.diaSemana Día de la semana del horario (0=domingo … 6=sábado).
 * @param params.horaInicio Hora de inicio del horario.
 * @param params.horaFin Hora de fin del horario.
 * @param params.fecha Fecha de la sesión en formato `YYYY-MM-DD`.
 * @param params.ahora Instante de referencia (por defecto, ahora).
 */
export function evaluarVentanaAsistencia(params: {
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  fecha: string;
  ahora?: Date;
}): VentanaAsistencia {
  const ahora = params.ahora ?? new Date();
  const inicioSesion = construirFechaHora(params.fecha, params.horaInicio);
  const finSesion = construirFechaHora(params.fecha, params.horaFin);
  const desde = new Date(inicioSesion.getTime() - minutosAntes() * 60_000);
  const hasta = new Date(finSesion.getTime() + minutosDespues() * 60_000);

  if (ignorarHorario()) {
    return { abierta: true, desde, hasta, motivo: null };
  }

  if (inicioSesion.getDay() !== params.diaSemana) {
    return {
      abierta: false,
      desde,
      hasta,
      motivo: `La fecha ${params.fecha} no corresponde al ${DIAS_SEMANA[params.diaSemana]} de esta clase.`,
    };
  }

  if (ahora.getTime() < desde.getTime()) {
    return {
      abierta: false,
      desde,
      hasta,
      motivo: `Aún no se habilita. Podrás tomar asistencia desde las ${horaCorta(desde)} del ${fechaLarga(params.fecha)}.`,
    };
  }

  if (ahora.getTime() > hasta.getTime()) {
    return {
      abierta: false,
      desde,
      hasta,
      motivo: `La ventana de esta clase ya cerró (terminó el ${horaCorta(hasta)} del ${fechaLarga(params.fecha)}).`,
    };
  }

  return { abierta: true, desde, hasta, motivo: null };
}

/**
 * ¿Sigue vigente el plazo de 24 horas para corregir una asistencia?
 *
 * Se cuenta desde el FIN de la clase, no desde el momento de guardar, porque el
 * requisito es "dentro de las 24 horas posteriores a la clase".
 * Ejemplo: clase lunes 16:00–18:00 → se puede editar hasta el martes 18:00.
 */
export function dentroPlazoEdicion(params: {
  fecha: string;
  horaFin: string;
  ahora?: Date;
}): boolean {
  const ahora = params.ahora ?? new Date();
  const finSesion = construirFechaHora(params.fecha, params.horaFin);
  const limite = finSesion.getTime() + HORAS_EDICION * 60 * 60 * 1000;
  return ahora.getTime() <= limite;
}

export type EstadoAsistencia = "Al día" | "En riesgo" | "Reprobaría" | "Sin clases registradas";

/**
 * Clasifica a un estudiante según su porcentaje de asistencia.
 *
 * Regla (RF-017): aprueba quien alcanza `APROBACION_MIN_ASISTENCIA` (80 % por
 * defecto). Se marca "En riesgo" cuando le resta poco margen: puede fallar a lo
 * sumo una clase más sin reprobar.
 *
 * Ejemplo numérico con 10 clases y mínimo 80 %: se puede faltar a 2; quien tiene
 * 2 faltas está "En riesgo" y quien tiene 3 "Reprobaría".
 */
export function clasificarAsistencia(params: {
  presentes: number;
  dictadas: number;
}): EstadoAsistencia {
  const { presentes, dictadas } = params;
  if (dictadas <= 0) {
    return "Sin clases registradas";
  }
  const min = aprobacionMinima();
  const margenFaltas = Math.floor((dictadas * (100 - min)) / 100);
  const faltas = dictadas - presentes;
  const porcentaje = (presentes / dictadas) * 100;
  if (porcentaje >= min) {
    return faltas >= margenFaltas ? "En riesgo" : "Al día";
  }
  return "Reprobaría";
}

/** ¿Aprueba el estudiante con `presentes` de `dictadas`? */
export function apruebaMateria(presentes: number, dictadas: number): boolean {
  if (dictadas <= 0) {
    return false;
  }
  return (presentes / dictadas) * 100 >= aprobacionMinima();
}

export function horaCorta(fecha: Date): string {
  return `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}`;
}

export function fechaLarga(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const date = new Date(anio ?? 1970, (mes ?? 1) - 1, dia ?? 1);
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Semestre configurado (sirve para saber si el reporte es final o parcial). */
export function semestreFinalizado(ahora: Date = new Date()): boolean {
  const fin = process.env["SEMESTRE_FIN"];
  if (!fin) {
    return false;
  }
  const fechaFin = new Date(fin);
  if (Number.isNaN(fechaFin.getTime())) {
    return false;
  }
  return ahora.getTime() > fechaFin.getTime();
}

export type FilaReporte = {
  estudiante_id: string;
  nombre: string;
  documento: string | null;
  correo: string | null;
  categoria: string | null;
  presentes: number;
  faltas: number;
  dictadas: number;
  porcentaje: number;
  aprobado: boolean;
  estado: EstadoAsistencia;
};

/**
 * Calcula el reporte de asistencia de un deporte para un estudiante.
 *
 * Fórmula: porcentaje = clases asistidas / clases dictadas × 100.
 * Aprueba si porcentaje >= APROBACION_MIN_ASISTENCIA.
 * Ejemplo: 12 clases dictadas y mínimo 80 % → hasta 2 faltas para aprobar.
 */
export function calcularFilaReporte(params: {
  estudiante_id: string;
  nombre: string;
  documento: string | null;
  correo: string | null;
  categoria: string | null;
  presentes: number;
  dictadas: number;
}): FilaReporte {
  const porcentaje =
    params.dictadas > 0 ? Math.round((params.presentes / params.dictadas) * 100) : 0;
  const faltas = Math.max(0, params.dictadas - params.presentes);
  return {
    estudiante_id: params.estudiante_id,
    nombre: params.nombre,
    documento: params.documento,
    correo: params.correo,
    categoria: params.categoria,
    presentes: params.presentes,
    faltas,
    dictadas: params.dictadas,
    porcentaje,
    aprobado: apruebaMateria(params.presentes, params.dictadas),
    estado: clasificarAsistencia({ presentes: params.presentes, dictadas: params.dictadas }),
  };
}
