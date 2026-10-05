import { describe, expect, it } from "@jest/globals";
import {
  motivoLocal,
  pareceConsultaClinica,
  pareceCrisis,
  RESPUESTA_CRISIS,
  RESPUESTA_RN011,
  responderLocalmente,
} from "../../src/modules/ia/respuestasLocales.js";

describe("ia/respuestasLocales (unitaria)", () => {
  it("detecta consultas clínicas (RN-011) con y sin tildes", () => {
    expect(pareceConsultaClinica("¿Puedes darme un diagnóstico?")).toBe(true);
    expect(pareceConsultaClinica("dame un diagnostico")).toBe(true);
    expect(pareceConsultaClinica("Quiero una receta de medicamento")).toBe(true);
    expect(pareceConsultaClinica("creo que tengo TDAH")).toBe(true);
    expect(pareceConsultaClinica("¿Cómo agendo una cita?")).toBe(false);
    expect(pareceConsultaClinica("¿Hay talleres este mes?")).toBe(false);
  });

  it("detecta señales de crisis", () => {
    expect(pareceCrisis("tengo ideas de suicidio")).toBe(true);
    expect(pareceCrisis("ya no quiero vivir")).toBe(true);
    expect(pareceCrisis("quiero cancelar mi cita")).toBe(false);
  });

  it("responde con la regla adecuada", () => {
    expect(responderLocalmente("quiero cancelar mi cita")).toContain("Cancelar");
    expect(responderLocalmente("¿Cómo agendo una cita?")).toContain("Para agendar");
    expect(responderLocalmente("¿Qué talleres hay?")).toContain("pestaña Eventos");
    expect(responderLocalmente("me quiero inscribir a fútbol")).toContain("módulo Deporte");
    expect(responderLocalmente("necesito un diagnóstico")).toBe(RESPUESTA_RN011);
    expect(responderLocalmente("no quiero vivir")).toBe(RESPUESTA_CRISIS);
    expect(responderLocalmente("¿cuál es la capital de Francia?")).toContain(
      "Puedo ayudarte con el uso de Conecta BU",
    );
  });

  it("arma el motivo local con cupos y descripción", () => {
    expect(motivoLocal({ descripcion: null, cupo_disponible: 1 })).toBe(
      "Taller próximo con 1 cupo disponible.",
    );
    expect(motivoLocal({ descripcion: "Manejo del estrés", cupo_disponible: 5 })).toBe(
      "Taller próximo con 5 cupos disponibles. Manejo del estrés",
    );
  });
});
