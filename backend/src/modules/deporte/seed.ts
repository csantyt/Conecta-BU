import { Deporte } from "./models/Deporte.js";

const DEPORTES_INICIALES = [
  {
    nombre: "Fútbol",
    descripcion: "Entrenamiento y recréate en cancha. Cupo según categoría.",
    cupo_maximo: 22,
    categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"],
  },
  {
    nombre: "Baloncesto",
    descripcion: "Práctica formativa de baloncesto para la comunidad universitaria.",
    cupo_maximo: 16,
    categorias_permitidas: ["Pregrado", "Postgrado"],
  },
  {
    nombre: "Voleibol",
    descripcion: "Sesiones de voleibol recreativo y formativo.",
    cupo_maximo: 14,
    categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"],
  },
];

export async function sembrarDeportesPisu(): Promise<void> {
  const existentes = await Deporte.findAll({ attributes: ["nombre"] });
  const nombres = new Set(existentes.map((item) => item.nombre.trim().toLowerCase()));

  for (const item of DEPORTES_INICIALES) {
    if (nombres.has(item.nombre.trim().toLowerCase())) {
      continue;
    }
    await Deporte.create(item);
  }
}
