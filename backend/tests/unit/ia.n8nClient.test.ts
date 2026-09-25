import { describe, expect, it } from "@jest/globals";
import {
  extraerRecomendaciones,
  extraerTextoAsistente,
  pareceConsultaClinica,
} from "../../src/modules/ia/n8nClient.js";
import { mensajeChatSchema } from "../../src/modules/ia/validators.js";

describe("ia/n8nClient (unitaria)", () => {
  it("detecta consultas clínicas (RN-011)", () => {
    expect(pareceConsultaClinica("¿Puedes darme un diagnóstico?")).toBe(true);
    expect(pareceConsultaClinica("Quiero una receta de medicamento")).toBe(true);
    expect(pareceConsultaClinica("ideas de suicidio")).toBe(true);
    expect(pareceConsultaClinica("¿Cómo agendo una cita?")).toBe(false);
  });

  it("extrae texto del asistente desde distintas formas de payload", () => {
    expect(extraerTextoAsistente({ respuesta: " Hola " })).toBe("Hola");
    expect(extraerTextoAsistente({ output: "Orientación básica" })).toBe(
      "Orientación básica",
    );
    expect(
      extraerTextoAsistente({ json: { text: "Agenda en Desarrollo humano" } }),
    ).toBe("Agenda en Desarrollo humano");
    expect(extraerTextoAsistente({})).toBeNull();
  });

  it("extrae recomendaciones de eventos", () => {
    const lista = extraerRecomendaciones({
      recomendaciones: [
        { evento_id: "a1", motivo: "Cupo disponible" },
        { id: "b2" },
        "c3",
      ],
    });
    expect(lista).toEqual([
      { evento_id: "a1", motivo: "Cupo disponible" },
      { evento_id: "b2" },
      { evento_id: "c3" },
    ]);
    expect(extraerRecomendaciones(null)).toEqual([]);
  });
});

describe("ia/validators (unitaria)", () => {
  it("acepta mensaje de chat válido", () => {
    const parsed = mensajeChatSchema.safeParse({
      mensaje: "¿Cómo cancelo una cita?",
      historial: [{ rol: "asistente", contenido: "Hola" }],
    });
    expect(parsed.success).toBe(true);
  });

  it("rechaza mensaje vacío o historial inválido", () => {
    expect(mensajeChatSchema.safeParse({ mensaje: "   " }).success).toBe(false);
    expect(
      mensajeChatSchema.safeParse({
        mensaje: "Hola",
        historial: [{ rol: "admin", contenido: "x" }],
      }).success,
    ).toBe(false);
  });
});
