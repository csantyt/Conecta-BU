import type { CategoriaPisu } from "./constantes.js";
import { Deporte } from "./models/Deporte.js";
import { EventoDeporte } from "./models/EventoDeporte.js";
import { UsuarioPisu } from "./models/UsuarioPisu.js";

const DEPORTES_INICIALES: Array<{
  nombre: string;
  descripcion: string;
  cupo_maximo: number;
  categorias_permitidas: CategoriaPisu[];
}> = [
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
  {
    nombre: "Ajedrez Relámpago",
    descripcion: "Deporte de 1 cupo para pruebas de concurrencia.",
    cupo_maximo: 1,
    categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"],
  },
  {
    nombre: "Natación",
    descripcion: "Curso de natación solo para pregrado.",
    cupo_maximo: 12,
    categorias_permitidas: ["Pregrado"],
  },
];

const ESTUDIANTES_SEED: Array<{ nombre: string; correo: string; categoria: "Pregrado" | "Postgrado" | "Egresado" }> = [
  { nombre: "Estudiante Pregrado", correo: "pregrado@uniautonoma.edu.co", categoria: "Pregrado" },
  { nombre: "Estudiante Postgrado", correo: "postgrado@uniautonoma.edu.co", categoria: "Postgrado" },
  { nombre: "Estudiante Egresado", correo: "egresado@uniautonoma.edu.co", categoria: "Egresado" },
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

  const correos = new Set(
    (await UsuarioPisu.findAll({ attributes: ["correo"] })).map((item) => item.correo.toLowerCase()),
  );
  for (const estudiante of ESTUDIANTES_SEED) {
    if (correos.has(estudiante.correo.toLowerCase())) {
      continue;
    }
    await UsuarioPisu.create({
      nombre: estudiante.nombre,
      correo: estudiante.correo,
      rol: "Estudiante",
      categoria: estudiante.categoria,
      estado: true,
    });
  }

  const eventosExistentes = await EventoDeporte.count();
  if (eventosExistentes === 0) {
    const ahora = new Date();
    await EventoDeporte.bulkCreate([
      {
        nombre: "Torneo Relámpago de Ajedrez",
        descripcion: "Evento futuro de prueba.",
        fecha: new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000),
        lugar: "Sala de Juegos",
        cupo_maximo: 20,
        estado: true,
      },
      {
        nombre: "Festival Deportivo",
        descripcion: "Evento futuro para estudiantes.",
        fecha: new Date(ahora.getTime() + 14 * 24 * 60 * 60 * 1000),
        lugar: "Cancha Principal",
        cupo_maximo: 50,
        estado: true,
      },
      {
        nombre: "Evento Pasado",
        descripcion: "No debe aparecer en el catálogo.",
        fecha: new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000),
        lugar: "Auditorio",
        cupo_maximo: 30,
        estado: true,
      },
    ]);
  }
}
