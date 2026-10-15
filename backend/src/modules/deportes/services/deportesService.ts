import { Op, type InferAttributes } from "sequelize";
import { Alerta } from "../models/Alerta.js";
import { Deporte } from "../models/Deporte.js";
import { HorarioDeporte } from "../models/HorarioDeporte.js";
import { InscripcionDeporte } from "../models/InscripcionDeporte.js";
import type { UsuarioPisuSesion } from "../middlewares/tipos.js";

export type DeporteCatalogo = InferAttributes<Deporte> & {
  cupo_disponible: number;
  inscrito: boolean;
  inscripcion_id: string | null;
  horarios: HorarioDeporte[];
};

export async function listarDeportesActivos(
  perfil?: UsuarioPisuSesion,
): Promise<DeporteCatalogo[]> {
  const deportes = await Deporte.findAll({
    where: { estado: true },
    order: [["nombre", "ASC"]],
  });

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

  return deportes.map((deporte) => {
    const usados = conteo.get(deporte.id) ?? 0;
    return {
      ...deporte.toJSON(),
      cupo_disponible: Math.max(0, deporte.cupo_maximo - usados),
      inscrito: inscritoEn.has(deporte.id),
      inscripcion_id: inscritoEn.get(deporte.id) ?? null,
      horarios: horarios.filter((item) => item.deporte_id === deporte.id),
    };
  });
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
