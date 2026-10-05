import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import { Usuario } from "../../src/modules/auth/models/Usuario.js";
import { ConsultaIa } from "../../src/modules/desarrollo-humano/models/ConsultaIa.js";
import { UsuarioPisu } from "../../src/modules/deporte/models/UsuarioPisu.js";
import { RESPUESTA_RN011 } from "../../src/modules/ia/respuestasLocales.js";
import { auth, crearSesionPisu, type SesionPrueba } from "../helpers/sesion.js";

const VARIABLES_IA = [
  "IA_API_KEY",
  "N8N_WEBHOOK_ORIENTACION",
  "N8N_WEBHOOK_RECOMENDACIONES",
] as const;

describe("API IA — asistente sin servicios externos", () => {
  let sesion: SesionPrueba;
  const originales: Partial<Record<(typeof VARIABLES_IA)[number], string | undefined>> = {};

  beforeAll(async () => {
    for (const nombre of VARIABLES_IA) {
      originales[nombre] = process.env[nombre];
      process.env[nombre] = "";
    }
    sesion = await crearSesionPisu({ rolPisu: "Estudiante" });
  });

  afterAll(async () => {
    for (const nombre of VARIABLES_IA) {
      const valor = originales[nombre];
      if (valor === undefined) {
        delete process.env[nombre];
      } else {
        process.env[nombre] = valor;
      }
    }
    if (sesion) {
      await ConsultaIa.destroy({ where: { usuario_id: sesion.authId } });
      await UsuarioPisu.destroy({ where: { id: sesion.pisuId } });
      await Usuario.destroy({ where: { id: sesion.authId } });
    }
  });

  it("exige autenticación", async () => {
    const res = await request(app).post("/api/v1/ia/orientacion").send({ mensaje: "hola" });
    expect(res.status).toBe(401);
  });

  it("valida el mensaje", async () => {
    const res = await request(app)
      .post("/api/v1/ia/orientacion")
      .set(auth(sesion.token))
      .send({ mensaje: "   " });
    expect(res.status).toBe(400);
  });

  it("responde con las reglas locales cuando no hay IA ni n8n", async () => {
    const res = await request(app)
      .post("/api/v1/ia/orientacion")
      .set(auth(sesion.token))
      .send({ mensaje: "¿Cómo cancelo mi cita?" });

    expect(res.status).toBe(200);
    expect(res.body.fuente).toBe("local");
    expect(res.body.consulta_clinica).toBe(false);
    expect(res.body.respuesta).toContain("Cancelar");
  });

  it("aplica RN-011 y registra la consulta clínica para el dashboard", async () => {
    const res = await request(app)
      .post("/api/v1/ia/orientacion")
      .set(auth(sesion.token))
      .send({ mensaje: "¿Me puedes dar un diagnóstico?" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      respuesta: RESPUESTA_RN011,
      consulta_clinica: true,
      fuente: "local",
    });

    const registros = await ConsultaIa.findAll({ where: { usuario_id: sesion.authId } });
    expect(registros.length).toBe(2);
    expect(registros.some((fila) => fila.consulta_clinica)).toBe(true);
  });

  it("devuelve recomendaciones locales sin fallar", async () => {
    const res = await request(app)
      .post("/api/v1/ia/recomendaciones")
      .set(auth(sesion.token));

    expect(res.status).toBe(200);
    expect(res.body.fuente).toBe("local");
    expect(Array.isArray(res.body.recomendaciones)).toBe(true);
    expect(res.body.recomendaciones.length).toBeLessThanOrEqual(3);
  });
});
