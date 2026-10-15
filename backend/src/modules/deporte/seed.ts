import { randomBytes, scryptSync } from "node:crypto";
import type { CategoriaPisu } from "./constantes.js";
import { Deporte } from "./models/Deporte.js";
import { EventoDeporte } from "./models/EventoDeporte.js";
import { HorarioDeporte } from "./models/HorarioDeporte.js";
import { InscripcionDeporte } from "./models/InscripcionDeporte.js";
import { UsuarioPisu } from "./models/UsuarioPisu.js";

const DEPORTES_INICIALES: Array<{
  nombre: string;
  descripcion: string;
  cupo_maximo: number;
  categorias_permitidas: CategoriaPisu[];
}> = [
  {
    nombre: "Fútbol",
    descripcion: "Entrenamiento y recreación en cancha. Cupo según categoría.",
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
    nombre: "Atletismo",
    descripcion: "Entrenamiento de pista y campo para todos los niveles.",
    cupo_maximo: 30,
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

function hashear(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export async function sembrarDeportesPisu(): Promise<void> {
  const existentes = await Deporte.findAll({ attributes: ["nombre"] });
  const nombres = new Set(existentes.map((item) => item.nombre.trim().toLowerCase()));

  for (const item of DEPORTES_INICIALES) {
    if (nombres.has(item.nombre.trim().toLowerCase())) {
      continue;
    }
    await Deporte.create(item);
  }

  if ((await UsuarioPisu.count({ where: { rol: "Administrador" } })) === 0) {
    await UsuarioPisu.create({
      nombre: "Administrador Deporte",
      correo: "admin.deporte@uniautonoma.edu.co",
      password_hash: hashear("Admin123*"),
      rol: "Administrador",
      estado: true,
    });
  }

  const docentesExistentes = await UsuarioPisu.count({ where: { rol: "Docente" } });
  if (docentesExistentes === 0) {
    await Promise.all(
      ["Ana Martínez", "Carlos Pérez", "Laura Gómez", "Miguel Torres"].map((nombre, index) =>
        UsuarioPisu.create({
          nombre,
          correo: `docente${index + 1}@uniautonoma.edu.co`,
          password_hash: hashear("Docente123*"),
          rol: "Docente",
          estado: true,
        }),
      ),
    );
  }

  const categorias: CategoriaPisu[] = ["Pregrado", "Postgrado", "Egresado"];
  if ((await UsuarioPisu.count({ where: { rol: "Estudiante" } })) < 10) {
    const estudiantes: UsuarioPisu[] = [];
    for (let i = 0; i < 10; i += 1) {
      const correo = `estudiante${i + 1}@uniautonoma.edu.co`;
      let estudiante = await UsuarioPisu.findOne({ where: { correo } });
      if (!estudiante) {
        estudiante = await UsuarioPisu.create({
          nombre: `Estudiante ${i + 1}`,
          correo,
          password_hash: hashear("Estudiante123*"),
          rol: "Estudiante",
          categoria: categorias[i % categorias.length],
          estado: true,
        });
      }
      estudiantes.push(estudiante);
    }

    const docentes = await UsuarioPisu.findAll({
      where: { rol: "Docente" },
      order: [["nombre", "ASC"]],
      limit: 4,
    });
    const deportes = await Deporte.findAll({ order: [["nombre", "ASC"]] });
    const futbol = deportes.find((d) => d.nombre === "Fútbol");
    if (futbol && docentes[0]) {
      const horarioExistente = await HorarioDeporte.findOne({
        where: { deporte_id: futbol.id, docente_id: docentes[0].id },
      });
      if (!horarioExistente) {
        await HorarioDeporte.create({
          deporte_id: futbol.id,
          docente_id: docentes[0].id,
          dia_semana: 1,
          hora_inicio: "08:00:00",
          hora_fin: "10:00:00",
          lugar: "Cancha principal",
          estado: true,
        });
      }
      for (let i = 0; i < 3 && estudiantes[i]; i += 1) {
        const existe = await InscripcionDeporte.findOne({
          where: { estudiante_id: estudiantes[i]!.id, deporte_id: futbol.id, estado: "Activa" },
        });
        if (!existe) {
          await InscripcionDeporte.create({
            estudiante_id: estudiantes[i]!.id,
            deporte_id: futbol.id,
            estado: "Activa",
          });
        }
      }
    }
  }

  if ((await EventoDeporte.count()) === 0) {
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
