import { describe, expect, it, jest } from "@jest/globals";
import type { EventoDisponible } from "../../src/modules/ia/contextoDesarrolloHumano.js";
import type { MensajeIa } from "../../src/modules/ia/proveedorIa.js";
import { RESPUESTA_CRISIS, RESPUESTA_RN011 } from "../../src/modules/ia/respuestasLocales.js";
import {
  recomendarEventos,
  responderOrientacion,
  type DependenciasAsistente,
} from "../../src/modules/ia/services/asistenteService.js";

const usuario = { id: "u1", email: "estudiante@uniautonoma.edu.co", rol: "USUARIO" };

function evento(id: string, titulo: string): EventoDisponible {
  return {
    id,
    titulo,
    descripcion: `Descripción de ${titulo}`,
    fecha_inicio: new Date("2026-11-10T15:00:00Z"),
    fecha_fin: null,
    fecha_limite_inscripcion: null,
    cupo_total: 20,
    cupo_disponible: 8,
  };
}

const EVENTOS = [evento("e1", "Manejo del estrés"), evento("e2", "Hábitos de estudio"), evento("e3", "Liderazgo"), evento("e4", "Mindfulness")];

function dependencias(cambios: Partial<DependenciasAsistente> = {}): DependenciasAsistente {
  return {
    listarEventos: async () => EVENTOS,
    completar: async () => "Respuesta de la IA",
    iaConfigurada: () => true,
    n8nConfigurado: () => false,
    llamarN8n: async () => ({}),
    avisar: () => undefined,
    ...cambios,
  };
}

describe("ia/asistenteService — orientación (unitaria)", () => {
  it("responde con la IA e incluye prompt, contexto e historial", async () => {
    const completar = jest.fn(async (_mensajes: MensajeIa[]) => "Agenda desde Citas.");
    const resultado = await responderOrientacion(
      {
        mensaje: "¿Cómo agendo?",
        historial: [{ rol: "asistente", contenido: "Hola, ¿en qué te ayudo?" }],
        usuario,
      },
      dependencias({ completar }),
    );

    expect(resultado).toEqual({
      respuesta: "Agenda desde Citas.",
      consulta_clinica: false,
      fuente: "ia",
    });
    const mensajes = completar.mock.calls[0]?.[0] ?? [];
    expect(mensajes[0]?.role).toBe("system");
    expect(mensajes[0]?.content).toContain("RN-011");
    expect(mensajes[0]?.content).toContain("Manejo del estrés");
    expect(mensajes.slice(1)).toEqual([
      { role: "assistant", content: "Hola, ¿en qué te ayudo?" },
      { role: "user", content: "¿Cómo agendo?" },
    ]);
  });

  it("nunca envía consultas clínicas ni de crisis a la IA (RN-011)", async () => {
    const completar = jest.fn(async () => "no debería llamarse");
    const deps = dependencias({ completar });

    const clinica = await responderOrientacion(
      { mensaje: "¿Qué medicamento tomo para dormir?", historial: [], usuario },
      deps,
    );
    const crisis = await responderOrientacion(
      { mensaje: "tengo ideas de suicidio", historial: [], usuario },
      deps,
    );

    expect(clinica).toEqual({ respuesta: RESPUESTA_RN011, consulta_clinica: true, fuente: "local" });
    expect(crisis).toEqual({ respuesta: RESPUESTA_CRISIS, consulta_clinica: true, fuente: "local" });
    expect(completar).not.toHaveBeenCalled();
  });

  it("si la IA falla usa n8n, y si n8n falla usa las reglas locales", async () => {
    const avisar = jest.fn();
    const conN8n = await responderOrientacion(
      { mensaje: "¿Cómo agendo una cita?", historial: [], usuario },
      dependencias({
        completar: async () => {
          throw new Error("IA_HTTP_503");
        },
        n8nConfigurado: () => true,
        llamarN8n: async () => ({ respuesta: "Desde n8n" }),
        avisar,
      }),
    );
    expect(conN8n.fuente).toBe("n8n");
    expect(conN8n.respuesta).toBe("Desde n8n");
    expect(avisar).toHaveBeenCalledWith(expect.stringContaining("IA_HTTP_503"));

    const local = await responderOrientacion(
      { mensaje: "¿Cómo agendo una cita?", historial: [], usuario },
      dependencias({
        iaConfigurada: () => false,
        n8nConfigurado: () => true,
        llamarN8n: async () => {
          throw new Error("fetch failed");
        },
      }),
    );
    expect(local.fuente).toBe("local");
    expect(local.respuesta).toContain("Para agendar");
  });

  it("sigue respondiendo con IA aunque no se puedan leer los eventos", async () => {
    const resultado = await responderOrientacion(
      { mensaje: "hola", historial: [], usuario },
      dependencias({
        listarEventos: async () => {
          throw new Error("sin base de datos");
        },
      }),
    );
    expect(resultado.fuente).toBe("ia");
  });
});

describe("ia/asistenteService — recomendaciones (unitaria)", () => {
  it("usa solo ids válidos devueltos por la IA, sin duplicados y máximo 3", async () => {
    const resultado = await recomendarEventos(
      usuario,
      dependencias({
        completar: async () =>
          JSON.stringify({
            recomendaciones: [
              { evento_id: "e2", motivo: "Mejora tu rendimiento" },
              { evento_id: "inventado", motivo: "No existe" },
              { evento_id: "e2", motivo: "Repetido" },
              { evento_id: "e4" },
              { evento_id: "e1", motivo: "Reduce el estrés" },
              { evento_id: "e3", motivo: "Sobra" },
            ],
          }),
      }),
    );

    expect(resultado.fuente).toBe("ia");
    expect(resultado.recomendaciones.map((item) => item.id)).toEqual(["e2", "e4", "e1"]);
    expect(resultado.recomendaciones[0]?.motivo).toBe("Mejora tu rendimiento");
    expect(resultado.recomendaciones[1]?.motivo).toContain("Taller próximo");
  });

  it("usa el respaldo local si la IA responde algo inservible", async () => {
    const resultado = await recomendarEventos(
      usuario,
      dependencias({ completar: async () => "No sé qué recomendar" }),
    );
    expect(resultado.fuente).toBe("local");
    expect(resultado.recomendaciones.map((item) => item.id)).toEqual(["e1", "e2", "e3"]);
  });

  it("no consulta a nadie si no hay eventos con cupo", async () => {
    const completar = jest.fn(async () => "{}");
    const resultado = await recomendarEventos(
      usuario,
      dependencias({ listarEventos: async () => [], completar }),
    );
    expect(resultado).toEqual({ recomendaciones: [], fuente: "local" });
    expect(completar).not.toHaveBeenCalled();
  });
});
