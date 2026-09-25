import { QueryTypes } from "sequelize";
import { sequelize } from "../../../config/database.js";
import { SCHEMAS } from "../../../config/schemas.js";

export type DashboardDesarrolloHumano = {
  citas_mes_actual: number;
  porcentaje_asistencia: number;
  eventos_activos: number;
  consultas_ia: number;
  detalle_asistencia: {
    atendidas: number;
    no_asistio: number;
    agendadas: number;
    canceladas: number;
    total_mes: number;
  };
};

type FilaConteo = { total: string | number };
type FilaAsistencia = {
  atendidas: string | number;
  no_asistio: string | number;
  agendadas: string | number;
  canceladas: string | number;
  total_mes: string | number;
};

function aNumero(valor: string | number | undefined): number {
  const n = Number(valor ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function obtenerDashboardDesarrolloHumano(): Promise<DashboardDesarrolloHumano> {
  const schema = SCHEMAS.desarrolloHumano;

  const [asistencia] = await sequelize.query<FilaAsistencia>(
    `
    SELECT
      COUNT(*) FILTER (
        WHERE estado = 'ASISTIO'
          AND fecha_hora >= date_trunc('month', CURRENT_TIMESTAMP)
          AND fecha_hora < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
      ) AS atendidas,
      COUNT(*) FILTER (
        WHERE estado = 'NO_ASISTIO'
          AND fecha_hora >= date_trunc('month', CURRENT_TIMESTAMP)
          AND fecha_hora < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
      ) AS no_asistio,
      COUNT(*) FILTER (
        WHERE estado = 'AGENDADA'
          AND fecha_hora >= date_trunc('month', CURRENT_TIMESTAMP)
          AND fecha_hora < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
      ) AS agendadas,
      COUNT(*) FILTER (
        WHERE estado = 'CANCELADA'
          AND fecha_hora >= date_trunc('month', CURRENT_TIMESTAMP)
          AND fecha_hora < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
      ) AS canceladas,
      COUNT(*) FILTER (
        WHERE fecha_hora >= date_trunc('month', CURRENT_TIMESTAMP)
          AND fecha_hora < date_trunc('month', CURRENT_TIMESTAMP) + INTERVAL '1 month'
      ) AS total_mes
    FROM "${schema}".citas
    `,
    { type: QueryTypes.SELECT },
  );

  const [eventos] = await sequelize.query<FilaConteo>(
    `
    SELECT COUNT(*)::int AS total
    FROM "${schema}".eventos
    WHERE activo = true
      AND fecha_inicio >= CURRENT_TIMESTAMP
    `,
    { type: QueryTypes.SELECT },
  );

  let consultasIa = 0;
  try {
    const [consultas] = await sequelize.query<FilaConteo>(
      `
      SELECT COUNT(*)::int AS total
      FROM "${schema}".consultas_ia
      `,
      { type: QueryTypes.SELECT },
    );
    consultasIa = aNumero(consultas?.total);
  } catch {
    consultasIa = 0;
  }

  const atendidas = aNumero(asistencia?.atendidas);
  const totalMes = aNumero(asistencia?.total_mes);
  const baseAsistencia =
    atendidas + aNumero(asistencia?.no_asistio);
  const porcentaje =
    baseAsistencia > 0
      ? Math.round((atendidas / baseAsistencia) * 1000) / 10
      : 0;

  return {
    citas_mes_actual: totalMes,
    porcentaje_asistencia: porcentaje,
    eventos_activos: aNumero(eventos?.total),
    consultas_ia: consultasIa,
    detalle_asistencia: {
      atendidas,
      no_asistio: aNumero(asistencia?.no_asistio),
      agendadas: aNumero(asistencia?.agendadas),
      canceladas: aNumero(asistencia?.canceladas),
      total_mes: totalMes,
    },
  };
}
