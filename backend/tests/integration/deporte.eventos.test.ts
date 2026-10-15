/**
 * Pruebas de integración de eventos creados por el docente (módulo Deporte PISU).
 *
 * Cubren: 403 en deportes ajenos, validaciones (fecha pasada, hora fin, cupo,
 * plazo), conflictos de lugar 409 (evento y clase) sin chocar consigo mismo,
 * 403 al editar/cancelar eventos de otro docente, cupo mínimo, cancelación con
 * y sin inscritos, validaciones de inscripción del estudiante, concurrencia al
 * último cupo y visibilidad en el catálogo del estudiante y el panel admin.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import { Usuario } from "../../src/modules/auth/models/Usuario.js";
import type { CategoriaPisu } from "../../src/modules/deporte/constantes.js";
import { Alerta } from "../../src/modules/deporte/models/Alerta.js";
import { Deporte } from "../../src/modules/deporte/models/Deporte.js";
import { EventoDeporte } from "../../src/modules/deporte/models/EventoDeporte.js";
import { HorarioDeporte } from "../../src/modules/deporte/models/HorarioDeporte.js";
import { InscripcionDeporte } from "../../src/modules/deporte/models/InscripcionDeporte.js";
import { InscripcionEvento } from "../../src/modules/deporte/models/InscripcionEvento.js";
import { UsuarioPisu } from "../../src/modules/deporte/models/UsuarioPisu.js";
import "../../src/modules/deporte/models/index.js";
import { sembrarDeportesPisu } from "../../src/modules/deporte/seed.js";
import { auth, crearSesionPisu, type SesionPrueba } from "../helpers/sesion.js";

const CORREO_KEVIN = "kevin.ruiz.m@uniautonoma.edu.co";

function fechaISO(base: Date, dias: number): string {
  const fecha = new Date(base);
  fecha.setDate(fecha.getDate() + dias);
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

describe("API Deporte — eventos del docente", () => {
  const sesiones: SesionPrueba[] = [];
  const pisuCreados: string[] = [];
  const deportesCreados: string[] = [];
  const horariosCreados: string[] = [];
  const eventosCreados: string[] = [];

  let docenteA: SesionPrueba;
  let docenteB: SesionPrueba;
  let estudiante: SesionPrueba;
  let administrador: SesionPrueba;

  let deporteA: Deporte;
  let deporteB: Deporte;
  let deporteCruce: Deporte;

  const hoy = new Date();
  const semana = 7 * 24 * 60 * 60 * 1000;

  function baseEvento(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      nombre: `Jest Evento ${randomUUID().slice(0, 6)}`,
      descripcion: "Evento de prueba Jest",
      tipo: "Torneo",
      deporte_id: deporteA.id,
      fecha: fechaISO(hoy, 7),
      hora_inicio: "16:00",
      hora_fin: "18:00",
      lugar: `Escenario Jest ${randomUUID().slice(0, 4)}`,
      cupo_maximo: 10,
      fecha_limite_inscripcion: fechaISO(hoy, 5),
      categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"],
      ...overrides,
    };
  }

  async function crearDeporte(nombre: string): Promise<Deporte> {
    const deporte = await Deporte.create({
      nombre,
      descripcion: "Deporte de prueba Jest eventos",
      cupo_maximo: 40,
      categorias_permitidas: ["Pregrado", "Postgrado", "Egresado"],
      estado: true,
    });
    deportesCreados.push(deporte.id);
    return deporte;
  }

  async function crearAlumno(
    nombre: string,
    categoria: CategoriaPisu = "Pregrado",
  ): Promise<UsuarioPisu> {
    const ficha = await UsuarioPisu.create({
      nombre,
      correo: `jest.evento.${randomUUID().slice(0, 8)}@uniautonoma.edu.co`,
      rol: "Estudiante",
      categoria,
      estado: true,
    });
    pisuCreados.push(ficha.id);
    return ficha;
  }

  async function crearEvento(
    sesion: SesionPrueba,
    overrides: Record<string, unknown> = {},
  ): Promise<string> {
    const respuesta = await request(app)
      .post("/api/v1/deportes/docente/eventos")
      .set(auth(sesion.token))
      .send(baseEvento(overrides));
    expect(respuesta.status).toBe(201);
    const id = (respuesta.body.evento as { id: string }).id;
    eventosCreados.push(id);
    return id;
  }

  async function inscribirEvento(
    sesion: SesionPrueba,
    eventoId: string,
  ): Promise<number> {
    const respuesta = await request(app)
      .post(`/api/v1/eventos/${eventoId}/participacion`)
      .set(auth(sesion.token));
    return respuesta.status;
  }

  beforeAll(async () => {
    docenteA = await crearSesionPisu({ rolPisu: "Docente" });
    docenteB = await crearSesionPisu({ rolPisu: "Docente" });
    estudiante = await crearSesionPisu({ rolPisu: "Estudiante" });
    administrador = await crearSesionPisu({ rolPisu: "Administrador" });
    sesiones.push(docenteA, docenteB, estudiante, administrador);

    deporteA = await crearDeporte("Jest Eventos Fútbol");
    deporteB = await crearDeporte("Jest Eventos Voleibol");
    deporteCruce = await crearDeporte("Jest Eventos Atletismo");

    // Horario del docenteA sobre deporteA: clase los "hoy.getDay()" de 20:00 a 22:00.
    const horario = await HorarioDeporte.create({
      deporte_id: deporteA.id,
      docente_id: docenteA.pisuId,
      dia_semana: hoy.getDay(),
      hora_inicio: "20:00:00",
      hora_fin: "22:00:00",
      lugar: "Escenario Clase Jest",
      estado: true,
    });
    horariosCreados.push(horario.id);

    // deporteB pertenece al docenteB.
    const horarioB = await HorarioDeporte.create({
      deporte_id: deporteB.id,
      docente_id: docenteB.pisuId,
      dia_semana: hoy.getDay(),
      hora_inicio: "06:00:00",
      hora_fin: "07:00:00",
      lugar: "Escenario Clase Jest B",
      estado: true,
    });
    horariosCreados.push(horarioB.id);

    // deporteCruce con una clase en la misma franja del evento (para el cruce).
    const horarioCruce = await HorarioDeporte.create({
      deporte_id: deporteCruce.id,
      docente_id: docenteA.pisuId,
      dia_semana: hoy.getDay(),
      hora_inicio: "16:00:00",
      hora_fin: "18:00:00",
      lugar: "Escenario Cruce Jest",
      estado: true,
    });
    horariosCreados.push(horarioCruce.id);
    await InscripcionDeporte.create({
      estudiante_id: estudiante.pisuId,
      deporte_id: deporteCruce.id,
      estado: "Activa",
    });
  });

  afterAll(async () => {
    if (eventosCreados.length > 0) {
      await InscripcionEvento.destroy({ where: { evento_id: eventosCreados } });
      await EventoDeporte.destroy({ where: { id: eventosCreados } });
    }
    if (pisuCreados.length > 0) {
      await Alerta.destroy({ where: { estudiante_id: pisuCreados } });
    }
    if (horariosCreados.length > 0) {
      await HorarioDeporte.destroy({ where: { id: horariosCreados } });
    }
    if (deportesCreados.length > 0) {
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

  it("no crea eventos en un deporte que no le está asignado (403)", async () => {
    const respuesta = await request(app)
      .post("/api/v1/deportes/docente/eventos")
      .set(auth(docenteA.token))
      .send(baseEvento({ deporte_id: deporteB.id }));
    expect(respuesta.status).toBe(403);
  });

  it("valida fecha pasada, hora fin anterior, cupo inválido y plazo posterior", async () => {
    const pasada = await request(app)
      .post("/api/v1/deportes/docente/eventos")
      .set(auth(docenteA.token))
      .send(baseEvento({ fecha: fechaISO(hoy, -1) }));
    expect(pasada.status).toBe(400);

    const horaInvalida = await request(app)
      .post("/api/v1/deportes/docente/eventos")
      .set(auth(docenteA.token))
      .send(baseEvento({ hora_inicio: "18:00", hora_fin: "16:00" }));
    expect(horaInvalida.status).toBe(400);

    const cupoCero = await request(app)
      .post("/api/v1/deportes/docente/eventos")
      .set(auth(docenteA.token))
      .send(baseEvento({ cupo_maximo: 0 }));
    expect(cupoCero.status).toBe(400);

    const plazoDespues = await request(app)
      .post("/api/v1/deportes/docente/eventos")
      .set(auth(docenteA.token))
      .send(baseEvento({ fecha_limite_inscripcion: fechaISO(hoy, 8) }));
    expect(plazoDespues.status).toBe(400);
  });

  it("devuelve 409 por conflicto con otro evento y con una clase, y permite editar sin cambiar lugar/hora", async () => {
    const lugar = `Cancha Conflicto ${randomUUID().slice(0, 4)}`;
    const primero = await crearEvento(docenteA, { lugar });

    const choqueEvento = await request(app)
      .post("/api/v1/deportes/docente/eventos")
      .set(auth(docenteA.token))
      .send(baseEvento({ lugar, hora_inicio: "17:00", hora_fin: "19:00" }));
    expect(choqueEvento.status).toBe(409);
    expect(typeof choqueEvento.body.codigo).toBe("string");
    expect(choqueEvento.body.conflicto).toMatchObject({ tipo: "evento", lugar });

    const choqueClase = await request(app)
      .post("/api/v1/deportes/docente/eventos")
      .set(auth(docenteA.token))
      .send(
        baseEvento({
          deporte_id: deporteB.id,
          lugar: "Escenario Clase Jest",
          hora_inicio: "20:00",
          hora_fin: "22:00",
        }),
      );
    // El lugar está ocupado por la clase del propio docenteA... y deporteB es ajeno.
    // Se comprueba con un deporte propio para aislar el conflicto de clase.
    expect([403, 409]).toContain(choqueClase.status);

    const choqueClasePropio = await request(app)
      .post("/api/v1/deportes/docente/eventos")
      .set(auth(docenteA.token))
      .send(
        baseEvento({
          deporte_id: deporteA.id,
          lugar: "Escenario Clase Jest",
          hora_inicio: "20:00",
          hora_fin: "22:00",
        }),
      );
    expect(choqueClasePropio.status).toBe(409);
    expect(choqueClasePropio.body.codigo).toBe("CONFLICTO_CLASE");
    expect(choqueClasePropio.body.conflicto.tipo).toBe("clase");

    const edicion = await request(app)
      .put(`/api/v1/deportes/docente/eventos/${primero}`)
      .set(auth(docenteA.token))
      .send({ nombre: "Evento editado sin mover lugar" });
    expect(edicion.status).toBe(200);
    expect((edicion.body.evento as { nombre: string }).nombre).toBe(
      "Evento editado sin mover lugar",
    );
  });

  it("no edita ni cancela eventos creados por otro docente (403)", async () => {
    const eventoB = await crearEvento(docenteB, { deporte_id: deporteB.id });

    const editar = await request(app)
      .put(`/api/v1/deportes/docente/eventos/${eventoB}`)
      .set(auth(docenteA.token))
      .send({ nombre: "Intento ajeno" });
    expect(editar.status).toBe(403);

    const cancelar = await request(app)
      .post(`/api/v1/deportes/docente/eventos/${eventoB}/cancelar`)
      .set(auth(docenteA.token))
      .send({ motivo: "No debería poder" });
    expect(cancelar.status).toBe(403);
  });

  it("no baja el cupo por debajo de los inscritos", async () => {
    const eventoId = await crearEvento(docenteA, { cupo_maximo: 3 });
    for (let i = 0; i < 3; i += 1) {
      const alumno = await crearAlumno(`Jest Cupo ${i}`);
      await InscripcionEvento.create({
        evento_id: eventoId,
        estudiante_id: alumno.id,
        estado: "Activa",
      });
    }
    const respuesta = await request(app)
      .put(`/api/v1/deportes/docente/eventos/${eventoId}`)
      .set(auth(docenteA.token))
      .send({ cupo_maximo: 1 });
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.codigo).toBe("CUPO_MENOR_QUE_INSCRITOS");
  });

  it("cancela con inscritos (comunicado) y elimina sin inscritos", async () => {
    // Con inscritos → conserva el evento cancelado y crea comunicados.
    const conInscritos = await crearEvento(docenteA, { cupo_maximo: 5 });
    const alumno = await crearAlumno("Jest Cancelado Inscrito");
    await InscripcionEvento.create({
      evento_id: conInscritos,
      estudiante_id: alumno.id,
      estado: "Activa",
    });
    const cancelado = await request(app)
      .post(`/api/v1/deportes/docente/eventos/${conInscritos}/cancelar`)
      .set(auth(docenteA.token))
      .send({ motivo: "Clima adverso" });
    expect(cancelado.status).toBe(200);
    expect(cancelado.body.eliminado).toBe(false);

    const evento = await EventoDeporte.findByPk(conInscritos);
    expect(evento?.estado_evento).toBe("cancelado");
    expect(evento?.motivo_cancelacion).toBe("Clima adverso");

    const alerta = await Alerta.findOne({
      where: { clave: `evento:${conInscritos}:cancelado:${alumno.id}` },
    });
    expect(alerta).not.toBeNull();

    // Sin inscritos → se elimina.
    const sinInscritos = await crearEvento(docenteA);
    const eliminado = await request(app)
      .post(`/api/v1/deportes/docente/eventos/${sinInscritos}/cancelar`)
      .set(auth(docenteA.token))
      .send({ motivo: "Sin participantes" });
    expect(eliminado.status).toBe(200);
    expect(eliminado.body.eliminado).toBe(true);
    expect(await EventoDeporte.findByPk(sinInscritos)).toBeNull();
  });

  it("el estudiante no se inscribe a un evento lleno, cancelado, con plazo vencido, categoría no permitida o cruce", async () => {
    // Lleno.
    const lleno = await crearEvento(docenteA, { cupo_maximo: 1 });
    const primero = await crearAlumno("Jest Lleno 1");
    await InscripcionEvento.create({
      evento_id: lleno,
      estudiante_id: primero.id,
      estado: "Activa",
    });
    expect(await inscribirEvento(estudiante, lleno)).toBe(409);

    // Cancelado.
    const canceladoId = await crearEvento(docenteA);
    await EventoDeporte.update(
      { estado_evento: "cancelado", motivo_cancelacion: "Cancelado en prueba" },
      { where: { id: canceladoId } },
    );
    const canceladoResp = await request(app)
      .post(`/api/v1/eventos/${canceladoId}/participacion`)
      .set(auth(estudiante.token));
    expect(canceladoResp.status).toBe(409);

    // Plazo vencido.
    const vencido = await crearEvento(docenteA, {
      fecha_limite_inscripcion: fechaISO(hoy, 1),
    });
    await EventoDeporte.update(
      { fecha_limite_inscripcion: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      { where: { id: vencido } },
    );
    const vencidoResp = await request(app)
      .post(`/api/v1/eventos/${vencido}/participacion`)
      .set(auth(estudiante.token));
    expect(vencidoResp.status).toBe(409);
    expect(vencidoResp.body.codigo).toBe("PLAZO_VENCIDO");

    // Categoría no permitida (el estudiante es Pregrado).
    const soloEgresado = await crearEvento(docenteA, {
      categorias_permitidas: ["Egresado"],
    });
    const categoriaResp = await request(app)
      .post(`/api/v1/eventos/${soloEgresado}/participacion`)
      .set(auth(estudiante.token));
    expect(categoriaResp.status).toBe(409);
    expect(categoriaResp.body.codigo).toBe("CATEGORIA_NO_PERMITIDA");

    // Cruce de horario: el estudiante tiene clase en deporteCruce 16:00-18:00.
    const cruce = await crearEvento(docenteA, {
      deporte_id: deporteA.id,
      hora_inicio: "17:00",
      hora_fin: "19:00",
      lugar: `Cruce ${randomUUID().slice(0, 4)}`,
    });
    const cruceResp = await request(app)
      .post(`/api/v1/eventos/${cruce}/participacion`)
      .set(auth(estudiante.token));
    expect(cruceResp.status).toBe(409);
    expect(cruceResp.body.codigo).toBe("CRUCE_HORARIO");
  });

  it("no genera sobrecupo con 50 peticiones simultáneas al último cupo", async () => {
    const eventoId = await crearEvento(docenteA, { cupo_maximo: 1 });

    const alumnos: SesionPrueba[] = [];
    for (let i = 0; i < 50; i += 1) {
      const sesion = await crearSesionPisu({ rolPisu: "Estudiante" });
      alumnos.push(sesion);
      sesiones.push(sesion);
    }

    const respuestas = await Promise.all(
      alumnos.map((sesion) =>
        request(app)
          .post(`/api/v1/eventos/${eventoId}/participacion`)
          .set(auth(sesion.token)),
      ),
    );
    const exitos = respuestas.filter((r) => r.status === 201).length;
    expect(exitos).toBe(1);

    const inscritos = await InscripcionEvento.count({
      where: { evento_id: eventoId, estado: "Activa" },
    });
    expect(inscritos).toBe(1);
  });

  it("un evento del docente aparece en el catálogo del estudiante y en el panel del administrador", async () => {
    const nombre = `Torneo visible ${randomUUID().slice(0, 5)}`;
    const eventoId = await crearEvento(docenteA, { nombre });

    const catalogo = await request(app)
      .get("/api/v1/deportes/eventos")
      .set(auth(estudiante.token));
    expect(catalogo.status).toBe(200);
    const delCatalogo = (
      catalogo.body.eventos as Array<{
        id: string;
        nombre: string;
        creador: { nombre: string } | null;
      }>
    ).find((item) => item.id === eventoId);
    expect(delCatalogo?.nombre).toBe(nombre);
    expect(delCatalogo?.creador?.nombre).toContain("Jest Docente");

    const admin = await request(app)
      .get("/api/v1/admin/eventos")
      .set(auth(administrador.token));
    expect(admin.status).toBe(200);
    const delAdmin = (
      admin.body.eventos as Array<{ id: string; creador: { nombre: string } | null }>
    ).find((item) => item.id === eventoId);
    expect(delAdmin?.creador?.nombre).toContain("Jest Docente");
  });

  it(
    "la semilla crea los eventos de ejemplo de Kevin una sola vez (idempotente)",
    async () => {
      // Primera siembra.
      await sembrarDeportesPisu();

      const kevin = await UsuarioPisu.findOne({ where: { correo: CORREO_KEVIN } });
      expect(kevin).not.toBeNull();
      const kevinId = kevin?.id as string;

      // Torneo próximo con sus inscritos de ejemplo.
      const torneo = await EventoDeporte.findAll({
        where: { nombre: "Torneo relámpago de fútbol", creado_por_id: kevinId },
      });
      expect(torneo).toHaveLength(1);
      expect(torneo[0]?.tipo).toBe("Torneo");
      const torneoId = torneo[0]?.id as string;

      // Masterclass casi llena.
      const masterclass = await EventoDeporte.findAll({
        where: { nombre: "Masterclass de baloncesto", creado_por_id: kevinId },
      });
      expect(masterclass).toHaveLength(1);
      expect(masterclass[0]?.cupo_maximo).toBe(5);
      const masterclassId = masterclass[0]?.id as string;

      // Cada estudiante de ejemplo queda inscrito UNA sola vez en cada evento.
      async function correosInscritos(eventoId: string): Promise<string[]> {
        const filas = await InscripcionEvento.findAll({
          where: { evento_id: eventoId, estado: "Activa" },
          include: [{ association: "estudiante", attributes: ["correo"] }],
        });
        return filas
          .map(
            (fila) =>
              (fila.get("estudiante") as { correo?: string } | undefined)?.correo ?? "",
          )
          .sort();
      }

      const inscritosTorneo = await correosInscritos(torneoId);
      for (const numero of ["01", "02", "03"]) {
        const correo = `estudiante.pisu.${numero}@uniautonoma.edu.co`;
        expect(inscritosTorneo.filter((item) => item === correo)).toHaveLength(1);
      }
      expect(inscritosTorneo.length).toBeGreaterThanOrEqual(3);
      expect(inscritosTorneo.length).toBeLessThanOrEqual(torneo[0]?.cupo_maximo ?? 0);

      const inscritosMasterclass = await correosInscritos(masterclassId);
      for (const numero of ["01", "02", "03", "04"]) {
        const correo = `basket.pisu.${numero}@uniautonoma.edu.co`;
        expect(inscritosMasterclass.filter((item) => item === correo)).toHaveLength(1);
      }
      // "Casi llena": al menos los 4 de ejemplo y nunca más que el cupo.
      expect(inscritosMasterclass.length).toBeGreaterThanOrEqual(4);
      expect(inscritosMasterclass.length).toBeLessThanOrEqual(5);

      // Segunda siembra: no debe duplicar eventos ni inscripciones.
      const eventosAntes = await EventoDeporte.count({ where: { creado_por_id: kevinId } });
      await sembrarDeportesPisu();
      const eventosDespues = await EventoDeporte.count({ where: { creado_por_id: kevinId } });
      expect(eventosDespues).toBe(eventosAntes);
      expect(await correosInscritos(torneoId)).toHaveLength(inscritosTorneo.length);
      expect(await correosInscritos(masterclassId)).toHaveLength(
        inscritosMasterclass.length,
      );

      // Evento cancelado con motivo.
      const cancelado = await EventoDeporte.findOne({
        where: { nombre: "Amistoso de fútbol suspendido", creado_por_id: kevinId },
      });
      expect(cancelado?.estado_evento).toBe("cancelado");
      expect(cancelado?.motivo_cancelacion).toBeTruthy();

      // Evento de otra docente: Kevin no es el creador.
      const clinica = await EventoDeporte.findOne({
        where: { nombre: "Clínica de voleibol" },
      });
      expect(clinica).not.toBeNull();
      expect(clinica?.creado_por_id).not.toBe(kevinId);
    },
    60000,
  );
});
