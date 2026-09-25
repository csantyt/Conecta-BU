import { describe, expect, it } from "@jest/globals";

/** Réplica de la fórmula de asistencia efectiva del dashboard DH (RF-015). */
function porcentajeAsistenciaEfectiva(
  atendidas: number,
  noAsistio: number,
): number {
  const base = atendidas + noAsistio;
  if (base <= 0) {
    return 0;
  }
  return Math.round((atendidas / base) * 1000) / 10;
}

describe("dashboard desarrollo-humano (unitaria)", () => {
  it("calcula 100% cuando todas asistieron", () => {
    expect(porcentajeAsistenciaEfectiva(10, 0)).toBe(100);
  });

  it("calcula 0% cuando nadie asistió", () => {
    expect(porcentajeAsistenciaEfectiva(0, 8)).toBe(0);
  });

  it("redondea a un decimal", () => {
    expect(porcentajeAsistenciaEfectiva(2, 1)).toBe(66.7);
  });

  it("devuelve 0 sin registros de asistencia", () => {
    expect(porcentajeAsistenciaEfectiva(0, 0)).toBe(0);
  });
});
