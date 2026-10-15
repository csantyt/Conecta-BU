/**
 * Pruebas de integración del rol Docente (módulo Deporte PISU).
 *
 * Cubren: aislamiento de deportes por docente, 403 en deporte ajeno, ventana
 * horaria (422 y modo pruebas), 409 por duplicado, edición a 24 h, solo
 * inscripción activa, cálculo del reporte, Excel con 3 hojas y 403 para
 * estudiante/administrador en las rutas `/docente`.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import ExcelJS from "exceljs";
import request from "supertest";
import app from "../../src/app.js";
import { Usuario } from "../../src/modules/auth/models/Usuario.js";
import type { CategoriaPisu } from "../../src/modules/deporte/constantes.js";
import { Asistencia } from "../../src/modules/deporte/models/Asistencia.js";
import { Deporte } from "../../src/modules/deporte/models/Deporte.js";
import { DeporteDocente } from "../../src/modules/deporte/models/DeporteDocente.js";
import { HorarioDeporte } from "../../src/modules/deporte/models/HorarioDeporte.js";
import { InscripcionDeporte } from "../../src/modules/deporte/models/InscripcionDeporte.js";
import { UsuarioPisu } from "../../src/modules/deporte/models/UsuarioPisu.js";
import "../../src/modules/deporte/models/index.js";
import { auth, crearSesionPisu, type SesionPrueba } from "../helpers/sesion.js";

function fechaISO(base: Date, dias: number): string {
  const fecha = new Date(base);
  fecha.setDate(fecha.getDate() + dias);
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function minutosAHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

describe("API Deporte — rol Docente", () => {
  const sesiones: SesionPrueba[] = [];
  const pisuCreados: string[] = [];
  const deportesCreados: string[] = [];
  const horariosCreados: string[] = [];

  let docenteA: SesionPrueba;
  let docenteB: SesionPrueba;
  let estudiante: SesionPrueba;
  let administrador: SesionPrueba;

  let deporteA: Deporte;
  let deporteB: Deporte;
  let deporteReporte: Deporte;
  let deporteVacio: Deporte;
  let deporteAsignado: Deporte;

  let horarioAbierto: HorarioDeporte;
  let horarioOtroDia: HorarioDeporte;
  let horarioReporte: HorarioDeporte;

  let alumnosA: UsuarioPisu[];
  let alumnoCancelado: UsuarioPisu;
  let alumnoAprobado: UsuarioPisu;
  let alumnoReprobado: UsuarioPisu;
  let alumnoSinClases: UsuarioPisu;
  let alumnoAsignado: UsuarioPisu;

  const hoy = new Date();
  const fechaHoy = fechaISO(hoy, 0);

  async function crearDeporte(nombre: string, cupo = 30): Promise<Deporte> {
    const deporte = await Deporte.create({
      nombre,
      descripcion: "Deporte de prueba Jest",
      cupo_maximo: cupo,
      categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"],
      estado: true,
    });
    deportesCreados.push(deporte.id);
    return deporte;
  }

  async function crearHorario(params: {
    deporteId: string;
    docenteId: string;
    diaSemana: number;
    horaInicio: string;
    horaFin: string;
  }): Promise<HorarioDeporte> {
    const horario = await HorarioDeporte.create({
      deporte_id: params.deporteId,
      docente_id: params.docenteId,
      dia_semana: params.diaSemana,
      hora_inicio: params.horaInicio,
      hora_fin: params.horaFin,
      lugar: "Escenario Jest",
      estado: true,
    });
    horariosCreados.push(horario.id);
    return horario;
  }

  async function crearAlumno(nombre: string, categoria: CategoriaPisu = "Pregrado"): Promise<UsuarioPisu> {
    const ficha = await UsuarioPisu.create({
      nombre,
      correo: `jest.alumno.${randomUUID().slice(0, 8)}@uniautonoma.edu.co`,
      rol: "Estudiante",
      categoria,
      estado: true,
    });
    pisuCreados.push(ficha.id);
    return ficha;
  }

  async function inscribir(estudianteId: string, deporteId: string, estado = "Activa"): Promise<void> {
    await InscripcionDeporte.create({
      estudiante_id: estudianteId,
      deporte_id: deporteId,
      estado: estado as "Activa" | "Cancelada",
    });
  }

  async function crearAsistencia(params: {
    horarioId: string;
    estudianteId: string;
    docenteId: string;
    fecha: string;
    presente: boolean;
  }): Promise<Asistencia> {
    return Asistencia.create({
      horario_id: params.horarioId,
      estudiante_id: params.estudianteId,
      docente_id: params.docenteId,
      fecha: params.fecha,
      presente: params.presente,
    });
  }

  beforeAll(async () => {
    docenteA = await crearSesionPisu({ rolPisu: "Docente" });
    docenteB = await crearSesionPisu({ rolPisu: "Docente" });
    estudiante = await crearSesionPisu({ rolPisu: "Estudiante" });
    administrador = await crearSesionPisu({ rolPisu: "Administrador" });
    sesiones.push(docenteA, docenteB, estudiante, administrador);

    deporteA = await crearDeporte("Jest Fútbol");
    deporteB = await crearDeporte("Jest Voleibol");
    deporteReporte = await crearDeporte("Jest Baloncesto");
    deporteVacio = await crearDeporte("Jest Ajedrez");
    deporteAsignado = await crearDeporte("Jest Tenis Directo");

    const nowMin = hoy.getHours() * 60 + hoy.getMinutes();
    const inicioAbierto = Math.min(Math.max(0, nowMin - 30), 23 * 60);
    const finAbierto = Math.min(inicioAbierto + 30, 23 * 60 + 59);

    horarioAbierto = await crearHorario({
      deporteId: deporteA.id,
      docenteId: docenteA.pisuId,
      diaSemana: hoy.getDay(),
      horaInicio: minutosAHora(inicioAbierto),
      horaFin: minutosAHora(finAbierto),
    });
    horarioOtroDia = await crearHorario({
      deporteId: deporteA.id,
      docenteId: docenteA.pisuId,
      diaSemana: (hoy.getDay() + 3) % 7,
      horaInicio: "08:00:00",
      horaFin: "10:00:00",
    });
    // Deporte de OTRO docente.
    await crearHorario({
      deporteId: deporteB.id,
      docenteId: docenteB.pisuId,
      diaSemana: (hoy.getDay() + 1) % 7,
      horaInicio: "10:00:00",
      horaFin: "12:00:00",
    });
    // Deporte del docente sin sesiones registradas.
    await crearHorario({
      deporteId: deporteVacio.id,
      docenteId: docenteA.pisuId,
      diaSemana: (hoy.getDay() + 2) % 7,
      horaInicio: "06:00:00",
      horaFin: "07:00:00",
    });
    horarioReporte = await crearHorario({
      deporteId: deporteReporte.id,
      docenteId: docenteA.pisuId,
      diaSemana: (hoy.getDay() + 1) % 7,
      horaInicio: "09:00:00",
      horaFin: "11:00:00",
    });

    alumnosA = [];
    for (let i = 0; i < 12; i += 1) {
      const alumno = await crearAlumno(
        `Alumno Jest ${String(i + 1).padStart(2, "0")}`,
        (["Pregrado", "Postgrado", "Egresado"] as CategoriaPisu[])[i % 3]!,
      );
      await inscribir(alumno.id, deporteA.id);
      alumnosA.push(alumno);
    }

    alumnoCancelado = await crearAlumno("Alumno Cancelado");
    await inscribir(alumnoCancelado.id, deporteA.id, "Cancelada");

    // Reporte: 10 sesiones, 8/10 aprueba y 7/10 reprueba.
    alumnoAprobado = await crearAlumno("Alumno Aprobado");
    alumnoReprobado = await crearAlumno("Alumno Reprobado");
    await inscribir(alumnoAprobado.id, deporteReporte.id);
    await inscribir(alumnoReprobado.id, deporteReporte.id);
    for (let i = 0; i < 10; i += 1) {
      const fecha = fechaISO(hoy, -(7 * (i + 1)));
      await crearAsistencia({
        horarioId: horarioReporte.id,
        estudianteId: alumnoAprobado.id,
        docenteId: docenteA.pisuId,
        fecha,
        presente: i < 8,
      });
      await crearAsistencia({
        horarioId: horarioReporte.id,
        estudianteId: alumnoReprobado.id,
        docenteId: docenteA.pisuId,
        fecha,
        presente: i < 7,
      });
    }

    // Deporte sin sesiones: un estudiante inscrito sin asistencias.
    alumnoSinClases = await crearAlumno("Alumno Sin Clases");
    await inscribir(alumnoSinClases.id, deporteVacio.id);

    // Deporte que se asigna DIRECTAMENTE al docente (sin horarios publicados).
    alumnoAsignado = await crearAlumno("Alumno Asignado Directo");
    await inscribir(alumnoAsignado.id, deporteAsignado.id);
  });

  afterAll(async () => {
    if (horariosCreados.length > 0) {
      await Asistencia.destroy({ where: { horario_id: horariosCreados } });
      await HorarioDeporte.destroy({ where: { id: horariosCreados } });
    }
    if (deportesCreados.length > 0) {
      await DeporteDocente.destroy({ where: { deporte_id: deportesCreados } });
      await InscripcionDeporte.destroy({ where: { deporte_id: deportesCreados } });
      await Deporte.destroy({ where: { id: deportesCreados } });
    }
    if (pisuCreados.length > 0) {
      await UsuarioPisu.destroy({ where: { id: pisuCreados } });
    }
    for (const sesion of sesiones) {
      await UsuarioPisu.destroy({ where: { id: sesion.pisuId } });
      await Usuario.destroy({ where: { id: sesion.authId } });
    }
  });

  it("aísla los deportes por docente", async () => {
    const respuesta = await request(app)
      .get("/api/v1/docente/mis-deportes")
      .set(auth(docenteA.token));
    expect(respuesta.status).toBe(200);
    const ids = (respuesta.body.deportes as Array<{ id: string }>).map((d) => d.id);
    expect(ids).toContain(deporteA.id);
    expect(ids).not.toContain(deporteB.id);
  });

  it("incluye la clase de hoy dentro de la ventana", async () => {
    const respuesta = await request(app)
      .get("/api/v1/docente/hoy")
      .set(auth(docenteA.token));
    expect(respuesta.status).toBe(200);
    const horarios = (respuesta.body.clases as Array<{ horario_id: string }>).map((c) => c.horario_id);
    expect(horarios).toContain(horarioAbierto.id);
  });

  it("devuelve 403 en estudiantes y reporte de un deporte ajeno", async () => {
    const estudiantes = await request(app)
      .get(`/api/v1/docente/deportes/${deporteB.id}/estudiantes`)
      .set(auth(docenteA.token));
    expect(estudiantes.status).toBe(403);

    const reporte = await request(app)
      .get(`/api/v1/docente/deportes/${deporteB.id}/reporte`)
      .set(auth(docenteA.token));
    expect(reporte.status).toBe(403);
  });

  it("rechaza 422 fuera de la ventana y permite con ASISTENCIA_IGNORAR_HORARIO=true", async () => {
    const original = process.env["ASISTENCIA_IGNORAR_HORARIO"];
    const cuerpo = {
      horarioId: horarioOtroDia.id,
      fecha: fechaHoy,
      estudiantes: alumnosA.slice(0, 3).map((a) => ({ estudianteId: a.id, presente: true })),
    };

    process.env["ASISTENCIA_IGNORAR_HORARIO"] = "false";
    const cerrado = await request(app)
      .post("/api/v1/docente/asistencia")
      .set(auth(docenteA.token))
      .send(cuerpo);
    expect(cerrado.status).toBe(422);

    process.env["ASISTENCIA_IGNORAR_HORARIO"] = "true";
    const abierto = await request(app)
      .post("/api/v1/docente/asistencia")
      .set(auth(docenteA.token))
      .send(cuerpo);
    expect(abierto.status).toBe(201);

    if (original === undefined) {
      delete process.env["ASISTENCIA_IGNORAR_HORARIO"];
    } else {
      process.env["ASISTENCIA_IGNORAR_HORARIO"] = original;
    }
  });

  it("devuelve 409 al duplicar la asistencia de la misma fecha", async () => {
    const respuesta = await request(app)
      .post("/api/v1/docente/asistencia")
      .set(auth(docenteA.token))
      .send({
        horarioId: horarioOtroDia.id,
        fecha: fechaHoy,
        estudiantes: alumnosA.slice(0, 3).map((a) => ({ estudianteId: a.id, presente: false })),
      });
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.codigo).toBe("ASISTENCIA_DUPLICADA");
  });

  it("permite editar dentro de 24 h y rechaza pasadas las 24 h", async () => {
    const registradas = await Asistencia.findAll({
      where: { horario_id: horarioOtroDia.id, fecha: fechaHoy },
    });
    const dentro = await request(app)
      .put(`/api/v1/docente/asistencia/${registradas[0]!.id}`)
      .set(auth(docenteA.token))
      .send({ presente: true });
    expect(dentro.status).toBe(200);

    const vieja = await crearAsistencia({
      horarioId: horarioAbierto.id,
      estudianteId: alumnosA[0]!.id,
      docenteId: docenteA.pisuId,
      fecha: fechaISO(hoy, -5),
      presente: true,
    });
    const fuera = await request(app)
      .put(`/api/v1/docente/asistencia/${vieja.id}`)
      .set(auth(docenteA.token))
      .send({ presente: false });
    expect(fuera.status).toBe(422);
  });

  it("solo lista estudiantes con inscripción activa", async () => {
    const respuesta = await request(app)
      .get(`/api/v1/docente/deportes/${deporteA.id}/estudiantes`)
      .set(auth(docenteA.token));
    expect(respuesta.status).toBe(200);
    const ids = (respuesta.body.estudiantes as Array<{ estudiante_id: string }>).map((e) => e.estudiante_id);
    expect(ids).not.toContain(alumnoCancelado.id);
    expect(ids.length).toBe(12);
  });

  it("calcula el reporte con la fórmula de aprobación", async () => {
    const respuesta = await request(app)
      .get(`/api/v1/docente/deportes/${deporteReporte.id}/reporte`)
      .set(auth(docenteA.token));
    expect(respuesta.status).toBe(200);
    const reporte = respuesta.body.reporte as {
      dictadas: number;
      aprobados: number;
      reprobados: number;
      estudiantes: Array<{ estudiante_id: string; aprobado: boolean; porcentaje: number }>;
    };
    expect(reporte.dictadas).toBe(10);
    const aprobado = reporte.estudiantes.find((e) => e.estudiante_id === alumnoAprobado.id);
    const reprobado = reporte.estudiantes.find((e) => e.estudiante_id === alumnoReprobado.id);
    expect(aprobado?.aprobado).toBe(true);
    expect(aprobado?.porcentaje).toBe(80);
    expect(reprobado?.aprobado).toBe(false);
    expect(reporte.aprobados).toBe(1);
    expect(reporte.reprobados).toBe(1);
  });

  it("reporta un deporte sin sesiones como 'Sin clases registradas'", async () => {
    const respuesta = await request(app)
      .get(`/api/v1/docente/deportes/${deporteVacio.id}/reporte`)
      .set(auth(docenteA.token));
    expect(respuesta.status).toBe(200);
    const reporte = respuesta.body.reporte as {
      dictadas: number;
      estudiantes: Array<{ estado: string; dictadas: number }>;
    };
    expect(reporte.dictadas).toBe(0);
    expect(reporte.estudiantes.some((e) => e.estado === "Sin clases registradas")).toBe(true);
  });

  it("genera el Excel con las tres hojas", async () => {
    const respuesta = await request(app)
      .get(`/api/v1/docente/deportes/${deporteReporte.id}/reporte/excel`)
      .set(auth(docenteA.token))
      .buffer(true)
      .parse(
        (
          res: NodeJS.ReadableStream,
          callback: (error: Error | null, body: Buffer) => void,
        ) => {
          const partes: Buffer[] = [];
          res.on("data", (trozo: Buffer) => partes.push(Buffer.from(trozo)));
          res.on("end", () => callback(null, Buffer.concat(partes)));
        },
      );

    expect(respuesta.status).toBe(200);
    expect(String(respuesta.headers["content-type"])).toContain("spreadsheetml");
    const buffer = respuesta.body as Buffer;
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(buffer);
    const nombres = libro.worksheets.map((hoja) => hoja.name);
    expect(nombres).toEqual(
      expect.arrayContaining(["Resumen", "Estudiantes", "Asistencia por fecha"]),
    );
  });

  it("devuelve 403 a estudiante y administrador en las rutas /docente", async () => {
    const comoEstudiante = await request(app)
      .get("/api/v1/docente/mis-deportes")
      .set(auth(estudiante.token));
    expect(comoEstudiante.status).toBe(403);

    const comoAdministrador = await request(app)
      .get("/api/v1/docente/mis-deportes")
      .set(auth(administrador.token));
    expect(comoAdministrador.status).toBe(403);
  });

  // ==========================================================================
  // Asignación DIRECTA deporte ↔ docente hecha por el administrador
  // ==========================================================================
  it("el administrador asigna un deporte sin horario y el docente lo ve en su panel", async () => {
    const asignar = await request(app)
      .put(`/api/v1/admin/docentes/${docenteA.pisuId}/deportes`)
      .set(auth(administrador.token))
      .send({ deporteIds: [deporteAsignado.id] });
    expect(asignar.status).toBe(200);
    expect(
      (asignar.body.deportes as Array<{ id: string }>).map((d) => d.id),
    ).toContain(deporteAsignado.id);

    const mis = await request(app)
      .get("/api/v1/docente/mis-deportes")
      .set(auth(docenteA.token));
    expect(mis.status).toBe(200);
    const listado = mis.body.deportes as Array<{ id: string; horarios: unknown[] }>;
    const asignado = listado.find((d) => d.id === deporteAsignado.id);
    expect(asignado).toBeDefined();
    // Sin horarios publicados todavía: el panel debe mostrarlo igual.
    expect(asignado?.horarios.length).toBe(0);
  });

  it("el docente gestiona estudiantes de un deporte asignado aunque no tenga horario", async () => {
    const respuesta = await request(app)
      .get(`/api/v1/docente/deportes/${deporteAsignado.id}/estudiantes`)
      .set(auth(docenteA.token));
    expect(respuesta.status).toBe(200);
    const ids = (respuesta.body.estudiantes as Array<{ estudiante_id: string }>).map(
      (e) => e.estudiante_id,
    );
    expect(ids).toContain(alumnoAsignado.id);
  });

  it("rechaza asignar deportes a un usuario que no es Docente", async () => {
    const respuesta = await request(app)
      .put(`/api/v1/admin/docentes/${estudiante.pisuId}/deportes`)
      .set(auth(administrador.token))
      .send({ deporteIds: [deporteAsignado.id] });
    expect(respuesta.status).toBe(400);
  });

  it("desasigna el deporte y deja de aparecer en el panel del docente", async () => {
    const quitar = await request(app)
      .put(`/api/v1/admin/docentes/${docenteA.pisuId}/deportes`)
      .set(auth(administrador.token))
      .send({ deporteIds: [] });
    expect(quitar.status).toBe(200);

    const mis = await request(app)
      .get("/api/v1/docente/mis-deportes")
      .set(auth(docenteA.token));
    expect((mis.body.deportes as Array<{ id: string }>).map((d) => d.id)).not.toContain(
      deporteAsignado.id,
    );
  });
});
