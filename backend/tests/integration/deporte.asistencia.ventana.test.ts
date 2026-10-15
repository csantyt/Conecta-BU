import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import { Usuario } from "../../src/modules/auth/models/Usuario.js";
import { Deporte } from "../../src/modules/deporte/models/Deporte.js";
import { HorarioDeporte } from "../../src/modules/deporte/models/HorarioDeporte.js";
import { InscripcionDeporte } from "../../src/modules/deporte/models/InscripcionDeporte.js";
import { UsuarioPisu } from "../../src/modules/deporte/models/UsuarioPisu.js";
import { Op } from "sequelize";
import { auth, crearSesionPisu, type SesionPrueba } from "../helpers/sesion.js";

describe("API Deporte — asistencia Fase 1", () => {
  const hoy = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Bogota",
  });
  let docente: SesionPrueba;
  let otroDocente: SesionPrueba;
  let estudiante: SesionPrueba;
  let deporte: Deporte;

  beforeAll(async () => {
    docente = await crearSesionPisu({ rolPisu: "Docente" });
    otroDocente = await crearSesionPisu({ rolPisu: "Docente" });
    estudiante = await crearSesionPisu({ rolPisu: "Estudiante" });
    deporte = await Deporte.create({
      nombre: `Jest Ventana ${Date.now()}`,
      cupo_maximo: 10,
      categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"],
    });
    await InscripcionDeporte.create({
      estudiante_id: estudiante.pisuId,
      deporte_id: deporte.id,
      estado: "Activa",
    });
  });

  afterAll(async () => {
    await HorarioDeporte.destroy({
      where: { docente_id: { [Op.in]: [docente.pisuId, otroDocente.pisuId] } },
    });
    await InscripcionDeporte.destroy({ where: { deporte_id: deporte.id } });
    await Deporte.destroy({ where: { id: deporte.id } });
    for (const sesion of [docente, otroDocente, estudiante]) {
      await UsuarioPisu.destroy({ where: { id: sesion.pisuId } });
      await Usuario.destroy({ where: { id: sesion.authId } });
    }
  });

  it("rechaza asistencia fuera de la ventana horaria", async () => {
    const horario = await HorarioDeporte.create({
      deporte_id: deporte.id,
      docente_id: docente.pisuId,
      dia_semana: new Date().getDay(),
      hora_inicio: "01:00:00",
      hora_fin: "02:00:00",
      lugar: "Cancha Jest",
    });

    const respuesta = await request(app)
      .post("/api/v1/docente/asistencia")
      .set(auth(docente.token))
      .send({
        horarioId: horario.id,
        fecha: hoy,
        estudiantes: [{ estudianteId: estudiante.pisuId, presente: true }],
      });

    expect(respuesta.status).toBe(409);
  });

  it("devuelve 403 si la clase pertenece a otro docente", async () => {
    const horario = await HorarioDeporte.create({
      deporte_id: deporte.id,
      docente_id: otroDocente.pisuId,
      dia_semana: new Date().getDay(),
      hora_inicio: "08:00:00",
      hora_fin: "09:00:00",
      lugar: "Cancha Jest 403",
    });

    const respuesta = await request(app)
      .post("/api/v1/docente/asistencia")
      .set(auth(docente.token))
      .send({
        horarioId: horario.id,
        fecha: hoy,
        estudiantes: [{ estudianteId: estudiante.pisuId, presente: true }],
      });

    expect(respuesta.status).toBe(403);
  });

  it("devuelve 409 al repetir la asistencia", async () => {
    const horario = await HorarioDeporte.create({
      deporte_id: deporte.id,
      docente_id: docente.pisuId,
      dia_semana: new Date().getDay(),
      hora_inicio: "00:00:00",
      hora_fin: "23:59:00",
      lugar: "Cancha Jest Dup",
    });

    const primera = await request(app)
      .post("/api/v1/docente/asistencia")
      .set(auth(docente.token))
      .send({
        horarioId: horario.id,
        fecha: hoy,
        estudiantes: [{ estudianteId: estudiante.pisuId, presente: true }],
      });
    expect(primera.status).toBe(201);

    const segunda = await request(app)
      .post("/api/v1/docente/asistencia")
      .set(auth(docente.token))
      .send({
        horarioId: horario.id,
        fecha: hoy,
        estudiantes: [{ estudianteId: estudiante.pisuId, presente: true }],
      });
    expect(segunda.status).toBe(409);
  });
});