import { Op, UniqueConstraintError } from "sequelize";
import { UMBRAL_INASISTENCIAS_ALERTA } from "../constantes.js";
import { Alerta } from "../models/Alerta.js";
import { Asistencia } from "../models/Asistencia.js";
import { Deporte } from "../models/Deporte.js";
import { HorarioDeporte } from "../models/HorarioDeporte.js";

export function nivelDeInasistencias(ausencias: number): number {
  return Math.floor(ausencias / UMBRAL_INASISTENCIAS_ALERTA);
}

export function claveAlertaInasistencias(params: {
  deporteId: string;
  estudianteId: string;
  nivel: number;
}): string {
  return `inasistencias:${params.deporteId}:${params.estudianteId}:${params.nivel}`;
}

/**
 * Cada vez que un estudiante alcanza un múltiplo del umbral de inasistencias en un
 * deporte (3, 6, 9…) se crea una alerta personal. La columna `clave` es única, así
 * que repetir el cálculo (p. ej. al editar asistencia) no duplica avisos.
 */
export async function generarAlertasInasistencia(params: {
  deporteId: string;
  estudianteIds: string[];
}): Promise<Alerta[]> {
  if (params.estudianteIds.length === 0) {
    return [];
  }

  const [deporte, horarios] = await Promise.all([
    Deporte.findByPk(params.deporteId, { attributes: ["id", "nombre"] }),
    HorarioDeporte.findAll({
      where: { deporte_id: params.deporteId },
      attributes: ["id"],
    }),
  ]);
  if (!deporte || horarios.length === 0) {
    return [];
  }
  const horarioIds = horarios.map((item) => item.id);

  const creadas: Alerta[] = [];
  for (const estudianteId of new Set(params.estudianteIds)) {
    const ausencias = await Asistencia.count({
      where: {
        estudiante_id: estudianteId,
        presente: false,
        horario_id: { [Op.in]: horarioIds },
      },
    });
    const nivel = nivelDeInasistencias(ausencias);
    if (nivel < 1) {
      continue;
    }

    const clave = claveAlertaInasistencias({
      deporteId: deporte.id,
      estudianteId,
      nivel,
    });
    const existe = await Alerta.findOne({ where: { clave }, attributes: ["id"] });
    if (existe) {
      continue;
    }

    try {
      creadas.push(
        await Alerta.create({
          titulo: `Inasistencias en ${deporte.nombre}`,
          mensaje: `Llevas ${ausencias} inasistencias en ${deporte.nombre}. La asistencia regular es requisito del programa PISU; si tienes una dificultad, habla con tu docente o con Bienestar.`,
          audiencia: "Estudiantes",
          estudiante_id: estudianteId,
          clave,
        }),
      );
    } catch (error) {
      if (!(error instanceof UniqueConstraintError)) {
        throw error;
      }
    }
  }

  return creadas;
}
