import { randomBytes, scryptSync } from "node:crypto";
import type { CategoriaPisu } from "./constantes.js";
import { CATEGORIAS_PISU } from "./constantes.js";
import { Deporte } from "./models/Deporte.js";
import { EventoDeporte } from "./models/EventoDeporte.js";
<<<<<<< HEAD
import { HorarioDeporte } from "./models/HorarioDeporte.js";
import { InscripcionDeporte } from "./models/InscripcionDeporte.js";
=======
>>>>>>> origin/main
import { UsuarioPisu } from "./models/UsuarioPisu.js";

const DEPORTES_INICIALES: Array<{
  nombre: string;
  descripcion: string;
  cupo_maximo: number;
  categorias_permitidas: CategoriaPisu[];
  imagen?: string;
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
<<<<<<< HEAD
    nombre: "Atletismo",
    descripcion: "Entrenamiento de pista y campo para todos los niveles.",
    cupo_maximo: 30,
    categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"],
  },
=======
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
>>>>>>> origin/main
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

<<<<<<< HEAD
  if ((await UsuarioPisu.count({ where: { rol: "Administrador" } })) === 0) {
    await UsuarioPisu.create({
      nombre: "Administrador Deporte",
      correo: "admin.deporte@uniautonoma.edu.co",
      password_hash: hashear("Admin123*"),
      rol: "Administrador",
=======
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
>>>>>>> origin/main
      estado: true,
    });
  }

<<<<<<< HEAD
  const docentesExistentes = await UsuarioPisu.count({ where: { rol: "Docente" } });
  if (docentesExistentes === 0) {
    await Promise.all(
      ["Ana Martínez", "Carlos Pérez", "Laura Gómez"].map((nombre, index) =>
        UsuarioPisu.create({
          nombre,
          correo: `docente${index + 1}@uniautonoma.edu.co`,
          password_hash: hashear("Docente123*"),
          rol: "Docente",
          especialidad: ["Entrenamiento deportivo", "Acondicionamiento", "Deportes de conjunto"][index],
          estado: true,
        }),
      ),
    );
  }

  const docentes = await UsuarioPisu.findAll({
    where: { rol: "Docente" },
    order: [["nombre", "ASC"]],
    limit: 3,
  });

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

    const deportes = await Deporte.findAll({ order: [["nombre", "ASC"]] });
    const fútbol = deportes.find((d) => d.nombre === "Fútbol");
    if (fútbol && docentes[0]) {
      const horarioExistente = await HorarioDeporte.findOne({
        where: { deporte_id: fútbol.id, docente_id: docentes[0].id },
      });
      if (!horarioExistente) {
        await HorarioDeporte.create({
          deporte_id: fútbol.id,
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
          where: { estudiante_id: estudiantes[i]!.id, deporte_id: fútbol.id, estado: "Activa" },
        });
        if (!existe) {
          await InscripcionDeporte.create({
            estudiante_id: estudiantes[i]!.id,
            deporte_id: fútbol.id,
            estado: "Activa",
          });
        }
      }
    }
  }


  if ((await EventoDeporte.count()) === 0) {
    await EventoDeporte.bulkCreate([
      { nombre: 'Torneo intersemestral', descripcion: 'Competencia entre equipos.', fecha: new Date('2026-11-15T09:00:00-05:00'), lugar: 'Cancha principal', tipo: 'torneo', cupo_maximo: 12, estado: true },
      { nombre: 'Masterclass de entrenamiento', descripcion: 'Clase abierta con invitado.', fecha: new Date('2026-11-20T15:00:00-05:00'), lugar: 'Auditorio', tipo: 'masterclass', cupo_maximo: 40, estado: true },
      { nombre: 'D�a recreativo PISU', descripcion: 'Actividades deportivas y recreaci�n.', fecha: new Date('2026-12-01T08:00:00-05:00'), lugar: 'Cancha principal', tipo: 'otro', cupo_maximo: 80, estado: true },
=======
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
>>>>>>> origin/main
    ]);
  }
}
