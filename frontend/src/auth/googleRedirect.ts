export function construirUrlGoogle(): string {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const redirectUri = window.location.origin;
  const nonce = crypto.randomUUID();
  sessionStorage.setItem("google_oauth_nonce", nonce);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "id_token",
    scope: "openid email profile",
    nonce,
    prompt: "select_account",
    hd: import.meta.env.VITE_GOOGLE_HOSTED_DOMAIN || "uniautonoma.edu.co",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
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

  if (!error) {
    return null;
  }

  if (error === "redirect_uri_mismatch") {
    return "En Google Cloud, agrega http://localhost:5173 como URI de redirección autorizada.";
  }

  return params.get("error_description") ?? "Google canceló el inicio de sesión.";
}

export function limpiarHashDeLaUrl(): void {
  window.history.replaceState(null, "", window.location.pathname);
}
