import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import { Usuario } from "../../src/modules/auth/models/Usuario.js";
import { Deporte } from "../../src/modules/deporte/models/Deporte.js";
import { InscripcionDeporte } from "../../src/modules/deporte/models/InscripcionDeporte.js";
import { UsuarioPisu } from "../../src/modules/deporte/models/UsuarioPisu.js";
import "../../src/modules/deporte/models/index.js";
import {
  auth,
  crearSesionPisu,
  type SesionPrueba,
} from "../helpers/sesion.js";

describe("API Deporte — concurrencia de cupos (RNF-006)", () => {
  const CONCURRENTES = 8;
  let deporte: Deporte;
  let sesiones: SesionPrueba[] = [];

  beforeAll(async () => {
    deporte = await Deporte.create({
      nombre: `Jest Cupo Unico ${Date.now()}`,
      descripcion: "Deporte de prueba RNF-006",
      cupo_maximo: 1,
      categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"],
    });

    sesiones = await Promise.all(
      Array.from({ length: CONCURRENTES }, () =>
        crearSesionPisu({ rolPisu: "Estudiante", categoria: "Pregrado" }),
      ),
    );
  });

  afterAll(async () => {
    if (deporte?.id) {
      await InscripcionDeporte.destroy({ where: { deporte_id: deporte.id } });
      await Deporte.destroy({ where: { id: deporte.id } });
    }
    for (const sesion of sesiones) {
      await InscripcionDeporte.destroy({ where: { estudiante_id: sesion.pisuId } });
      await UsuarioPisu.destroy({ where: { id: sesion.pisuId } });
      await Usuario.destroy({ where: { id: sesion.authId } });
    }
  });

  it("solo una inscripción gana el último cupo; el resto recibe cupo lleno", async () => {
    const respuestas = await Promise.all(
      sesiones.map((sesion) =>
        request(app)
          .post("/api/v1/estudiante/inscripciones")
          .set(auth(sesion.token))
          .send({ deporte_id: deporte.id }),
      ),
    );

    const exitosas = respuestas.filter((item) => item.status === 201);
    const cupoLleno = respuestas.filter(
      (item) =>
        item.status === 409 &&
        String(item.body.message ?? "").toLowerCase().includes("cupo"),
    );

    expect(exitosas).toHaveLength(1);
    expect(cupoLleno.length).toBe(CONCURRENTES - 1);

    const ocupadas = await InscripcionDeporte.count({
      where: { deporte_id: deporte.id, estado: "Activa" },
    });
    expect(ocupadas).toBe(1);
  }, 30000);
});
