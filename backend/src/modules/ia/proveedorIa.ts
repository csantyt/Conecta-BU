export type MensajeIa = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ConfiguracionIa = {
  apiKey: string;
  baseUrl: string;
  modelo: string;
  timeoutMs: number;
};

// Endpoint de Gemini compatible con OpenAI. Groq u OpenAI funcionan cambiando IA_BASE_URL e IA_MODELO.
export const BASE_URL_POR_DEFECTO = "https://generativelanguage.googleapis.com/v1beta/openai";
export const MODELO_POR_DEFECTO = "gemini-3.5-flash-lite";

export function configuracionIa(env: NodeJS.ProcessEnv = process.env): ConfiguracionIa | null {
  const apiKey = env["IA_API_KEY"]?.trim();
  if (!apiKey) {
    return null;
  }
  const timeout = Number(env["IA_TIMEOUT_MS"] ?? 20000);
  return {
    apiKey,
    baseUrl: (env["IA_BASE_URL"]?.trim() || BASE_URL_POR_DEFECTO).replace(/\/+$/, ""),
    modelo: env["IA_MODELO"]?.trim() || MODELO_POR_DEFECTO,
    timeoutMs: Number.isFinite(timeout) && timeout >= 3000 ? timeout : 20000,
  };
}

export class IaNoConfiguradaError extends Error {
  constructor() {
    super("IA_NO_CONFIGURADA");
  }
}

function contenidoDeRespuesta(payload: unknown): string | null {
  const choices = (payload as { choices?: unknown })?.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const contenido = (choices[0] as { message?: { content?: unknown } })?.message?.content;
  if (typeof contenido === "string") {
    return contenido.trim() || null;
  }
  if (Array.isArray(contenido)) {
    const texto = contenido
      .map((parte) => (typeof parte?.text === "string" ? parte.text : ""))
      .join("")
      .trim();
    return texto || null;
  }
  return null;
}

export async function completarChat(
  mensajes: MensajeIa[],
  config: ConfiguracionIa | null = configuracionIa(),
): Promise<string> {
  if (!config) {
    throw new IaNoConfiguradaError();
  }

  const respuesta = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({ model: config.modelo, messages: mensajes }),
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  if (!respuesta.ok) {
    throw new Error(`IA_HTTP_${respuesta.status}`);
  }

  const texto = contenidoDeRespuesta(await respuesta.json());
  if (!texto) {
    throw new Error("IA_RESPUESTA_VACIA");
  }
  return texto;
}

export function extraerJson(texto: string): unknown {
  const sinBloque = texto.replace(/```(?:json)?/gi, "").trim();
  const inicio = sinBloque.indexOf("{");
  const fin = sinBloque.lastIndexOf("}");
  if (inicio === -1 || fin <= inicio) {
    return null;
  }
  try {
    return JSON.parse(sinBloque.slice(inicio, fin + 1));
  } catch {
    return null;
  }
}
