import { Op } from "sequelize";
import type { CategoriaPisu } from "../constantes.js";
import { Asistencia } from "../models/Asistencia.js";
import { AsistenciaDetalle } from "../models/AsistenciaDetalle.js";
import { Deporte } from "../models/Deporte.js";
import { EventoDeporte } from "../models/EventoDeporte.js";
import { HorarioDeporte } from "../models/HorarioDeporte.js";
import { InscripcionDeporte } from "../models/InscripcionDeporte.js";
import { InscripcionEvento } from "../models/InscripcionEvento.js";
import { UsuarioPisu } from "../models/UsuarioPisu.js";
import type { UsuarioPisuSesion } from "../middlewares/tipos.js";
import { RecursoNoEncontradoError } from "./inscripcionesService.js";

export function plazoCancelacionVigente(): boolean {
  const inicioStr = process.env["SEMESTRE_INICIO"];
  const finStr = process.env["SEMESTRE_FIN"];
  if (!inicioStr || !finStr) {
    return true;
  }
  const inicio = new Date(inicioStr);
  const fin = new Date(finStr);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) {
    return true;
  }
  const puntoMedio = new Date(inicio.getTime() + (fin.getTime() - inicio.getTime()) / 2);
  return new Date() <= puntoMedio;
}

/**
 * Completa datos obligatorios del perfil del estudiante que no pueden
 * inventarse (p. ej. la categoría académica). Se le solicitan al usuario.
 */
export async function completarPerfilEstudiante(
  perfil: UsuarioPisuSesion,
  params: { categoria: CategoriaPisu },
): Promise<UsuarioPisu> {
  const ficha = await UsuarioPisu.findByPk(perfil.id);
  if (!ficha) {
    throw new RecursoNoEncontradoError("No se encontró tu perfil PISU.");
  }
  await ficha.update({ categoria: params.categoria });
  return ficha;
}

export async function listarInscripcionesEstudiante(
  perfil: UsuarioPisuSesion,
): Promise<Array<Record<string, unknown>>> {
  const inscripciones = await InscripcionDeporte.findAll({
    where: { estudiante_id: perfil.id },
    include: [{ association: "deporte" }],
    order: [["fecha_inscripcion", "DESC"]],
  });
  const puedeCancelar = plazoCancelacionVigente();
  return inscripciones.map((item) => ({
    ...item.toJSON(),
    puedeCancelar: item.estado === "Activa" && puedeCancelar,
  })) as unknown as Array<Record<string, unknown>>;
}

export async function listarHorariosDeInscripciones(perfil: UsuarioPisuSesion) {
  const inscripciones = await InscripcionDeporte.findAll({
    where: { estudiante_id: perfil.id, estado: "Activa" },
  });
  const deporteIds = inscripciones.map((item) => item.deporte_id);
  if (deporteIds.length === 0) {
    return [];
  }

  return HorarioDeporte.findAll({
    where: { deporte_id: { [Op.in]: deporteIds }, estado: true },
    include: [
      { model: Deporte, as: "deporte", attributes: ["id", "nombre"] },
      { association: "docente", attributes: ["id", "nombre"] },
    ],
    order: [
      ["dia_semana", "ASC"],
      ["hora_inicio", "ASC"],
    ],
  });
}

export type ResumenAsistenciaDeporte = {
  deporte_id: string;
  deporte: string;
  presentes: number;
  ausentes: number;
  porcentaje: number;
};

export async function listarAsistenciasEstudiante(perfil: UsuarioPisuSesion) {
  const asistencias = await AsistenciaDetalle.findAll({
    where: { estudiante_id: perfil.id },
    include: [
      {
        model: Asistencia,
        as: "asistencia",
        include: [
          {
            model: HorarioDeporte,
            as: "horario",
            attributes: ["id", "deporte_id", "dia_semana", "hora_inicio", "hora_fin", "lugar"],
            include: [{ model: Deporte, as: "deporte", attributes: ["id", "nombre"] }],
          },
        ],
      },
    ],
    order: [["fecha_registro", "DESC"]],
  });

  const porDeporte = new Map<string, ResumenAsistenciaDeporte>();
  for (const item of asistencias) {
    const asistencia = item.get("asistencia") as
      | (Asistencia & { horario?: HorarioDeporte & { deporte?: Deporte } })
      | undefined;
    const horario = asistencia?.horario;
    const deporteId = horario?.deporte_id ?? "sin-deporte";
    const fila = porDeporte.get(deporteId) ?? {
      deporte_id: deporteId,
      deporte: horario?.deporte?.nombre ?? "Deporte",
      presentes: 0,
      ausentes: 0,
      porcentaje: 0,
    };
    if (item.presente) {
      fila.presentes += 1;
    } else {
      fila.ausentes += 1;
    }
    porDeporte.set(deporteId, fila);
  }

  const resumen = [...porDeporte.values()].map((fila) => {
    const total = fila.presentes + fila.ausentes;
    return {
      ...fila,
      porcentaje: total === 0 ? 0 : Math.round((fila.presentes / total) * 100),
    };
  });

  return { asistencias, resumen };
}

export async function obtenerMiHorario(
  perfil: UsuarioPisuSesion,
): Promise<Record<string, unknown>> {
  const inscripcionesActivas = await InscripcionDeporte.findAll({
    where: { estudiante_id: perfil.id, estado: "Activa" },
  });
  const deporteIds = inscripcionesActivas.map((item) => item.deporte_id);

  const [horarios, eventosInscripciones] = await Promise.all([
    deporteIds.length === 0
      ? Promise.resolve([])
      : HorarioDeporte.findAll({
          where: { deporte_id: { [Op.in]: deporteIds }, estado: true },
          include: [
            { model: Deporte, as: "deporte", attributes: ["id", "nombre"] },
          ],
          order: [
            ["dia_semana", "ASC"],
            ["hora_inicio", "ASC"],
          ],
        }),
    InscripcionEvento.findAll({
      where: { estudiante_id: perfil.id, estado: "Activa" },
    }),
  ]);

  const eventoIds = eventosInscripciones.map((item) => item.evento_id);
  const eventos =
    eventoIds.length === 0
      ? []
      : await EventoDeporte.findAll({
          where: { id: { [Op.in]: eventoIds }, estado: true },
        });

  function horaDesdeFecha(fecha: Date): { dia: number; inicio: string; fin: string } {
    const dia = fecha.getDay();
    const inicio = `${String(fecha.getHours()).padStart(2, "0")}:${String(fecha.getMinutes()).padStart(2, "0")}:00`;
    const finDate = new Date(fecha.getTime() + 60 * 60 * 1000);
    const cruzaDia = finDate.getDay() !== dia;
    const fin = cruzaDia
      ? "23:59:59"
      : `${String(finDate.getHours()).padStart(2, "0")}:${String(finDate.getMinutes()).padStart(2, "0")}:00`;
    return { dia, inicio, fin };
  }

  const calendario: Record<number, unknown[]> = {};
  for (let dia = 0; dia <= 6; dia += 1) {
    calendario[dia] = [];
  }

  for (const horario of horarios) {
    (calendario[horario.dia_semana] ?? (calendario[horario.dia_semana] = [])).push(horario);
  }

  const eventosBloques = eventos.map((evento) => {
    const bloque = horaDesdeFecha(new Date(evento.fecha));
    return {
      evento_id: evento.id,
      nombre: evento.nombre,
      lugar: evento.lugar,
      fecha: evento.fecha,
      dia_semana: bloque.dia,
      hora_inicio: bloque.inicio,
      hora_fin: bloque.fin,
    };
  });

  for (const bloque of eventosBloques) {
    (calendario[bloque.dia_semana] ?? (calendario[bloque.dia_semana] = [])).push(bloque);
  }

  const totalInasistencias = await AsistenciaDetalle.count({
    where: {
      estudiante_id: perfil.id,
      presente: false,
    },
  });

  return {
    horarios,
    eventos: eventosBloques,
    inscripciones: inscripcionesActivas,
    calendario,
    totalInasistencias,
    total_inasistencias: totalInasistencias,
    misHorarios: horarios,
  };
}
