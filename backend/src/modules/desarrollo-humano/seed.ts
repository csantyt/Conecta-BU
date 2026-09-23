import { sequelize } from "../../config/database.js";
import { Cita } from "./models/Cita.js";
import { Horario } from "./models/Horario.js";
import { Servicio } from "./models/Servicio.js";

const SERVICIOS_INICIALES = [
  {
    nombre: "Acompañamiento psicológico",
    descripcion:
      "Espacio de escucha y orientación para el bienestar emocional de la comunidad universitaria.",
  },
  {
    nombre: "Orientación vocacional",
    descripcion:
      "Apoyo para la toma de decisiones académicas y el proyecto de vida profesional.",
  },
  {
    nombre: "Talleres de desarrollo humano",
    descripcion:
      "Encuentros formativos en habilidades para la vida, convivencia y crecimiento personal.",
  },
];

function claveNombre(nombre: string): string {
  return nombre.trim().toLowerCase();
}

function claveHorario(horario: Horario): string {
  return `${horario.dia_semana}|${String(horario.hora_inicio).slice(0, 8)}|${String(horario.hora_fin).slice(0, 8)}`;
}

async function deduplicarServiciosPorNombre(): Promise<void> {
  const servicios = await Servicio.findAll({
    order: [
      ["fecha_creacion", "ASC"],
      ["id", "ASC"],
    ],
  });

  const grupos = new Map<string, Servicio[]>();
  for (const servicio of servicios) {
    const clave = claveNombre(servicio.nombre);
    const grupo = grupos.get(clave) ?? [];
    grupo.push(servicio);
    grupos.set(clave, grupo);
  }

  await sequelize.transaction(async (transaction) => {
    for (const grupo of grupos.values()) {
      if (grupo.length < 2) {
        continue;
      }

      const [conservado, ...duplicados] = grupo;
      const horariosConservados = await Horario.findAll({
        where: { servicio_id: conservado.id },
        transaction,
      });
      const indice = new Map(horariosConservados.map((item) => [claveHorario(item), item]));

      for (const duplicado of duplicados) {
        const horariosDuplicados = await Horario.findAll({
          where: { servicio_id: duplicado.id },
          transaction,
        });

        for (const horario of horariosDuplicados) {
          const equivalente = indice.get(claveHorario(horario));
          if (equivalente) {
            await Cita.update(
              { horario_id: equivalente.id, servicio_id: conservado.id },
              { where: { horario_id: horario.id }, transaction },
            );
            await horario.destroy({ transaction });
          } else {
            await horario.update({ servicio_id: conservado.id }, { transaction });
            indice.set(claveHorario(horario), horario);
          }
        }

        await Cita.update(
          { servicio_id: conservado.id },
          { where: { servicio_id: duplicado.id }, transaction },
        );
        await duplicado.destroy({ transaction });
      }
    }
  });
}

async function asegurarIndiceUnicoNombre(): Promise<void> {
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS servicios_nombre_unico
      ON desarrollo_humano.servicios (lower(trim(nombre)));
  `);
}

async function sembrarServiciosFaltantes(): Promise<Servicio[]> {
  const existentes = await Servicio.findAll();
  const porNombre = new Set(existentes.map((item) => claveNombre(item.nombre)));

  for (const item of SERVICIOS_INICIALES) {
    if (!porNombre.has(claveNombre(item.nombre))) {
      const creado = await Servicio.create(item);
      existentes.push(creado);
      porNombre.add(claveNombre(item.nombre));
    }
  }

  return existentes;
}

async function sembrarHorariosSiFaltan(servicios: Servicio[]): Promise<void> {
  const diasHabiles = [1, 2, 3, 4, 5];

  for (const servicio of servicios) {
    const cantidad = await Horario.count({ where: { servicio_id: servicio.id } });
    if (cantidad > 0) {
      continue;
    }

    await Horario.bulkCreate(
      diasHabiles.map((dia_semana) => ({
        servicio_id: servicio.id,
        profesional: "Bienestar Universitario",
        dia_semana,
        hora_inicio: "08:00:00",
        hora_fin: "09:00:00",
        cupo: 1,
      })),
    );
  }
}

export async function sembrarServiciosDesarrolloHumano(): Promise<void> {
  await deduplicarServiciosPorNombre();
  await asegurarIndiceUnicoNombre();
  const servicios = await sembrarServiciosFaltantes();
  await sembrarHorariosSiFaltan(servicios);
  console.log(
    `Servicios de Desarrollo humano listos: ${servicios.length} (nombres únicos).`,
  );
}
