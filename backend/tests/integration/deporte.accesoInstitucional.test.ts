/**
 * Pruebas de integración de la sección 10.1 — acceso estudiantil para usuarios
 * que se autentican con un correo institucional `@uniautonoma.edu.co`.
 *
 * Escenarios obligatorios cubiertos:
 *  1. Un usuario con correo institucional entra al portal estudiantil y se le
 *     crea/vincula su perfil PISU una sola vez (sin duplicados).
 *  2. Se inscribe en un deporte disponible y la inscripción queda persistida.
 *  3. El deporte aparece en "Mis deportes" y su horario en "Mi horario".
 *  4. Con la asistencia registrada por el docente, el estudiante la consulta.
 *  5. Un correo de otro dominio no obtiene acceso a lo restringido.
 *  6. Una dirección con dominio parecido pero no idéntico es rechazada.
 *  7. Un usuario institucional no obtiene funciones de admin/docente por su
 *     correo; los roles elevados conservan sus permisos propios.
 *  8. Las inscripciones duplicadas y el sobrecupo los rechaza el backend.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../../src/app.js";
import { Usuario } from "../../src/modules/auth/models/Usuario.js";
import { ROLES } from "../../src/modules/auth/roles.js";
import type { CategoriaPisu } from "../../src/modules/deporte/constantes.js";
import { Asistencia } from "../../src/modules/deporte/models/Asistencia.js";
import { Deporte } from "../../src/modules/deporte/models/Deporte.js";
import { HorarioDeporte } from "../../src/modules/deporte/models/HorarioDeporte.js";
import { InscripcionDeporte } from "../../src/modules/deporte/models/InscripcionDeporte.js";
import { UsuarioPisu } from "../../src/modules/deporte/models/UsuarioPisu.js";
import "../../src/modules/deporte/models/index.js";
import { auth, crearSesionPisu, type SesionPrueba } from "../helpers/sesion.js";

const hoy = new Date();

function fechaISO(base: Date, dias: number): string {
  const fecha = new Date(base);
  fecha.setDate(fecha.getDate() + dias);
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function secretoJwt(): string {
  const valor = process.env["JWT_SECRET"];
  if (!valor) {
    throw new Error("JWT_SECRET es obligatorio para las pruebas.");
  }
  return valor;
}

describe("API Deporte — acceso con correo institucional (sección 10.1)", () => {
  const authIds: string[] = [];
  const pisuIds: string[] = [];
  const deporteIds: string[] = [];
  const horarioIds: string[] = [];

  let docente: SesionPrueba;
  let administrador: SesionPrueba;

  // Deportes de prueba: uno para inscribirse y otro con un único cupo.
  let deporteInscripcion: Deporte;
  let horarioInscripcion: HorarioDeporte;
  let deporteUnCupo: Deporte;

  // Estudiante institucional "nuevo": cuenta de Conecta SIN ficha PISU previa.
  let cuentaInstitucional: { id: string; token: string; email: string };

  /** Crea una cuenta de Conecta (auth) y firma un token como el login real. */
  async function crearCuentaConecta(
    email: string,
  ): Promise<{ id: string; token: string; email: string }> {
    const cuenta = await Usuario.create({
      email,
      nombre_completo: `Jest Institucional ${randomUUID().slice(0, 6)}`,
      rol: ROLES.USUARIO,
    });
    authIds.push(cuenta.id);
    const token = jwt.sign(
      { id: cuenta.id, email, rol: cuenta.rol },
      secretoJwt(),
      { expiresIn: "1h" },
    );
    return { id: cuenta.id, token, email };
  }

  async function crearDeporte(params: {
    nombre: string;
    cupo_maximo: number;
    conHorario: boolean;
    diaSemana?: number;
    horaInicio?: string;
    horaFin?: string;
    lugar?: string;
  }): Promise<{ deporte: Deporte; horario: HorarioDeporte | null }> {
    const deporte = await Deporte.create({
      nombre: params.nombre,
      descripcion: "Deporte de prueba Jest acceso institucional",
      cupo_maximo: params.cupo_maximo,
      categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"] as CategoriaPisu[],
      estado: true,
    });
    deporteIds.push(deporte.id);

    let horario: HorarioDeporte | null = null;
    if (params.conHorario) {
      horario = await HorarioDeporte.create({
        deporte_id: deporte.id,
        docente_id: docente.pisuId,
        dia_semana: params.diaSemana ?? 1,
        hora_inicio: params.horaInicio ?? "08:00:00",
        hora_fin: params.horaFin ?? "10:00:00",
        lugar: params.lugar ?? "Jest Cancha Institucional",
        estado: true,
      });
      horarioIds.push(horario.id);
    }
    return { deporte, horario };
  }

  async function perfilDe(authId: string): Promise<UsuarioPisu | null> {
    return UsuarioPisu.findOne({ where: { auth_usuario_id: authId } });
  }

  beforeAll(async () => {
    docente = await crearSesionPisu({ rolPisu: "Docente" });
    administrador = await crearSesionPisu({ rolPisu: "Administrador" });
    pisuIds.push(docente.pisuId, administrador.pisuId);
    authIds.push(docente.authId, administrador.authId);

    // Días distintos para no provocar cruces de horario entre pruebas.
    const diaUno = (hoy.getDay() + 1) % 7;
    const diaDos = (hoy.getDay() + 2) % 7;

    const primero = await crearDeporte({
      nombre: `Jest Fútbol Institucional ${randomUUID().slice(0, 4)}`,
      cupo_maximo: 20,
      conHorario: true,
      diaSemana: diaUno,
      horaInicio: "08:00:00",
      horaFin: "10:00:00",
      lugar: "Jest Cancha Institucional",
    });
    deporteInscripcion = primero.deporte;
    horarioInscripcion = primero.horario as HorarioDeporte;

    const segundo = await crearDeporte({
      nombre: `Jest Baloncesto Un Cupo ${randomUUID().slice(0, 4)}`,
      cupo_maximo: 1,
      conHorario: true,
      diaSemana: diaDos,
      horaInicio: "10:00:00",
      horaFin: "12:00:00",
      lugar: "Jest Coliseo Un Cupo",
    });
    deporteUnCupo = segundo.deporte;

    cuentaInstitucional = await crearCuentaConecta(
      `estudiante.${randomUUID().slice(0, 8)}@uniautonoma.edu.co`,
    );
  });

  afterAll(async () => {
    if (horarioIds.length > 0) {
      await Asistencia.destroy({ where: { horario_id: horarioIds } });
    }
    if (deporteIds.length > 0) {
      await InscripcionDeporte.destroy({ where: { deporte_id: deporteIds } });
    }
    if (pisuIds.length > 0) {
      await InscripcionDeporte.destroy({ where: { estudiante_id: pisuIds } });
    }
    if (horarioIds.length > 0) {
      await HorarioDeporte.destroy({ where: { id: horarioIds } });
    }
    if (deporteIds.length > 0) {
      await Deporte.destroy({ where: { id: deporteIds } });
    }
    if (authIds.length > 0) {
      await UsuarioPisu.destroy({ where: { auth_usuario_id: authIds } });
    }
    if (pisuIds.length > 0) {
      await UsuarioPisu.destroy({ where: { id: pisuIds } });
    }
    if (authIds.length > 0) {
      await Usuario.destroy({ where: { id: authIds } });
    }
  });

  it("1. el usuario institucional entra al portal estudiantil y se le crea su perfil una sola vez", async () => {
    const respuesta = await request(app)
      .get("/api/v1/deportes")
      .set(auth(cuentaInstitucional.token));

    expect(respuesta.status).toBe(200);

    const perfil = await perfilDe(cuentaInstitucional.id);
    expect(perfil).not.toBeNull();
    expect(perfil?.rol).toBe("Estudiante");
    expect(perfil?.correo).toBe(cuentaInstitucional.email);
    // No se inventan datos: la categoría nace vacía y la completa el usuario.
    expect(perfil?.categoria ?? null).toBeNull();

    // Una segunda visita no duplica el perfil.
    await request(app).get("/api/v1/deportes").set(auth(cuentaInstitucional.token));
    const cantidad = await UsuarioPisu.count({
      where: { auth_usuario_id: cuentaInstitucional.id },
    });
    expect(cantidad).toBe(1);
  });

  it("1b. varias peticiones simultáneas del primer ingreso no duplican el perfil", async () => {
    const nueva = await crearCuentaConecta(
      `estudiante.paralelo.${randomUUID().slice(0, 8)}@uniautonoma.edu.co`,
    );

    const respuestas = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app).get("/api/v1/deportes").set(auth(nueva.token)),
      ),
    );
    expect(respuestas.every((r) => r.status === 200)).toBe(true);

    const cantidad = await UsuarioPisu.count({
      where: { auth_usuario_id: nueva.id },
    });
    expect(cantidad).toBe(1);
  });

  it("2. completa la categoría y su inscripción queda persistida en la base de datos", async () => {
    // Sin categoría no se puede inscribir (no se inventa la categoría).
    const sinCategoria = await request(app)
      .post("/api/v1/estudiante/inscripciones")
      .set(auth(cuentaInstitucional.token))
      .send({ deporte_id: deporteInscripcion.id });
    expect(sinCategoria.status).toBe(400);
    expect(String(sinCategoria.body.message)).toMatch(/categor[ií]a/i);

    // Categoría inválida → 400.
    const invalida = await request(app)
      .patch("/api/v1/estudiante/perfil")
      .set(auth(cuentaInstitucional.token))
      .send({ categoria: "Doctorado" });
    expect(invalida.status).toBe(400);

    // El propio usuario completa su categoría.
    const patch = await request(app)
      .patch("/api/v1/estudiante/perfil")
      .set(auth(cuentaInstitucional.token))
      .send({ categoria: "Pregrado" });
    expect(patch.status).toBe(200);
    expect(patch.body.perfil.categoria).toBe("Pregrado");

    const inscripcion = await request(app)
      .post("/api/v1/estudiante/inscripciones")
      .set(auth(cuentaInstitucional.token))
      .send({ deporte_id: deporteInscripcion.id });
    expect(inscripcion.status).toBe(201);

    const perfil = await perfilDe(cuentaInstitucional.id);
    pisuIds.push(perfil?.id as string);
    const fila = await InscripcionDeporte.findOne({
      where: {
        estudiante_id: perfil?.id as string,
        deporte_id: deporteInscripcion.id,
        estado: "Activa",
      },
    });
    expect(fila).not.toBeNull();
  });

  it("3. tras inscribirse, el deporte aparece en Mis deportes y su horario en Mi horario", async () => {
    const inscripciones = await request(app)
      .get("/api/v1/estudiante/inscripciones")
      .set(auth(cuentaInstitucional.token));
    expect(inscripciones.status).toBe(200);
    const inscripcionesLista = inscripciones.body.inscripciones as Array<{
      deporte?: { id: string; nombre: string } | null;
    }>;
    expect(
      inscripcionesLista.some(
        (item) => item.deporte?.id === deporteInscripcion.id,
      ),
    ).toBe(true);

    const horarios = await request(app)
      .get("/api/v1/estudiante/horarios")
      .set(auth(cuentaInstitucional.token));
    expect(horarios.status).toBe(200);
    const horariosLista = horarios.body.horarios as Array<{
      deporte?: { id: string } | null;
      docente?: { nombre: string } | null;
    }>;
    const delHorario = horariosLista.find(
      (item) => item.deporte?.id === deporteInscripcion.id,
    );
    expect(delHorario).toBeTruthy();
    // Se ve el docente responsable de la actividad.
    expect(delHorario?.docente?.nombre).toContain("Jest Docente");
  });

  it("4. el estudiante consulta la asistencia que registró el docente", async () => {
    const perfil = await perfilDe(cuentaInstitucional.id);
    await Asistencia.create({
      horario_id: horarioInscripcion.id,
      estudiante_id: perfil?.id as string,
      docente_id: docente.pisuId,
      fecha: fechaISO(hoy, -1),
      presente: true,
      estado: "PRESENTE",
    });

    const asistencias = await request(app)
      .get("/api/v1/estudiante/asistencias")
      .set(auth(cuentaInstitucional.token));
    expect(asistencias.status).toBe(200);

    const resumen = asistencias.body.resumen as Array<{
      deporte_id: string;
      presentes: number;
      ausentes: number;
    }>;
    const fila = resumen.find((item) => item.deporte_id === deporteInscripcion.id);
    expect(fila?.presentes).toBe(1);
    expect(fila?.ausentes).toBe(0);
  });

  it("5. un correo de otro dominio no obtiene acceso a lo restringido", async () => {
    const ajeno = await crearCuentaConecta(
      `jest.ajeno.${randomUUID().slice(0, 8)}@gmail.com`,
    );

    const catalogo = await request(app)
      .get("/api/v1/deportes")
      .set(auth(ajeno.token));
    expect(catalogo.status).toBe(403);

    const portal = await request(app)
      .get("/api/v1/estudiante/perfil")
      .set(auth(ajeno.token));
    expect(portal.status).toBe(403);

    // No se le crea ninguna ficha PISU.
    expect(await perfilDe(ajeno.id)).toBeNull();
  });

  it("6. un dominio parecido pero no idéntico es rechazado", async () => {
    const impostor = await crearCuentaConecta(
      `estudiante.${randomUUID().slice(0, 6)}@uniautonoma.edu.co.otrodominio.com`,
    );

    const respuesta = await request(app)
      .get("/api/v1/deportes")
      .set(auth(impostor.token));
    expect(respuesta.status).toBe(403);
    expect(await perfilDe(impostor.id)).toBeNull();
  });

  it("7. el correo institucional no concede funciones de admin ni de docente", async () => {
    const admin = await request(app)
      .get("/api/v1/admin/eventos")
      .set(auth(cuentaInstitucional.token));
    expect(admin.status).toBe(403);

    const docenteListado = await request(app)
      .get("/api/v1/deportes/docente/eventos")
      .set(auth(cuentaInstitucional.token));
    expect(docenteListado.status).toBe(403);

    const docenteCrear = await request(app)
      .post("/api/v1/deportes/docente/eventos")
      .set(auth(cuentaInstitucional.token))
      .send({ nombre: "No debería crearse" });
    expect(docenteCrear.status).toBe(403);

    // Los roles elevados conservan sus permisos actuales.
    const adminPropio = await request(app)
      .get("/api/v1/admin/eventos")
      .set(auth(administrador.token));
    expect(adminPropio.status).toBe(200);

    const docentePropio = await request(app)
      .get("/api/v1/deportes/docente/eventos")
      .set(auth(docente.token));
    expect(docentePropio.status).toBe(200);
  });

  it("8. rechaza inscripciones duplicadas y evita el sobrecupo", async () => {
    // Duplicada: ya está inscrito en deporteInscripcion.
    const duplicada = await request(app)
      .post("/api/v1/estudiante/inscripciones")
      .set(auth(cuentaInstitucional.token))
      .send({ deporte_id: deporteInscripcion.id });
    expect(duplicada.status).toBe(409);

    const activas = await InscripcionDeporte.count({
      where: {
        estudiante_id: (await perfilDe(cuentaInstitucional.id))?.id as string,
        deporte_id: deporteInscripcion.id,
        estado: "Activa",
      },
    });
    expect(activas).toBe(1);

    // Sobrecupo: el deporteUnCupo tiene un solo lugar.
    const primero = await crearSesionPisu({
      rolPisu: "Estudiante",
      categoria: "Pregrado",
    });
    pisuIds.push(primero.pisuId);
    authIds.push(primero.authId);

    const segundo = await crearSesionPisu({
      rolPisu: "Estudiante",
      categoria: "Pregrado",
    });
    pisuIds.push(segundo.pisuId);
    authIds.push(segundo.authId);

    const llena = await request(app)
      .post("/api/v1/estudiante/inscripciones")
      .set(auth(primero.token))
      .send({ deporte_id: deporteUnCupo.id });
    expect(llena.status).toBe(201);

    const sobre = await request(app)
      .post("/api/v1/estudiante/inscripciones")
      .set(auth(segundo.token))
      .send({ deporte_id: deporteUnCupo.id });
    expect(sobre.status).toBe(409);

    expect(
      await InscripcionDeporte.count({
        where: { deporte_id: deporteUnCupo.id, estado: "Activa" },
      }),
    ).toBe(1);
  });
});
