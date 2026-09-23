const PALABRAS_CLINICAS = [
  "diagnostico",
  "diagnóstico",
  "prescri",
  "receta",
  "medicament",
  "dosis",
  "trastorno",
  "depres",
  "ansiedad grave",
  "tde",
  "tdah",
  "bipolar",
  "esquizofr",
  "autoles",
  "suicid",
  "matarme",
  "quitarme la vida",
  "ataque de panico",
  "ataque de pánico",
  "psiquiat",
];

export function pareceConsultaClinica(texto: string): boolean {
  const normalizado = texto.toLowerCase();
  return PALABRAS_CLINICAS.some((palabra) => normalizado.includes(palabra));
}

function webhookUrl(nombre: "N8N_WEBHOOK_ORIENTACION" | "N8N_WEBHOOK_RECOMENDACIONES"): string | null {
  const valor = process.env[nombre]?.trim();
  return valor ? valor : null;
}

function timeoutMs(): number {
  const crudo = Number(process.env["N8N_TIMEOUT_MS"] ?? 20000);
  return Number.isFinite(crudo) && crudo >= 3000 ? crudo : 20000;
}

export async function postWebhookN8n(
  tipo: "orientacion" | "recomendaciones",
  cuerpo: Record<string, unknown>,
): Promise<unknown> {
  const url =
    tipo === "orientacion"
      ? webhookUrl("N8N_WEBHOOK_ORIENTACION")
      : webhookUrl("N8N_WEBHOOK_RECOMENDACIONES");

  if (!url) {
    throw new Error("WEBHOOK_NO_CONFIGURADO");
  }

  const respuesta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(timeoutMs()),
  });

  if (!respuesta.ok) {
    throw new Error(`N8N_HTTP_${respuesta.status}`);
  }

  const contentType = respuesta.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return respuesta.json() as Promise<unknown>;
  }

  const texto = await respuesta.text();
  return { respuesta: texto };
}

export function extraerTextoAsistente(payload: unknown): string | null {
  const cola: unknown[] = [payload];
  const vistos = new Set<unknown>();

  while (cola.length > 0) {
    const actual = cola.shift();
    if (actual === undefined || actual === null || vistos.has(actual)) {
      continue;
    }
    vistos.add(actual);

    if (typeof actual === "string" && actual.trim()) {
      return actual.trim();
    }
    if (Array.isArray(actual)) {
      cola.push(...actual.slice(0, 5));
      continue;
    }
    if (typeof actual === "object") {
      const data = actual as Record<string, unknown>;
      for (const clave of ["respuesta", "output", "text", "message"]) {
        const valor = data[clave];
        if (typeof valor === "string" && valor.trim()) {
          return valor.trim();
        }
      }
      for (const clave of ["json", "data", "body"]) {
        if (clave in data) {
          cola.push(data[clave]);
        }
      }
    }
  }
  return null;
}

export type RecomendacionIa = { evento_id: string; motivo?: string };

export function extraerRecomendaciones(payload: unknown): RecomendacionIa[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const data = payload as Record<string, unknown>;
  const lista = data["recomendaciones"] ?? data["eventos"] ?? data["items"];
  if (!Array.isArray(lista)) {
    return [];
  }

  const resultado: RecomendacionIa[] = [];
  for (const item of lista) {
    if (typeof item === "string") {
      resultado.push({ evento_id: item });
      continue;
    }
    if (item && typeof item === "object") {
      const fila = item as Record<string, unknown>;
      const id = fila["evento_id"] ?? fila["id"];
      if (typeof id === "string") {
        resultado.push({
          evento_id: id,
          ...(typeof fila["motivo"] === "string" ? { motivo: fila["motivo"] } : {}),
        });
      }
    }
  }
  return resultado;
}
