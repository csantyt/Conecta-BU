import { afterEach, describe, expect, it, jest } from "@jest/globals";
import {
  BASE_URL_POR_DEFECTO,
  completarChat,
  configuracionIa,
  extraerJson,
  IaNoConfiguradaError,
  MODELO_POR_DEFECTO,
} from "../../src/modules/ia/proveedorIa.js";

const config = {
  apiKey: "clave-de-prueba",
  baseUrl: "https://proveedor.test/v1",
  modelo: "modelo-prueba",
  timeoutMs: 5000,
};

function respuestaJson(cuerpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ia/proveedorIa (unitaria)", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("no se configura sin clave y usa Gemini por defecto", () => {
    expect(configuracionIa({})).toBeNull();
    expect(configuracionIa({ IA_API_KEY: "   " })).toBeNull();
    expect(configuracionIa({ IA_API_KEY: "abc" })).toEqual({
      apiKey: "abc",
      baseUrl: BASE_URL_POR_DEFECTO,
      modelo: MODELO_POR_DEFECTO,
      timeoutMs: 20000,
    });
  });

  it("permite cambiar de proveedor por variables de entorno", () => {
    expect(
      configuracionIa({
        IA_API_KEY: "abc",
        IA_BASE_URL: "https://api.groq.com/openai/v1/",
        IA_MODELO: "llama-prueba",
        IA_TIMEOUT_MS: "8000",
      }),
    ).toEqual({
      apiKey: "abc",
      baseUrl: "https://api.groq.com/openai/v1",
      modelo: "llama-prueba",
      timeoutMs: 8000,
    });
  });

  it("falla con un error propio si no hay configuración", async () => {
    await expect(completarChat([{ role: "user", content: "hola" }], null)).rejects.toBeInstanceOf(
      IaNoConfiguradaError,
    );
  });

  it("envía el chat al endpoint estándar y devuelve el texto", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(respuestaJson({ choices: [{ message: { content: " Hola " } }] }));

    const texto = await completarChat([{ role: "user", content: "hola" }], config);

    expect(texto).toBe("Hola");
    const [url, opciones] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://proveedor.test/v1/chat/completions");
    expect((opciones.headers as Record<string, string>)["Authorization"]).toBe(
      "Bearer clave-de-prueba",
    );
    expect(JSON.parse(String(opciones.body))).toEqual({
      model: "modelo-prueba",
      messages: [{ role: "user", content: "hola" }],
    });
  });

  it("propaga errores HTTP y respuestas vacías", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(respuestaJson({}, 429));
    await expect(completarChat([{ role: "user", content: "x" }], config)).rejects.toThrow(
      "IA_HTTP_429",
    );

    jest
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(respuestaJson({ choices: [{ message: { content: "" } }] }));
    await expect(completarChat([{ role: "user", content: "x" }], config)).rejects.toThrow(
      "IA_RESPUESTA_VACIA",
    );
  });

  it("extrae JSON aunque venga dentro de un bloque de código", () => {
    expect(extraerJson('```json\n{"recomendaciones":[]}\n```')).toEqual({ recomendaciones: [] });
    expect(extraerJson('Aquí tienes: {"a":1} listo')).toEqual({ a: 1 });
    expect(extraerJson("sin json")).toBeNull();
    expect(extraerJson("{roto")).toBeNull();
  });
});
