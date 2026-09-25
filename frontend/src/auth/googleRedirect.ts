function crearNonce(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `nonce-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function construirUrlOauth(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Falta VITE_GOOGLE_CLIENT_ID.");
  }

  const redirectUri = window.location.origin.replace(/\/$/, "");
  const nonce = crearNonce();
  sessionStorage.setItem("google_oauth_nonce", nonce);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
    prompt: "select_account",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * AccountChooser = lista de cuentas ya guardadas para elegir.
 * (AddSession pedía digitar correo y fallaba con "ya existe".)
 */
export function construirUrlGoogle(): string {
  const oauthUrl = construirUrlOauth();
  const params = new URLSearchParams({
    hl: "es",
    continue: oauthUrl,
  });
  return `https://accounts.google.com/AccountChooser?${params.toString()}`;
}

export function leerIdTokenDesdeHash(): string | null {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  return params.get("id_token");
}

export function leerErrorGoogleDesdeRetorno(): string | null {
  const hash = window.location.hash.replace(/^#/, "");
  const query = window.location.search.replace(/^\?/, "");
  const params = new URLSearchParams(hash || query);
  const error = params.get("error");
  const descripcion = params.get("error_description");

  if (!error) {
    return null;
  }

  const origen = window.location.origin.replace(/\/$/, "");

  if (error === "redirect_uri_mismatch" || error === "invalid_request") {
    return (
      `Google rechazó la solicitud (Error 400). En Google Cloud agrega EXACTAMENTE:\n${origen}\n` +
      `en orígenes de JavaScript y URI de redirección.` +
      (descripcion ? ` (${descripcion})` : "")
    );
  }

  if (error === "access_denied") {
    return (
      "Google denegó el acceso. Si usas la cuenta institucional, TI/Workspace puede estar bloqueando apps externas."
    );
  }

  return descripcion ?? `Google canceló el inicio de sesión (${error}).`;
}

export function limpiarHashDeLaUrl(): void {
  window.history.replaceState(null, "", window.location.pathname);
}
