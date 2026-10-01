import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import { Usuario } from "../../src/modules/auth/models/Usuario.js";
import { EventoDeporte } from "../../src/modules/deporte/models/EventoDeporte.js";
import { InscripcionEvento } from "../../src/modules/deporte/models/InscripcionEvento.js";
import { UsuarioPisu } from "../../src/modules/deporte/models/UsuarioPisu.js";
import "../../src/modules/deporte/models/index.js";
import { auth, crearSesionPisu, type SesionPrueba } from "../helpers/sesion.js";

describe("API Deporte — inscripción a eventos deportivos", () => {
  let evento: EventoDeporte;
  let eventoPasado: EventoDeporte;
  let estudianteA: SesionPrueba;
  let estudianteB: SesionPrueba;
  let docente: SesionPrueba;
  let admin: SesionPrueba;

  beforeAll(async () => {
    const enUnaSemana = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    evento = await EventoDeporte.create({
      nombre: `Jest Torneo ${Date.now()}`,
      fecha: enUnaSemana,
      lugar: "Coliseo",
      cupo_maximo: 1,
    });
    eventoPasado = await EventoDeporte.create({
      nombre: `Jest Torneo pasado ${Date.now()}`,
      fecha: new Date(Date.now() - 24 * 60 * 60 * 1000),
      lugar: "Coliseo",
      cupo_maximo: 10,
    });

    [estudianteA, estudianteB, docente, admin] = await Promise.all([
      crearSesionPisu({ rolPisu: "Estudiante" }),
      crearSesionPisu({ rolPisu: "Estudiante" }),
      crearSesionPisu({ rolPisu: "Docente" }),
      crearSesionPisu({ rolPisu: "Administrador" }),
    ]);
  });

  afterAll(async () => {
    const eventos = [evento?.id, eventoPasado?.id].filter(Boolean) as string[];
    await InscripcionEvento.destroy({ where: { evento_id: eventos } });
    await EventoDeporte.destroy({ where: { id: eventos } });
    for (const sesion of [estudianteA, estudianteB, docente, admin]) {
      if (!sesion) {
        continue;
      }
      await UsuarioPisu.destroy({ where: { id: sesion.pisuId } });
      await Usuario.destroy({ where: { id: sesion.authId } });
    }
  });

  const inscribir = (sesion: SesionPrueba, id: string) =>
    request(app)
      .post(`/api/v1/estudiante/eventos/${id}/inscripcion`)
      .set(auth(sesion.token));

  it("inscribe al estudiante y rechaza la inscripción duplicada", async () => {
    expect((await inscribir(estudianteA, evento.id)).status).toBe(201);
    expect((await inscribir(estudianteA, evento.id)).status).toBe(409);
  });

  it("rechaza cuando el cupo está lleno y libera el cupo al cancelar", async () => {
    const lleno = await inscribir(estudianteB, evento.id);
    expect(lleno.status).toBe(409);
    expect(String(lleno.body.message).toLowerCase()).toContain("cupo");

    const cancelar = await request(app)
      .delete(`/api/v1/estudiante/eventos/${evento.id}/inscripcion`)
      .set(auth(estudianteA.token));
    expect(cancelar.status).toBe(200);

    expect((await inscribir(estudianteB, evento.id)).status).toBe(201);
  });

  it("muestra cupo e inscripción propia en el listado de eventos", async () => {
    const respuesta = await request(app)
      .get("/api/v1/deportes/eventos")
      .set(auth(estudianteB.token));
    expect(respuesta.status).toBe(200);
    const propio = respuesta.body.eventos.find(
      (item: { id: string }) => item.id === evento.id,
    );
    expect(propio).toMatchObject({ inscrito: true, cupo_disponible: 0, inscritos: 1 });
  });

  it("no admite inscripciones a eventos que ya ocurrieron", async () => {
    expect((await inscribir(estudianteA, eventoPasado.id)).status).toBe(400);
  });

  it("prohíbe que un docente se inscriba (RBAC)", async () => {
    expect((await inscribir(docente, evento.id)).status).toBe(403);
  });

  it("lista los inscritos al administrador", async () => {
    const respuesta = await request(app)
      .get(`/api/v1/admin/eventos/${evento.id}/inscritos`)
      .set(auth(admin.token));
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.inscripciones).toHaveLength(1);
    expect(respuesta.body.inscripciones[0].estudiante.id).toBe(estudianteB.pisuId);
  });
});
