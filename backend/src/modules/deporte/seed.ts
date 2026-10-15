import bcrypt from "bcryptjs";
import { Usuario } from "../auth/models/Usuario.js";
import type { CategoriaPisu } from "./constantes.js";
import { Deporte } from "./models/Deporte.js";
import { Comunicado } from "./models/Comunicado.js";
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

  if (process.env["NODE_ENV"] === "production") {
    return;
  }

  const passwordPlano = process.env["SEED_DOCENTE_PASSWORD"] ?? "docente123";
  const passwordHash = await bcrypt.hash(passwordPlano, 10);

  const cuentaKevin = await Usuario.findOrCreate({
    where: { email: "kevin.ruiz.m@uniautonoma.edu.co" },
    defaults: {
      email: "kevin.ruiz.m@uniautonoma.edu.co",
      nombre_completo: "Kevin Ruiz M",
      rol: "DOCENTE",
    },
  });
  await cuentaKevin[0].update({ rol: "DOCENTE", nombre_completo: "Kevin Ruiz M" });

  const perfilKevin = await UsuarioPisu.findOrCreate({
    where: { correo: "kevin.ruiz.m@uniautonoma.edu.co" },
    defaults: {
      auth_usuario_id: cuentaKevin[0].id,
      nombre: "Kevin Ruiz M",
      correo: "kevin.ruiz.m@uniautonoma.edu.co",
      rol: "Docente",
      categoria: null,
      password_hash: passwordHash,
    },
  });
  await perfilKevin[0].update({
    auth_usuario_id: cuentaKevin[0].id,
    nombre: "Kevin Ruiz M",
    rol: "Docente",
    password_hash: passwordHash,
    estado: true,
  });

  const cuentaOtro = await Usuario.findOrCreate({
    where: { email: "docente2.deporte@uniautonoma.edu.co" },
    defaults: {
      email: "docente2.deporte@uniautonoma.edu.co",
      nombre_completo: "Docente PISU Adicional",
      rol: "DOCENTE",
    },
  });
  const perfilOtro = await UsuarioPisu.findOrCreate({
    where: { correo: "docente2.deporte@uniautonoma.edu.co" },
    defaults: {
      auth_usuario_id: cuentaOtro[0].id,
      nombre: "Docente PISU Adicional",
      correo: "docente2.deporte@uniautonoma.edu.co",
      rol: "Docente",
      categoria: null,
      password_hash: passwordHash,
    },
  });
  await perfilOtro[0].update({ rol: "Docente", password_hash: passwordHash, estado: true });

  const ahora = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }),
  );
  const diaHoy = ahora.getDay();
  const fechaHoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(
    ahora.getDate(),
  ).padStart(2, "0")}`;

  const futbol = await Deporte.findOne({ where: { nombre: "Fútbol" } });
  const baloncesto = await Deporte.findOne({ where: { nombre: "Baloncesto" } });

  if (futbol) {
    await HorarioDeporte.findOrCreate({
      where: {
        deporte_id: futbol.id,
        docente_id: perfilKevin[0].id,
        dia_semana: diaHoy,
        hora_inicio: "08:00:00",
        hora_fin: "10:00:00",
      },
      defaults: {
        deporte_id: futbol.id,
        docente_id: perfilKevin[0].id,
        dia_semana: diaHoy,
        hora_inicio: "08:00:00",
        hora_fin: "10:00:00",
        lugar: "Cancha principal",
        estado: true,
      },
    });
  }

  if (baloncesto) {
    await HorarioDeporte.findOrCreate({
      where: {
        deporte_id: baloncesto.id,
        docente_id: perfilKevin[0].id,
        dia_semana: diaHoy,
        hora_inicio: "10:30:00",
        hora_fin: "12:00:00",
      },
      defaults: {
        deporte_id: baloncesto.id,
        docente_id: perfilKevin[0].id,
        dia_semana: diaHoy,
        hora_inicio: "10:30:00",
        hora_fin: "12:00:00",
        lugar: "Coliseo",
        estado: true,
      },
    });
  }

  const deporteBase = futbol ?? baloncesto;
  if (deporteBase) {
    await HorarioDeporte.findOrCreate({
      where: {
        deporte_id: deporteBase.id,
        docente_id: perfilOtro[0].id,
        dia_semana: diaHoy,
        hora_inicio: "07:00:00",
        hora_fin: "09:00:00",
      },
      defaults: {
        deporte_id: deporteBase.id,
        docente_id: perfilOtro[0].id,
        dia_semana: diaHoy,
        hora_inicio: "07:00:00",
        hora_fin: "09:00:00",
        lugar: "Cancha auxiliar",
        estado: true,
      },
    });

    const estudiantes: { nombre: string; correo: string; categoria: CategoriaPisu }[] = [
      {
        nombre: "Estudiante PISU Uno",
        correo: "estudiante1.pisu@uniautonoma.edu.co",
        categoria: "Pregrado",
      },
      {
        nombre: "Estudiante PISU Dos",
        correo: "estudiante2.pisu@uniautonoma.edu.co",
        categoria: "Postgrado",
      },
    ];
    for (const est of estudiantes) {
      const perfilEst = await UsuarioPisu.findOrCreate({
        where: { correo: est.correo },
        defaults: {
          nombre: est.nombre,
          correo: est.correo,
          rol: "Estudiante",
          categoria: est.categoria,
        },
      });
      await InscripcionDeporte.findOrCreate({
        where: {
          estudiante_id: perfilEst[0].id,
          deporte_id: deporteBase.id,
          estado: "Activa",
        },
        defaults: {
          estudiante_id: perfilEst[0].id,
          deporte_id: deporteBase.id,
          estado: "Activa",
        },
      });
    }
  }

  await Comunicado.findOrCreate({
    where: { titulo: "Bienvenido docente" },
    defaults: {
      titulo: "Bienvenido docente",
      mensaje:
        "Recuerda registrar la asistencia dentro de la ventana permitida. Si no hay clases hoy, revisa tu horario en administración.",
      audiencia: "Docentes",
    },
  });

  // Crear eventos deportivos de prueba
  const ahoraEventos = new Date();
  const eventosIniciales = [
    {
      nombre: "Torneo Relámpago de Ajedrez",
      descripcion: "Evento futuro de prueba.",
      fecha: new Date(ahoraEventos.getTime() + 7 * 24 * 60 * 60 * 1000),
      lugar: "Sala de Juegos",
      cupo_maximo: 20,
      estado: true,
    },
    {
      nombre: "Festival Deportivo",
      descripcion: "Evento futuro para estudiantes.",
      fecha: new Date(ahoraEventos.getTime() + 14 * 24 * 60 * 60 * 1000),
      lugar: "Cancha Principal",
      cupo_maximo: 50,
      estado: true,
    },
    {
      nombre: "Evento Pasado",
      descripcion: "No debe aparecer en el catálogo.",
      fecha: new Date(ahoraEventos.getTime() - 7 * 24 * 60 * 60 * 1000),
      lugar: "Auditorio",
      cupo_maximo: 30,
      estado: true,
    },
  ];

  for (const ev of eventosIniciales) {
    await EventoDeporte.findOrCreate({
      where: { nombre: ev.nombre },
      defaults: ev,
    });
  }
}