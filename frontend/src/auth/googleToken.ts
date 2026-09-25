const dominioInstitucional = (
  import.meta.env.VITE_GOOGLE_HOSTED_DOMAIN || "uniautonoma.edu.co"
).replace(/^@/, "").toLowerCase();

export function dominioGoogleInstitucional(): string {
  return dominioInstitucional;
}

export function esCorreoInstitucionalCliente(email: string): boolean {
  return email.toLowerCase().endsWith(`@${dominioInstitucional}`);
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
  return typeof email === "string" ? email.toLowerCase() : null;
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
