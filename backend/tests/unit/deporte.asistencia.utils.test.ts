/**
 * Pruebas unitarias de las reglas de asistencia del rol Docente.
 * Cubren la ventana horaria, el plazo de edición y la fórmula de aprobación.
 */

import { afterEach, describe, expect, it } from "@jest/globals";
import {
  apruebaMateria,
  calcularFilaReporte,
  clasificarAsistencia,
  dentroPlazoEdicion,
  evaluarVentanaAsistencia,
} from "../../src/modules/deporte/utils/asistencia.js";

const IGNORAR_ORIGINAL = process.env["ASISTENCIA_IGNORAR_HORARIO"];

afterEach(() => {
  if (IGNORAR_ORIGINAL === undefined) {
    delete process.env["ASISTENCIA_IGNORAR_HORARIO"];
  } else {
    process.env["ASISTENCIA_IGNORAR_HORARIO"] = IGNORAR_ORIGINAL;
  }
});

// 2026-01-05 es lunes (dia_semana = 1).
describe("evaluarVentanaAsistencia", () => {
  it("abre 15 minutos antes del inicio", () => {
    process.env["ASISTENCIA_IGNORAR_HORARIO"] = "false";
    const antes = evaluarVentanaAsistencia({
      diaSemana: 1,
      horaInicio: "16:00:00",
      horaFin: "18:00:00",
      fecha: "2026-01-05",
      ahora: new Date(2026, 0, 5, 15, 50),
    });
    expect(antes.abierta).toBe(true);
  });

  it("cierra antes de los 15 minutos previos", () => {
    process.env["ASISTENCIA_IGNORAR_HORARIO"] = "false";
    const cerrada = evaluarVentanaAsistencia({
      diaSemana: 1,
      horaInicio: "16:00:00",
      horaFin: "18:00:00",
      fecha: "2026-01-05",
      ahora: new Date(2026, 0, 5, 15, 30),
    });
    expect(cerrada.abierta).toBe(false);
    expect(cerrada.motivo).toMatch(/no se habilita/i);
  });

  it("permite tomar asistencia 2 horas después del fin", () => {
    process.env["ASISTENCIA_IGNORAR_HORARIO"] = "false";
    const dentro = evaluarVentanaAsistencia({
      diaSemana: 1,
      horaInicio: "16:00:00",
      horaFin: "18:00:00",
      fecha: "2026-01-05",
      ahora: new Date(2026, 0, 5, 19, 30),
    });
    expect(dentro.abierta).toBe(true);

    const fuera = evaluarVentanaAsistencia({
      diaSemana: 1,
      horaInicio: "16:00:00",
      horaFin: "18:00:00",
      fecha: "2026-01-05",
      ahora: new Date(2026, 0, 5, 20, 30),
    });
    expect(fuera.abierta).toBe(false);
  });

  it("rechaza una fecha que no corresponde al día de la clase", () => {
    process.env["ASISTENCIA_IGNORAR_HORARIO"] = "false";
    const resultado = evaluarVentanaAsistencia({
      diaSemana: 1,
      horaInicio: "16:00:00",
      horaFin: "18:00:00",
      fecha: "2026-01-06", // martes
      ahora: new Date(2026, 0, 6, 16, 0),
    });
    expect(resultado.abierta).toBe(false);
    expect(resultado.motivo).toMatch(/no corresponde/i);
  });

  it("ignora la ventana cuando ASISTENCIA_IGNORAR_HORARIO=true", () => {
    process.env["ASISTENCIA_IGNORAR_HORARIO"] = "true";
    const resultado = evaluarVentanaAsistencia({
      diaSemana: 1,
      horaInicio: "16:00:00",
      horaFin: "18:00:00",
      fecha: "2026-01-05",
      ahora: new Date(2026, 0, 5, 6, 0),
    });
    expect(resultado.abierta).toBe(true);
  });
});

describe("dentroPlazoEdicion (24 horas desde la clase)", () => {
  it("permite editar dentro de las 24 horas", () => {
    expect(
      dentroPlazoEdicion({
        fecha: "2026-01-05",
        horaFin: "18:00:00",
        ahora: new Date(2026, 0, 6, 17, 0),
      }),
    ).toBe(true);
  });

  it("rechaza la edición pasadas las 24 horas", () => {
    expect(
      dentroPlazoEdicion({
        fecha: "2026-01-05",
        horaFin: "18:00:00",
        ahora: new Date(2026, 0, 6, 19, 0),
      }),
    ).toBe(false);
  });
});

describe("aprobación y clasificación", () => {
  it("aprueba con el 80 % y reprueba por debajo", () => {
    expect(apruebaMateria(8, 10)).toBe(true);
    expect(apruebaMateria(7, 10)).toBe(false);
  });

  it("clasifica el estado según el margen", () => {
    expect(clasificarAsistencia({ presentes: 10, dictadas: 10 })).toBe("Al día");
    expect(clasificarAsistencia({ presentes: 8, dictadas: 10 })).toBe("En riesgo");
    expect(clasificarAsistencia({ presentes: 7, dictadas: 10 })).toBe("Reprobaría");
    expect(clasificarAsistencia({ presentes: 0, dictadas: 0 })).toBe("Sin clases registradas");
  });

  it("calcula la fila del reporte con porcentaje y faltas", () => {
    const fila = calcularFilaReporte({
      estudiante_id: "x",
      nombre: "Prueba",
      documento: null,
      correo: null,
      categoria: "Pregrado",
      presentes: 8,
      dictadas: 10,
    });
    expect(fila.porcentaje).toBe(80);
    expect(fila.faltas).toBe(2);
    expect(fila.aprobado).toBe(true);
    expect(fila.estado).toBe("En riesgo");
  });
});
