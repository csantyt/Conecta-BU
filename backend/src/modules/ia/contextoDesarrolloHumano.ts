import { QueryTypes } from "sequelize";
import { sequelize } from "../../config/database.js";

export type EventoDisponible = {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  fecha_limite_inscripcion: Date | null;
  cupo_total: number;
  cupo_disponible: number;
};

export async function listarEventosDisponiblesParaIa(): Promise<EventoDisponible[]> {
  return sequelize.query(
    `
      SELECT
        e.id,
        e.titulo,
        e.descripcion,
        e.fecha_inicio,
        e.fecha_fin,
        e.fecha_limite_inscripcion,
        e.cupo_total,
        GREATEST(
          e.cupo_total - COUNT(i.id) FILTER (WHERE i.estado = 'INSCRITO'),
          0
        )::int AS cupo_disponible
      FROM desarrollo_humano.eventos e
      LEFT JOIN desarrollo_humano.inscripciones i
        ON i.evento_id = e.id
      WHERE e.activo = TRUE
        AND e.fecha_inicio >= NOW()
      GROUP BY e.id
      HAVING GREATEST(
        e.cupo_total - COUNT(i.id) FILTER (WHERE i.estado = 'INSCRITO'),
        0
      ) > 0
      ORDER BY e.fecha_inicio ASC
    `,
    { type: QueryTypes.SELECT },
  ) as Promise<EventoDisponible[]>;
}

export const SERVICIOS_CONTEXTO_IA = [
  {
    nombre: "Acompañamiento psicológico",
    uso: "Agenda una cita de orientación con un profesional. El chat no reemplaza esa atención.",
  },
  {
    nombre: "Orientación vocacional",
    uso: "Apoyo para decisiones académicas y proyecto de vida. Se agenda desde Citas.",
  },
  {
    nombre: "Talleres de desarrollo humano",
    uso: "Eventos e inscripciones con cupo y fecha límite en la pestaña Eventos.",
  },
];
