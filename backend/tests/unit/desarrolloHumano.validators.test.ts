import { describe, expect, it } from "@jest/globals";
import { randomUUID } from "node:crypto";
import {
  asistenciaSchema,
  cancelarCitaSchema,
  crearCitaSchema,
  crearEventoSchema,
  crearHorarioSchema,
  horariosDisponiblesSchema,
} from "../../src/modules/desarrollo-humano/validators.js";

describe("desarrollo-humano/validators (unitaria)", () => {
  const servicioId = randomUUID();
  const horarioId = randomUUID();

  it("acepta crear horario válido", () => {
    const parsed = crearHorarioSchema.safeParse({
      servicio_id: servicioId,
      dia_semana: 1,
      hora_inicio: "08:00",
      hora_fin: "09:00",
      cupo: 2,
    });
    expect(parsed.success).toBe(true);
  });

  it("rechaza día de semana inválido", () => {
    const parsed = crearHorarioSchema.safeParse({
      servicio_id: servicioId,
      dia_semana: 9,
      hora_inicio: "08:00",
      hora_fin: "09:00",
      cupo: 1,
    });
    expect(parsed.success).toBe(false);
  });

  it("acepta crear cita con fecha ISO corta", () => {
    const parsed = crearCitaSchema.safeParse({
      servicio_id: servicioId,
      horario_id: horarioId,
      fecha: "2026-09-25",
    });
    expect(parsed.success).toBe(true);
  });

  it("rechaza fecha de cita mal formada", () => {
    const parsed = crearCitaSchema.safeParse({
      servicio_id: servicioId,
      horario_id: horarioId,
      fecha: "25-09-2026",
    });
    expect(parsed.success).toBe(false);
  });

  it("acepta asistencia ASISTIO / NO_ASISTIO", () => {
    expect(asistenciaSchema.safeParse({ estado: "ASISTIO" }).success).toBe(true);
    expect(asistenciaSchema.safeParse({ estado: "NO_ASISTIO" }).success).toBe(
      true,
    );
    expect(asistenciaSchema.safeParse({ estado: "CANCELADA" }).success).toBe(false);
  });

  it("acepta cancelar cita con motivo opcional", () => {
    expect(cancelarCitaSchema.safeParse({}).success).toBe(true);
    expect(
      cancelarCitaSchema.safeParse({ motivo: "Cambio de horario" }).success,
    ).toBe(true);
  });

  it("valida consulta de horarios disponibles", () => {
    expect(
      horariosDisponiblesSchema.safeParse({ fecha: "2026-09-25" }).success,
    ).toBe(true);
    expect(
      horariosDisponiblesSchema.safeParse({ fecha: "2026/09/25" }).success,
    ).toBe(false);
  });

  it("exige título y cupo al crear evento", () => {
    const ok = crearEventoSchema.safeParse({
      titulo: "Taller de liderazgo",
      fecha_inicio: "2026-10-01T10:00:00.000Z",
      cupo_total: 30,
    });
    expect(ok.success).toBe(true);

    const malo = crearEventoSchema.safeParse({
      titulo: "AB",
      fecha_inicio: "2026-10-01T10:00:00.000Z",
      cupo_total: 0,
    });
    expect(malo.success).toBe(false);
  });
});
