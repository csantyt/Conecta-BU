import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import {
  asignarRolPisuSchema,
  autoinscripcionSchema,
  crearAlertaPisuSchema,
  crearDeporteSchema,
  crearHorarioPisuSchema,
  editarAsistenciaSchema,
  registrarAsistenciaSchema,
} from "../../src/modules/deporte/validators.js";
import {
  hayTraslape,
  normalizarHora,
} from "../../src/modules/deporte/utils/horarios.js";

describe("deporte/horarios (unitaria)", () => {
  it("normaliza hora HH:MM a HH:MM:SS", () => {
    expect(normalizarHora("08:00")).toBe("08:00:00");
    expect(normalizarHora("08:00:30")).toBe("08:00:30");
  });

  it("detecta y descarta traslapes de clase", () => {
    expect(hayTraslape("08:00", "10:00", "09:00", "09:30")).toBe(true);
    expect(hayTraslape("08:00", "09:00", "09:00", "10:00")).toBe(false);
  });
});

describe("deporte/validators (unitaria)", () => {
  const deporteId = randomUUID();
  const docenteId = randomUUID();
  const estudianteId = randomUUID();
  const horarioId = randomUUID();

  it("valida autoinscripción", () => {
    expect(autoinscripcionSchema.safeParse({ deporte_id: deporteId }).success).toBe(
      true,
    );
    expect(autoinscripcionSchema.safeParse({ deporte_id: "x" }).success).toBe(
      false,
    );
  });

  it("valida crear deporte", () => {
    expect(
      crearDeporteSchema.safeParse({
        nombre: "Fútbol",
        cupo_maximo: 25,
        categorias_permitidas: ["Pregrado"],
      }).success,
    ).toBe(true);
    expect(
      crearDeporteSchema.safeParse({ nombre: "A", cupo_maximo: 0 }).success,
    ).toBe(false);
  });

  it("valida horario PISU", () => {
    expect(
      crearHorarioPisuSchema.safeParse({
        deporte_id: deporteId,
        docente_id: docenteId,
        dia_semana: 2,
        hora_inicio: "16:00",
        hora_fin: "18:00",
        lugar: "Cancha 1",
      }).success,
    ).toBe(true);
  });

  it("normaliza body de asistencia con snake_case", () => {
    const parsed = registrarAsistenciaSchema.safeParse({
      horario_id: horarioId,
      fecha: "2026-09-25",
      registros: [{ estudiante_id: estudianteId, presente: true }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.horarioId).toBe(horarioId);
      expect(parsed.data.estudiantes[0]?.estudianteId).toBe(estudianteId);
    }
  });

  it("valida edición de asistencia", () => {
    expect(editarAsistenciaSchema.safeParse({ presente: false }).success).toBe(
      true,
    );
    expect(editarAsistenciaSchema.safeParse({}).success).toBe(false);
  });

  it("valida roles PISU y alertas", () => {
    expect(
      asignarRolPisuSchema.safeParse({
        rol: "Docente",
        categoria: null,
      }).success,
    ).toBe(true);
    expect(
      crearAlertaPisuSchema.safeParse({
        titulo: "Clase cancelada",
        mensaje: "No hay práctica mañana",
        audiencia: "Estudiantes",
      }).success,
    ).toBe(true);
    expect(
      crearAlertaPisuSchema.safeParse({
        titulo: "X",
        mensaje: "Y",
        audiencia: "Padres",
      }).success,
    ).toBe(false);
  });
});
