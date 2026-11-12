import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import { Usuario } from "../../src/modules/auth/models/Usuario.js";
import { UMBRAL_INASISTENCIAS_ALERTA } from "../../src/modules/deporte/constantes.js";
import { Alerta } from "../../src/modules/deporte/models/Alerta.js";
import { Asistencia } from "../../src/modules/deporte/models/Asistencia.js";
import { Deporte } from "../../src/modules/deporte/models/Deporte.js";
import { HorarioDeporte } from "../../src/modules/deporte/models/HorarioDeporte.js";
import { InscripcionDeporte } from "../../src/modules/deporte/models/InscripcionDeporte.js";
import { UsuarioPisu } from "../../src/modules/deporte/models/UsuarioPisu.js";
import "../../src/modules/deporte/models/index.js";
import { auth, crearSesionPisu, type SesionPrueba } from "../helpers/sesion.js";

describe("API Deporte — alertas automáticas por inasistencias", () => {
  let deporte: Deporte;
  let horario: HorarioDeporte;
  let docente: SesionPrueba;
  let estudiante: SesionPrueba;
  let otroEstudiante: SesionPrueba;

  beforeAll(async () => {
    [docente, estudiante, otroEstudiante] = await Promise.all([
      crearSesionPisu({ rolPisu: "Docente" }),
      crearSesionPisu({ rolPisu: "Estudiante" }),
      crearSesionPisu({ rolPisu: "Estudiante" }),
    ]);
    deporte = await Deporte.create({
      nombre: `Jest Alertas ${Date.now()}`,
      cupo_maximo: 10,
      categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"],
    });
    horario = await HorarioDeporte.create({
      deporte_id: deporte.id,
      docente_id: docente.pisuId,
      dia_semana: 1,
      hora_inicio: "06:00:00",
      hora_fin: "07:00:00",
      lugar: "Cancha Jest",
    });
    await InscripcionDeporte.create({
      estudiante_id: estudiante.pisuId,
      deporte_id: deporte.id,
    });
  });

  afterAll(async () => {
    if (horario?.id) {
      await Asistencia.destroy({ where: { horario_id: horario.id } });
      await HorarioDeporte.destroy({ where: { id: horario.id } });
    }
    if (deporte?.id) {
      await InscripcionDeporte.destroy({ where: { deporte_id: deporte.id } });
      await Deporte.destroy({ where: { id: deporte.id } });
    }
    for (const sesion of [docente, estudiante, otroEstudiante]) {
      if (!sesion) {
        continue;
      }
      await Alerta.destroy({ where: { estudiante_id: sesion.pisuId } });
      await UsuarioPisu.destroy({ where: { id: sesion.pisuId } });
      await Usuario.destroy({ where: { id: sesion.authId } });
    }
  });

  const marcarAusente = (fecha: string) =>
    request(app)
      .post("/api/v1/docente/asistencia")
      .set(auth(docente.token))
      .send({
        horarioId: horario.id,
        fecha,
        estudiantes: [{ estudianteId: estudiante.pisuId, presente: false }],
      });

  it("crea una sola alerta personal al alcanzar el umbral", async () => {
    for (let dia = 1; dia <= UMBRAL_INASISTENCIAS_ALERTA; dia += 1) {
      const respuesta = await marcarAusente(`2026-01-0${dia}`);
      expect(respuesta.status).toBe(201);
    }
    await marcarAusente(`2026-01-0${UMBRAL_INASISTENCIAS_ALERTA}`);

    const alertas = await Alerta.findAll({ where: { estudiante_id: estudiante.pisuId } });
    expect(alertas).toHaveLength(1);
    expect(alertas[0]?.mensaje).toContain(`${UMBRAL_INASISTENCIAS_ALERTA} inasistencias`);
  });

  it("muestra la alerta solo al estudiante afectado", async () => {
    const propia = await request(app)
      .get("/api/v1/deportes/alertas")
      .set(auth(estudiante.token));
    const ajena = await request(app)
      .get("/api/v1/deportes/alertas")
      .set(auth(otroEstudiante.token));

    const esPersonal = (item: { estudiante_id: string | null }) =>
      item.estudiante_id === estudiante.pisuId;
    expect(propia.body.alertas.some(esPersonal)).toBe(true);
    expect(ajena.body.alertas.some(esPersonal)).toBe(false);
  });

  it("devuelve el historial y el porcentaje de asistencia del estudiante", async () => {
    const respuesta = await request(app)
      .get("/api/v1/estudiante/asistencias")
      .set(auth(estudiante.token));
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.resumen).toEqual([
      expect.objectContaining({
        deporte_id: deporte.id,
        presentes: 0,
        ausentes: UMBRAL_INASISTENCIAS_ALERTA,
        porcentaje: 0,
      }),
    ]);
  });
});
