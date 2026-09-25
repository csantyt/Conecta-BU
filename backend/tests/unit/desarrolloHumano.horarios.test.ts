import { describe, expect, it } from "@jest/globals";
import {
  hayTraslape,
  horaParaFecha,
} from "../../src/modules/desarrollo-humano/services/citasHorariosService.js";

describe("desarrollo-humano/horarios (unitaria)", () => {
  it("detecta traslape parcial de franjas", () => {
    expect(hayTraslape("08:00", "10:00", "09:30", "11:00")).toBe(true);
  });

  it("detecta cuando un bloque contiene al otro", () => {
    expect(hayTraslape("08:00", "12:00", "09:00", "10:00")).toBe(true);
  });

  it("no marca traslape en bloques consecutivos", () => {
    expect(hayTraslape("08:00:00", "09:00:00", "09:00", "10:00")).toBe(false);
  });

  it("no marca traslape en horas separadas", () => {
    expect(hayTraslape("07:00", "08:00", "18:00", "19:00")).toBe(false);
  });

  it("arma fecha_hora local a partir de fecha y hora", () => {
    const fecha = horaParaFecha("2026-05-12", "14:30");
    expect(fecha).toBeInstanceOf(Date);
    expect(Number.isNaN(fecha.getTime())).toBe(false);
    expect(fecha.getHours()).toBe(14);
    expect(fecha.getMinutes()).toBe(30);
  });
});
