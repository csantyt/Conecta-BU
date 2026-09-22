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

export async function sembrarServiciosDesarrolloHumano(): Promise<void> {
  let servicios = await Servicio.findAll();
  if (servicios.length === 0) {
    servicios = await Servicio.bulkCreate(SERVICIOS_INICIALES);
  }

  const horarios = await Horario.count();
  if (horarios > 0) {
    return;
  }

  const diasHabiles = [1, 2, 3, 4, 5];
  const registros = servicios.flatMap((servicio) =>
    diasHabiles.map((dia_semana) => ({
      servicio_id: servicio.id,
      profesional: "Bienestar Universitario",
      dia_semana,
      hora_inicio: "08:00:00",
      hora_fin: "09:00:00",
      cupo: 1,
    })),
  );

  await Horario.bulkCreate(registros);
}
