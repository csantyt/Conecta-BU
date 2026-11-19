/**
 * Reporte de asistencia de un deporte para el rol Administrador.
 *
 * A diferencia del reporte docente, no se limita a los horarios de un docente:
 * toma TODOS los horarios del deporte, de modo que el administrador obtiene el
 * consolidado completo (incluidos estudiantes y asistencia).
 *
 * El resultado tiene la misma forma que `ReporteDeporte`, por lo que se reutiliza
 * el generador de Excel del módulo (`construirReporteExcel`).
 */

import { Op } from "sequelize";
import {
  Asistencia,
  Deporte,
  HorarioDeporte,
  InscripcionDeporte,
  UsuarioPisu,
} from "../models/index.js";
import {
  DIAS_SEMANA,
  aprobacionMinima,
  calcularFilaReporte,
  semestreFinalizado,
  type FilaReporte,
} from "../utils/asistencia.js";
import type { ReporteDeporte, SesionReporte } from "./docenteService.js";

export class DeporteReporteNoEncontradoError extends Error {}

export async function calcularReporteAsistenciaDeporte(
  deporteId: string,
  ahora: Date = new Date(),
): Promise<ReporteDeporte> {
  const deporte = await Deporte.findByPk(deporteId);
  if (!deporte) {
    throw new DeporteReporteNoEncontradoError("El deporte no existe.");
  }

  const horarios = await HorarioDeporte.findAll({
    where: { deporte_id: deporteId },
    include: [{ model: UsuarioPisu, as: "docente", attributes: ["id", "nombre"] }],
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
    where: { deporte_id: deporteId, estado: "Activa" },
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

  const docentes = [
    ...new Set(
      horarios
        .map((h) => (h.get("docente") as UsuarioPisu | undefined)?.nombre)
        .filter((nombre): nombre is string => Boolean(nombre)),
    ),
  ];

  return {
    deporte: { id: deporte.id, nombre: deporte.nombre },
    docente: docentes.length > 0 ? docentes.join(", ") : "Administración PISU",
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
