import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import { Usuario } from "../../src/modules/auth/models/Usuario.js";
import { Deporte } from "../../src/modules/deporte/models/Deporte.js";
import { HorarioDeporte } from "../../src/modules/deporte/models/HorarioDeporte.js";
import { InscripcionDeporte } from "../../src/modules/deporte/models/InscripcionDeporte.js";
import { UsuarioPisu } from "../../src/modules/deporte/models/UsuarioPisu.js";
import "../../src/modules/deporte/models/index.js";
import { auth, crearSesionPisu, type SesionPrueba } from "../helpers/sesion.js";

describe("Rol Estudiante - requisitos", () => {
  const sesiones: SesionPrueba[] = [];
  let docente: SesionPrueba;
  let deporteCruceA: Deporte;
  let deporteCruceB: Deporte;
  let deporteCategoria: Deporte;
  let deporteCupo: Deporte;
  let estudianteA: SesionPrueba;
  let estudianteB: SesionPrueba;

  beforeAll(async () => {
    docente = await crearSesionPisu({ rolPisu: "Docente" });
    estudianteA = await crearSesionPisu({ rolPisu: "Estudiante", categoria: "Pregrado" });
    estudianteB = await crearSesionPisu({ rolPisu: "Estudiante", categoria: "Pregrado" });
    sesiones.push(docente, estudianteA, estudianteB);

    deporteCruceA = await Deporte.create({ nombre: `Cruce A ${Date.now()}`, cupo_maximo: 20, categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"] });
    deporteCruceB = await Deporte.create({ nombre: `Cruce B ${Date.now()}`, cupo_maximo: 20, categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"] });
    await HorarioDeporte.create({ deporte_id: deporteCruceA.id, docente_id: docente.pisuId, dia_semana: 1, hora_inicio: "08:00:00", hora_fin: "10:00:00", lugar: "Cancha" });
    await HorarioDeporte.create({ deporte_id: deporteCruceB.id, docente_id: docente.pisuId, dia_semana: 1, hora_inicio: "09:00:00", hora_fin: "11:00:00", lugar: "Cancha" });

    deporteCategoria = await Deporte.create({ nombre: `Categoria ${Date.now()}`, cupo_maximo: 20, categorias_permitidas: ["Postgrado"] });

    deporteCupo = await Deporte.create({ nombre: `Cupo ${Date.now()}`, cupo_maximo: 1, categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"] });
    await InscripcionDeporte.create({ estudiante_id: estudianteB.pisuId, deporte_id: deporteCupo.id, estado: "Activa" });
  });

  afterAll(async () => {
    for (const deporte of [deporteCruceA, deporteCruceB, deporteCategoria, deporteCupo]) {
      if (deporte?.id) {
        await InscripcionDeporte.destroy({ where: { deporte_id: deporte.id } });
        await HorarioDeporte.destroy({ where: { deporte_id: deporte.id } });
        await Deporte.destroy({ where: { id: deporte.id } });
      }
    }
    for (const s of sesiones) {
      await InscripcionDeporte.destroy({ where: { estudiante_id: s.pisuId } });
      await UsuarioPisu.destroy({ where: { id: s.pisuId } });
      await Usuario.destroy({ where: { id: s.authId } });
    }
  });

  it("cruce de horario -> 409", async () => {
    const r1 = await request(app).post(`/api/v1/deportes/${deporteCruceA.id}/inscripcion`).set(auth(estudianteA.token)).send({});
    expect(r1.status).toBe(201);
    const r2 = await request(app).post(`/api/v1/deportes/${deporteCruceB.id}/inscripcion`).set(auth(estudianteA.token)).send({});
    expect(r2.status).toBe(409);
    expect(String(r2.body.message)).toContain("Se cruza");
  });

  it("categoría no permitida -> 409", async () => {
    const r = await request(app).post(`/api/v1/deportes/${deporteCategoria.id}/inscripcion`).set(auth(estudianteA.token)).send({});
    expect(r.status).toBe(409);
    expect(String(r.body.message)).toContain("categoría");
  });

  it("sin cupo -> 409", async () => {
    const r = await request(app).post(`/api/v1/deportes/${deporteCupo.id}/inscripcion`).set(auth(estudianteA.token)).send({});
    expect(r.status).toBe(409);
    expect(String(r.body.message)).toContain("cupo");
  });

  it("duplicado -> 409", async () => {
    const deporte = await Deporte.create({ nombre: `Dup ${Date.now()}`, cupo_maximo: 20, categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"] });
    const r1 = await request(app).post(`/api/v1/deportes/${deporte.id}/inscripcion`).set(auth(estudianteA.token)).send({});
    expect(r1.status).toBe(201);
    const r2 = await request(app).post(`/api/v1/deportes/${deporte.id}/inscripcion`).set(auth(estudianteA.token)).send({});
    expect(r2.status).toBe(409);
    expect(String(r2.body.message)).toContain("inscrito");
    await InscripcionDeporte.destroy({ where: { deporte_id: deporte.id } });
    await Deporte.destroy({ where: { id: deporte.id } });
  });

  it("concurrencia sobre último cupo -> 1 éxito", async () => {
    const deporte = await Deporte.create({ nombre: `Conc ${Date.now()}`, cupo_maximo: 1, categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"] });
    const lista = await Promise.all(Array.from({ length: 50 }, () => crearSesionPisu({ rolPisu: "Estudiante", categoria: "Pregrado" })));
    sesiones.push(...lista);
    const respuestas = await Promise.all(lista.map((s) => request(app).post(`/api/v1/deportes/${deporte.id}/inscripcion`).set(auth(s.token)).send({})));
    expect(respuestas.filter((r) => r.status === 201)).toHaveLength(1);
    expect(respuestas.filter((r) => r.status === 409)).toHaveLength(49);
    const ocupadas = await InscripcionDeporte.count({ where: { deporte_id: deporte.id, estado: "Activa" } });
    expect(ocupadas).toBe(1);
    await InscripcionDeporte.destroy({ where: { deporte_id: deporte.id } });
    await Deporte.destroy({ where: { id: deporte.id } });
    for (const s of lista) {
      await InscripcionDeporte.destroy({ where: { estudiante_id: s.pisuId } });
      await UsuarioPisu.destroy({ where: { id: s.pisuId } });
      await Usuario.destroy({ where: { id: s.authId } });
    }
  }, 60000);

  it("cancelación fuera de plazo -> 409", async () => {
    process.env.SEMESTRE_INICIO = "2025-01-01";
    process.env.SEMESTRE_FIN = "2025-01-02";
    const deporte = await Deporte.create({ nombre: `Cancel ${Date.now()}`, cupo_maximo: 5, categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"] });
    const ins = await InscripcionDeporte.create({ estudiante_id: estudianteA.pisuId, deporte_id: deporte.id, estado: "Activa" });
    const r = await request(app).delete(`/api/v1/deportes/inscripciones/${ins.id}`).set(auth(estudianteA.token));
    expect(r.status).toBe(409);
    expect(String(r.body.message)).toContain("plazo");
    delete process.env.SEMESTRE_INICIO;
    delete process.env.SEMESTRE_FIN;
    await InscripcionDeporte.destroy({ where: { deporte_id: deporte.id } });
    await Deporte.destroy({ where: { id: deporte.id } });
  });

  it("un estudiante no cancela la inscripción de otro -> 404", async () => {
    const deporte = await Deporte.create({ nombre: `Ajen ${Date.now()}`, cupo_maximo: 5, categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"] });
    const ins = await InscripcionDeporte.create({ estudiante_id: estudianteA.pisuId, deporte_id: deporte.id, estado: "Activa" });
    const r = await request(app).delete(`/api/v1/deportes/inscripciones/${ins.id}`).set(auth(estudianteB.token));
    expect(r.status).toBe(404);
    await InscripcionDeporte.destroy({ where: { deporte_id: deporte.id } });
    await Deporte.destroy({ where: { id: deporte.id } });
  });

  it("seguridad: sin token -> 401 y rol distinto -> 403", async () => {
    const r1 = await request(app).post(`/api/v1/deportes/${deporteCruceA.id}/inscripcion`).send({});
    expect(r1.status).toBe(401);
    const doc = docente;
    const r2 = await request(app).post(`/api/v1/deportes/${deporteCruceA.id}/inscripcion`).set(auth(doc.token)).send({});
    expect(r2.status).toBe(403);
  });
});