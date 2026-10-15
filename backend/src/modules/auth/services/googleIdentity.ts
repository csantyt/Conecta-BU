import { OAuth2Client } from "google-auth-library";
import {
  esCorreoInstitucional,
  normalizarCorreoInstitucional,
  obtenerDominioInstitucional,
} from "../roles.js";

export class TokenGoogleInvalidoError extends Error {
  constructor(message = "No se pudo verificar el token de Google.") {
    super(message);
    this.name = "TokenGoogleInvalidoError";
  }
}

export class DominioNoPermitidoError extends Error {
  constructor() {
    super(
      `Solo se permite el acceso con correos institucionales @${obtenerDominioInstitucional()}.`,
    );
    this.name = "DominioNoPermitidoError";
  }
}

export type IdentidadGoogle = {
  email: string;
  nombreCompleto: string;
  hostedDomain: string | null;
};

function obtenerGoogleClientId(): string {
  const clientId = process.env["GOOGLE_CLIENT_ID"];
  if (!clientId) {
    throw new Error("La variable de entorno GOOGLE_CLIENT_ID es obligatoria.");
  }
  return clientId;
}

export async function verificarIdTokenGoogle(
  idToken: string,
): Promise<IdentidadGoogle> {
  const googleClientId = obtenerGoogleClientId();
  const client = new OAuth2Client(googleClientId);

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleClientId,
    });
    payload = ticket.getPayload();
  } catch {
    throw new TokenGoogleInvalidoError();
  }

  const emailBruto = payload?.email;
  const nombreCompleto = payload?.name ?? emailBruto ?? "";

  // Exigimos el correo verificado por Google (regla 10.1.7) antes de mirar el
  // dominio, para no confundir un token sin verificar con un dominio ajeno.
  if (!emailBruto || payload?.email_verified !== true) {
    throw new TokenGoogleInvalidoError(
      "No fue posible obtener un correo verificado desde Google.",
    );
  }

  // Solo validamos el correo. No exigimos claim `hd` (a veces falta en tokens
  // de Workspace y bloqueaba cuentas institucionales válidas).
  if (!esCorreoInstitucional(emailBruto)) {
    throw new DominioNoPermitidoError();
  }

  const email = normalizarCorreoInstitucional(emailBruto) as string;

  return {
    email,
    nombreCompleto,
    hostedDomain: payload.hd?.toLowerCase() ?? null,
  };
}
