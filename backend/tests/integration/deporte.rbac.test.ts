import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import { Usuario } from "../../src/modules/auth/models/Usuario.js";
import { UsuarioPisu } from "../../src/modules/deporte/models/UsuarioPisu.js";
import "../../src/modules/deporte/models/index.js";
import { auth, crearSesionPisu, type SesionPrueba } from "../helpers/sesion.js";

describe("API Deporte — RBAC Estudiante (403)", () => {
  let sesion: SesionPrueba;

  beforeAll(async () => {
    sesion = await crearSesionPisu({ rolPisu: "Estudiante" });
  });

  afterAll(async () => {
    if (!sesion) {
      return;
    }
    await UsuarioPisu.destroy({ where: { id: sesion.pisuId } });
    await Usuario.destroy({ where: { id: sesion.authId } });
  });

  it("prohíbe crear un deporte (POST /admin/deportes)", async () => {
    const respuesta = await request(app)
      .post("/api/v1/admin/deportes")
      .set(auth(sesion.token))
      .send({
        nombre: "Jest no debe crear esto",
        cupo_maximo: 10,
      });

    expect(respuesta.status).toBe(403);
  });

  it("prohíbe tomar asistencia (POST /docente/asistencia)", async () => {
    const respuesta = await request(app)
      .post("/api/v1/docente/asistencia")
      .set(auth(sesion.token))
      .send({
        horarioId: "11111111-1111-1111-1111-111111111111",
        fecha: "2026-09-23",
        estudiantes: [
          {
            estudianteId: "22222222-2222-2222-2222-222222222222",
            presente: true,
          },
        ],
      });

    expect(respuesta.status).toBe(403);
  });
});
