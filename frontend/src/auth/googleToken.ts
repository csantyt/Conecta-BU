const dominioInstitucional = (
  import.meta.env.VITE_GOOGLE_HOSTED_DOMAIN || "uniautonoma.edu.co"
)
  .trim()
  .replace(/^@/, "")
  .toLowerCase();

export function dominioGoogleInstitucional(): string {
  return dominioInstitucional;
}

/**
 * Normaliza un correo institucional (misma regla que el backend, sección 10.1):
 * sin espacios, en minúsculas, exactamente un `@` y dominio EXACTAMENTE igual
 * al institucional. La validación definitiva la hace el servidor; esto solo
 * evita llamadas inútiles desde el cliente.
 */
export function normalizarCorreoInstitucional(
  email: string | null | undefined,
): string | null {
  if (typeof email !== "string") {
    return null;
  }
  const limpio = email.trim().toLowerCase();
  if (!limpio || /\s/.test(limpio)) {
    return null;
  }
  const arroba = limpio.indexOf("@");
  if (arroba <= 0 || arroba !== limpio.lastIndexOf("@")) {
    return null;
  }
  const local = limpio.slice(0, arroba);
  const dominio = limpio.slice(arroba + 1);
  if (!local || !dominio || dominio !== dominioInstitucional) {
    return null;
  }
  return limpio;
}

export function esCorreoInstitucionalCliente(email: string): boolean {
  return normalizarCorreoInstitucional(email) !== null;
}

function decodificarPayloadJwt(idToken: string): Record<string, unknown> | null {
  try {
    const partes = idToken.split(".");
    const payload = partes[1];
    if (!payload) {
      return null;
    }
    let normalizado = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalizado.length % 4;
    if (padding) {
      normalizado += "=".repeat(4 - padding);
    }
    const json = atob(normalizado);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Decodifica el payload de un JWT sin verificar firma (solo lectura en cliente). */
export function leerEmailDesdeIdToken(idToken: string): string | null {
  const data = decodificarPayloadJwt(idToken);
  const email = data?.["email"];
  return typeof email === "string" ? email.trim().toLowerCase() : null;
}

/**
 * Si podemos leer el email y NO es institucional → rechazar.
 * Si no podemos leerlo → dejar que el backend decida (no bloquear).
 */
export function validarCorreoInstitucionalEnToken(idToken: string): {
  ok: true;
  email: string | null;
} | {
  ok: false;
  message: string;
} {
  const email = leerEmailDesdeIdToken(idToken);
  if (!email) {
    return { ok: true, email: null };
  }
  if (!esCorreoInstitucionalCliente(email)) {
    return {
      ok: false,
      message: `Elegiste ${email}. Debes usar tu cuenta institucional @${dominioInstitucional}. En la lista de Google elige la de la universidad (no Gmail personal).`,
    };
  }
  return { ok: true, email };
}
