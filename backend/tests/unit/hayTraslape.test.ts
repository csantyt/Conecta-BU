import { describe, expect, it } from "@jest/globals";
import { hayTraslape } from "../../src/modules/deporte/utils/horarios.js";

describe("hayTraslape (unitaria)", () => {
  it("detecta intervalos que se cruzan", () => {
    expect(hayTraslape("08:00", "10:00", "09:00", "11:00")).toBe(true);
  });

  it("no marca como cruce dos bloques consecutivos", () => {
    expect(hayTraslape("08:00", "10:00", "10:00", "12:00")).toBe(false);
  });

  it("no marca como cruce bloques en horas distintas", () => {
    expect(hayTraslape("08:00", "09:00", "11:00", "12:00")).toBe(false);
  });
});
