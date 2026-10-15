/**
 * Semilla (seed) del módulo Deporte PISU.
 *
 * ¿Para qué sirve?
 * Deja la base lista para probar cada rol sin usar datos simulados en el
 * frontend: deportes, un administrador, docentes (incluido KEVIN, docente de
 * prueba), estudiantes, horarios, inscripciones, asistencia de ejemplo y
 * comunicados.
 *
 * ¿Cómo se relaciona con los demás?
 * La llama `server.ts` al iniciar. Es IDEMPOTENTE: se puede ejecutar muchas
 * veces sin duplicar información (busca por nombre/correo antes de crear).
 *
 * Inicio de sesión: el proyecto entra solo con Google institucional. Al
 * pre-registrar el correo de Kevin en `deporte.usuarios` con rol Docente, al
 * autenticarse con Google queda con el rol Docente.
 */

import { randomBytes, scryptSync } from "node:crypto";
import type { CategoriaPisu } from "./constantes.js";
import { Alerta } from "./models/Alerta.js";
import { Asistencia } from "./models/Asistencia.js";
import { Deporte } from "./models/Deporte.js";
import { DeporteDocente } from "./models/DeporteDocente.js";
import { EventoDeporte } from "./models/EventoDeporte.js";
import { HorarioDeporte } from "./models/HorarioDeporte.js";
import { InscripcionDeporte } from "./models/InscripcionDeporte.js";
import { InscripcionEvento } from "./models/InscripcionEvento.js";
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

/** Docente de prueba principal (el que usa la interfaz del docente). */
const CORREO_KEVIN = "kevin.ruiz.m@uniautonoma.edu.co";
/** Segundo docente: es dueño de un deporte que Kevin NO debe ver. */
const CORREO_SOFIA = "sofia.herrera@uniautonoma.edu.co";

const CATEGORIAS: CategoriaPisu[] = ["Pregrado", "Postgrado", "Egresado"];

function hashear(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function minutosAHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** Fecha ISO `YYYY-MM-DD` sumando (o restando) días a una base. */
function fechaISO(base: Date, dias: number): string {
  const fecha = new Date(base);
  fecha.setDate(fecha.getDate() + dias);
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Devuelve un rango horario de hoy que SIEMPRE contiene la hora actual, para
 * que la ventana de asistencia esté abierta cuando se pruebe la aplicación.
 * Ejemplo: si son las 10:20, devuelve 09:50–11:20.
 */
function horarioDeHoy(): { inicio: string; fin: string } {
  const ahora = new Date();
  let inicioMin = ahora.getHours() * 60 + ahora.getMinutes() - 30;
  if (inicioMin < 0) {
    inicioMin = 0;
  }
  let finMin = inicioMin + 90;
  if (finMin > 23 * 60 + 59) {
    finMin = 23 * 60 + 59;
    inicioMin = Math.max(0, finMin - 90);
  }
  return { inicio: minutosAHora(inicioMin), fin: minutosAHora(finMin) };
}

async function obtenerOCrearDocente(params: {
  nombre: string;
  correo: string;
}): Promise<UsuarioPisu> {
  const [docente] = await UsuarioPisu.findOrCreate({
    where: { correo: params.correo },
    defaults: {
      nombre: params.nombre,
      correo: params.correo,
      password_hash: hashear("Docente123*"),
      rol: "Docente",
      estado: true,
    },
  });
  return docente;
}

async function obtenerOCrearEstudiante(params: {
  nombre: string;
  correo: string;
  categoria: CategoriaPisu;
}): Promise<UsuarioPisu> {
  const [estudiante] = await UsuarioPisu.findOrCreate({
    where: { correo: params.correo },
    defaults: {
      nombre: params.nombre,
      correo: params.correo,
      password_hash: hashear("Estudiante123*"),
      rol: "Estudiante",
      categoria: params.categoria,
      estado: true,
    },
  });
  return estudiante;
}

async function asegurarHorario(params: {
  deporteId: string;
  docenteId: string;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  lugar: string;
}): Promise<HorarioDeporte> {
  const existente = await HorarioDeporte.findOne({
    where: { deporte_id: params.deporteId, docente_id: params.docenteId },
  });
  if (existente) {
    return existente;
  }
  return HorarioDeporte.create({
    deporte_id: params.deporteId,
    docente_id: params.docenteId,
    dia_semana: params.diaSemana,
    hora_inicio: params.horaInicio,
    hora_fin: params.horaFin,
    lugar: params.lugar,
    estado: true,
  });
}

/**
 * Asegura la asignación DIRECTA docente ↔ deporte (la que hace el administrador
 * desde la lista de Docentes). Es idempotente: si ya existe, no hace nada.
 * Gracias a esto el panel del docente muestra el deporte aunque aún no tenga
 * horarios publicados.
 */
async function asegurarAsignacionDocenteDeporte(
  docenteId: string,
  deporteId: string,
): Promise<void> {
  const existente = await DeporteDocente.findOne({
    where: { docente_id: docenteId, deporte_id: deporteId },
  });
  if (!existente) {
    await DeporteDocente.create({ docente_id: docenteId, deporte_id: deporteId });
  }
}

async function asegurarInscripcion(estudianteId: string, deporteId: string): Promise<void> {
  const existe = await InscripcionDeporte.findOne({
    where: { estudiante_id: estudianteId, deporte_id: deporteId, estado: "Activa" },
  });
  if (!existe) {
    await InscripcionDeporte.create({
      estudiante_id: estudianteId,
      deporte_id: deporteId,
      estado: "Activa",
    });
  }
}

async function asegurarAsistencia(params: {
  horarioId: string;
  estudianteId: string;
  docenteId: string;
  fecha: string;
  presente: boolean;
}): Promise<void> {
  const existe = await Asistencia.findOne({
    where: {
      horario_id: params.horarioId,
      estudiante_id: params.estudianteId,
      fecha: params.fecha,
    },
  });
  if (!existe) {
    await Asistencia.create({
      horario_id: params.horarioId,
      estudiante_id: params.estudianteId,
      docente_id: params.docenteId,
      fecha: params.fecha,
      presente: params.presente,
    });
  }
}

/**
 * Crea el docente Kevin con su deporte "Fútbol" (clase HOY dentro de la ventana
 * y 8 sesiones pasadas con faltas variadas) y "Baloncesto" (2 horarios y 6
 * estudiantes), más un deporte de otra docente y uno sin docente.
 */
async function sembrarDocenteKevin(): Promise<void> {
  const kevin = await obtenerOCrearDocente({ nombre: "Kevin Ruiz", correo: CORREO_KEVIN });
  const sofia = await obtenerOCrearDocente({ nombre: "Sofía Herrera", correo: CORREO_SOFIA });

  const futbol = await Deporte.findOne({ where: { nombre: "Fútbol" } });
  const baloncesto = await Deporte.findOne({ where: { nombre: "Baloncesto" } });
  const voleibol = await Deporte.findOne({ where: { nombre: "Voleibol" } });

  if (!futbol || !baloncesto || !voleibol) {
    return;
  }

  // ---- Deporte A: Fútbol (clase hoy + 8 sesiones pasadas) ----
  await asegurarAsignacionDocenteDeporte(kevin.id, futbol.id);
  const hoy = new Date();
  const rangoHoy = horarioDeHoy();
  const horarioFutbol = await asegurarHorario({
    deporteId: futbol.id,
    docenteId: kevin.id,
    diaSemana: hoy.getDay(),
    horaInicio: rangoHoy.inicio,
    horaFin: rangoHoy.fin,
    lugar: "Cancha principal",
  });

  const estudiantesFutbol: UsuarioPisu[] = [];
  for (let i = 0; i < 12; i += 1) {
    const numero = String(i + 1).padStart(2, "0");
    estudiantesFutbol.push(
      await obtenerOCrearEstudiante({
        nombre: `Estudiante PISU ${numero}`,
        correo: `estudiante.pisu.${numero}@uniautonoma.edu.co`,
        categoria: CATEGORIAS[i % CATEGORIAS.length]!,
      }),
    );
    await asegurarInscripcion(estudiantesFutbol[i]!.id, futbol.id);
  }

  // Faltas objetivo por estudiante sobre 8 clases. Con el mínimo del 80 % se
  // puede faltar a lo sumo 1 clase: a partir de 2 se reprueba.
  const faltasObjetivo = [0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 6];
  for (let sesion = 0; sesion < 8; sesion += 1) {
    const fecha = fechaISO(hoy, -(7 * (sesion + 1)));
    for (let i = 0; i < estudiantesFutbol.length; i += 1) {
      await asegurarAsistencia({
        horarioId: horarioFutbol.id,
        estudianteId: estudiantesFutbol[i]!.id,
        docenteId: kevin.id,
        fecha,
        presente: (faltasObjetivo[i] ?? 0) <= sesion,
      });
    }
  }

  // ---- Deporte B: Baloncesto (2 horarios en días distintos, 6 estudiantes) ----
  await asegurarAsignacionDocenteDeporte(kevin.id, baloncesto.id);
  const diaUno = (hoy.getDay() + 2) % 7;
  const diaDos = (hoy.getDay() + 4) % 7;
  const horarioBasketUno = await asegurarHorario({
    deporteId: baloncesto.id,
    docenteId: kevin.id,
    diaSemana: diaUno,
    horaInicio: "10:00:00",
    horaFin: "12:00:00",
    lugar: "Coliseo",
  });
  await asegurarHorario({
    deporteId: baloncesto.id,
    docenteId: kevin.id,
    diaSemana: diaDos,
    horaInicio: "14:00:00",
    horaFin: "16:00:00",
    lugar: "Coliseo",
  });

  const estudiantesBasket: UsuarioPisu[] = [];
  for (let i = 0; i < 6; i += 1) {
    const numero = String(i + 1).padStart(2, "0");
    estudiantesBasket.push(
      await obtenerOCrearEstudiante({
        nombre: `Baloncestista PISU ${numero}`,
        correo: `basket.pisu.${numero}@uniautonoma.edu.co`,
        categoria: CATEGORIAS[i % CATEGORIAS.length]!,
      }),
    );
    await asegurarInscripcion(estudiantesBasket[i]!.id, baloncesto.id);
  }
  for (let sesion = 0; sesion < 3; sesion += 1) {
    const fecha = fechaISO(hoy, -(7 * (sesion + 1)));
    for (let i = 0; i < estudiantesBasket.length; i += 1) {
      await asegurarAsistencia({
        horarioId: horarioBasketUno.id,
        estudianteId: estudiantesBasket[i]!.id,
        docenteId: kevin.id,
        fecha,
        presente: i % 3 !== 0 || sesion === 0,
      });
    }
  }

  // ---- Deporte de OTRA docente: Voleibol (Kevin NO debe verlo) ----
  await asegurarAsignacionDocenteDeporte(sofia.id, voleibol.id);
  const horarioVoleibol = await asegurarHorario({
    deporteId: voleibol.id,
    docenteId: sofia.id,
    diaSemana: (hoy.getDay() + 1) % 7,
    horaInicio: "08:00:00",
    horaFin: "10:00:00",
    lugar: "Cancha auxiliar",
  });
  for (let i = 0; i < 3; i += 1) {
    const numero = String(i + 1).padStart(2, "0");
    const estudiante = await obtenerOCrearEstudiante({
      nombre: `Voleibolista PISU ${numero}`,
      correo: `voleibol.pisu.${numero}@uniautonoma.edu.co`,
      categoria: CATEGORIAS[i % CATEGORIAS.length]!,
    });
    await asegurarInscripcion(estudiante.id, voleibol.id);
    await asegurarAsistencia({
      horarioId: horarioVoleibol.id,
      estudianteId: estudiante.id,
      docenteId: sofia.id,
      fecha: fechaISO(hoy, -7),
      presente: i !== 0,
    });
  }

  // ---- "Atletismo" queda SIN docente: debe verse vacío en el panel ----
}

/**
 * Asegura un evento creado por un docente (idempotente, busca por nombre+creador)
 * y registra sus inscripciones de ejemplo.
 */
async function asegurarEventoDocente(params: {
  nombre: string;
  descripcion: string;
  creadoPorId: string;
  deporteId: string;
  tipo: string;
  fecha: Date;
  horaInicio: string;
  horaFin: string;
  lugar: string;
  cupoMaximo: number;
  fechaLimite?: Date | null;
  categoriasPermitidas?: CategoriaPisu[];
  estadoEvento?: "publicado" | "cancelado";
  motivoCancelacion?: string | null;
  inscritos?: string[];
}): Promise<EventoDeporte> {
  let evento = await EventoDeporte.findOne({
    where: { nombre: params.nombre, creado_por_id: params.creadoPorId },
  });
  if (!evento) {
    evento = await EventoDeporte.create({
      nombre: params.nombre,
      descripcion: params.descripcion,
      tipo: params.tipo,
      fecha: params.fecha,
      hora_inicio: params.horaInicio,
      hora_fin: params.horaFin,
      lugar: params.lugar,
      cupo_maximo: params.cupoMaximo,
      fecha_limite_inscripcion: params.fechaLimite ?? null,
      categorias_permitidas: params.categoriasPermitidas ?? null,
      estado_evento: params.estadoEvento ?? "publicado",
      motivo_cancelacion: params.motivoCancelacion ?? null,
      deporte_id: params.deporteId,
      creado_por_id: params.creadoPorId,
      estado: true,
    });
  }
  for (const estudianteId of params.inscritos ?? []) {
    const existe = await InscripcionEvento.findOne({
      where: { evento_id: evento.id, estudiante_id: estudianteId, estado: "Activa" },
    });
    if (!existe) {
      await InscripcionEvento.create({
        evento_id: evento.id,
        estudiante_id: estudianteId,
        estado: "Activa",
      });
    }
  }
  return evento;
}

/**
 * Eventos de ejemplo del docente Kevin:
 * - un torneo próximo con 3 inscritos,
 * - una masterclass con el cupo casi lleno,
 * - un evento cancelado con motivo,
 * - un evento de OTRA docente (Sofía) para comprobar que Kevin no lo administra.
 */
async function sembrarEventosDocente(): Promise<void> {
  const kevin = await UsuarioPisu.findOne({ where: { correo: CORREO_KEVIN } });
  const sofia = await UsuarioPisu.findOne({ where: { correo: CORREO_SOFIA } });
  const futbol = await Deporte.findOne({ where: { nombre: "Fútbol" } });
  const baloncesto = await Deporte.findOne({ where: { nombre: "Baloncesto" } });
  const voleibol = await Deporte.findOne({ where: { nombre: "Voleibol" } });
  if (!kevin || !sofia || !futbol || !baloncesto || !voleibol) {
    return;
  }

  const hoy = new Date();
  const futbolistas = await UsuarioPisu.findAll({
    where: {
      correo: ["01", "02", "03", "04"].map(
        (n) => `estudiante.pisu.${n}@uniautonoma.edu.co`,
      ),
    },
    order: [["correo", "ASC"]],
  });
  const basketistas = await UsuarioPisu.findAll({
    where: {
      correo: ["01", "02", "03", "04"].map(
        (n) => `basket.pisu.${n}@uniautonoma.edu.co`,
      ),
    },
    order: [["correo", "ASC"]],
  });

  await asegurarEventoDocente({
    nombre: "Torneo relámpago de fútbol",
    descripcion: "Torneo interno por categorías. Inscripción abierta.",
    creadoPorId: kevin.id,
    deporteId: futbol.id,
    tipo: "Torneo",
    fecha: new Date(`${fechaISO(hoy, 7)}T00:00:00`),
    horaInicio: "16:00",
    horaFin: "18:00",
    lugar: "Cancha sintética",
    cupoMaximo: 16,
    fechaLimite: new Date(`${fechaISO(hoy, 5)}T23:59:00`),
    inscritos: futbolistas.slice(0, 3).map((item) => item.id),
  });

  await asegurarEventoDocente({
    nombre: "Masterclass de baloncesto",
    descripcion: "Fundamentos de tiro y defensa con el entrenador invitado.",
    creadoPorId: kevin.id,
    deporteId: baloncesto.id,
    tipo: "Masterclass",
    fecha: new Date(`${fechaISO(hoy, 10)}T00:00:00`),
    horaInicio: "10:00",
    horaFin: "12:00",
    lugar: "Coliseo auxiliar",
    cupoMaximo: 5,
    fechaLimite: new Date(`${fechaISO(hoy, 8)}T23:59:00`),
    inscritos: basketistas.slice(0, 4).map((item) => item.id),
  });

  await asegurarEventoDocente({
    nombre: "Amistoso de fútbol suspendido",
    descripcion: "Partido amistoso programado.",
    creadoPorId: kevin.id,
    deporteId: futbol.id,
    tipo: "Amistoso",
    fecha: new Date(`${fechaISO(hoy, 5)}T00:00:00`),
    horaInicio: "08:00",
    horaFin: "10:00",
    lugar: "Cancha principal",
    cupoMaximo: 20,
    estadoEvento: "cancelado",
    motivoCancelacion: "Pronóstico de lluvia fuerte en la ciudad.",
  });

  await asegurarEventoDocente({
    nombre: "Clínica de voleibol",
    descripcion: "Clínica de fundamentos organizada por Sofía.",
    creadoPorId: sofia.id,
    deporteId: voleibol.id,
    tipo: "Jornada de práctica",
    fecha: new Date(`${fechaISO(hoy, 6)}T00:00:00`),
    horaInicio: "08:00",
    horaFin: "10:00",
    lugar: "Cancha auxiliar",
    cupoMaximo: 12,
  });
}

/** Comunicados de ejemplo: uno para Docentes y otro para Todos. */async function sembrarComunicados(): Promise<void> {
  const comunicados = [
    {
      titulo: "Reunión de docentes PISU",
      mensaje:
        "El viernes a las 3:00 p. m. se realizará la reunión de docentes de deportes. Recuerda registrar la asistencia de tus clases en la aplicación.",
      audiencia: "Docentes" as const,
    },
    {
      titulo: "Festival deportivo institucional",
      mensaje:
        "Inscripciones abiertas para el festival deportivo. Consulta con tu docente las disciplinas disponibles.",
      audiencia: "Todos" as const,
    },
  ];
  for (const comunicado of comunicados) {
    await Alerta.findOrCreate({
      where: { clave: `comunicado:${comunicado.titulo}` },
      defaults: {
        titulo: comunicado.titulo,
        mensaje: comunicado.mensaje,
        audiencia: comunicado.audiencia,
        clave: `comunicado:${comunicado.titulo}`,
      },
    });
  }
}

/** Imprime en consola las cuentas de prueba agrupadas por rol. */
async function imprimirUsuariosDePrueba(): Promise<void> {
  const usuarios = await UsuarioPisu.findAll({
    attributes: ["nombre", "correo", "rol", "estado"],
    order: [
      ["rol", "ASC"],
      ["nombre", "ASC"],
    ],
  });
  console.log("\n=== Usuarios de prueba PISU (inicio de sesión con Google institucional) ===");
  for (const rol of ["Administrador", "Docente", "Estudiante"] as const) {
    const delRol = usuarios.filter((u) => u.rol === rol);
    if (delRol.length === 0) continue;
    console.log(`\n${rol} (${delRol.length}):`);
    for (const usuario of delRol) {
      console.log(`  - ${usuario.nombre} <${usuario.correo}>${usuario.estado ? "" : " [INACTIVO]"}`);
    }
  }
  console.log("\nCuenta docente principal: Kevin Ruiz <" + CORREO_KEVIN + ">\n");
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

  // Datos del rol docente (Kevin) y comunicados.
  await sembrarDocenteKevin();
  await sembrarEventosDocente();
  await sembrarComunicados();
  await imprimirUsuariosDePrueba();
}
