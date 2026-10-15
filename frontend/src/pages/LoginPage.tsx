import axios from "axios";
import { useEffect, useState } from "react";
import { loginConGoogle } from "../api/auth";
import {
  construirUrlGoogle,
  leerErrorGoogleDesdeRetorno,
  leerIdTokenDesdeHash,
  limpiarHashDeLaUrl,
} from "../auth/googleRedirect";
import {
  dominioGoogleInstitucional,
  validarCorreoInstitucionalEnToken,
} from "../auth/googleToken";
import { guardarSesion, limpiarSesion } from "../auth/session";
import LogoInstitucional from "../components/LogoInstitucional";
import type { Usuario } from "../types/auth";

type LoginPageProps = {
  onAutenticado: (usuario: Usuario) => void;
};

const PENDING_TOKEN_KEY = "google_id_token_pending";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
console.log("CLIENT_ID:", JSON.stringify(googleClientId));
const hostedDomain = dominioGoogleInstitucional();
const googleConfigurado =
  Boolean(googleClientId) &&
  googleClientId !== "tu_google_client_id_aqui" &&
  !googleClientId.includes("<");

export default function LoginPage({ onAutenticado }: LoginPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [origen, setOrigen] = useState("");

  useEffect(() => {
    setOrigen(window.location.origin);
  }, []);

  async function enviarIdToken(idToken: string) {
    const validacion = validarCorreoInstitucionalEnToken(idToken);
    if (!validacion.ok) {
      sessionStorage.removeItem(PENDING_TOKEN_KEY);
      limpiarSesion();
      setCargando(false);
      setError(validacion.message);
      return;
    }

    setCargando(true);
    setError(null);

    try {
      const data = await loginConGoogle(idToken);
      sessionStorage.removeItem(PENDING_TOKEN_KEY);
      guardarSesion(data.token, data.usuario);
      onAutenticado(data.usuario);
    } catch (err) {
      limpiarSesion();
      sessionStorage.removeItem(PENDING_TOKEN_KEY);

      if (axios.isAxiosError(err)) {
        if (!err.response) {
          setError(
            "No se pudo contactar al servidor. Confirma que el backend esté en marcha y que abras la app por la IP de la PC (no localhost en el teléfono).",
          );
          return;
        }
        const message = err.response.data?.message;
        setError(
          typeof message === "string"
            ? message
            : "No fue posible iniciar sesión. Inténtalo de nuevo.",
        );
        return;
      }

      setError("Ocurrió un error inesperado al iniciar sesión.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // Limpia estados viejos que dejaban el botón deshabilitado.
    const errorGoogle = leerErrorGoogleDesdeRetorno();
    if (errorGoogle) {
      setError(errorGoogle);
      limpiarHashDeLaUrl();
      sessionStorage.removeItem(PENDING_TOKEN_KEY);
      return;
    }

    const desdeHash = leerIdTokenDesdeHash();
    if (desdeHash) {
      sessionStorage.setItem(PENDING_TOKEN_KEY, desdeHash);
      limpiarHashDeLaUrl();
    }

    const idToken = desdeHash ?? sessionStorage.getItem(PENDING_TOKEN_KEY);
    if (!idToken) {
      return;
    }

    void enviarIdToken(idToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function iniciarSesionConGoogle() {
    if (!googleConfigurado) {
      setError("Falta configurar VITE_GOOGLE_CLIENT_ID.");
      return;
    }
    setError(null);
    sessionStorage.removeItem(PENDING_TOKEN_KEY);
    try {
      const url = construirUrlGoogle();
      window.location.assign(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo abrir Google. Recarga e inténtalo de nuevo.",
      );
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-10 px-4 py-10 lg:flex-row lg:gap-20">
      <div className="relative z-10 max-w-md text-center lg:text-left">
        <LogoInstitucional
          variante="oscuro"
          className="mx-auto mb-6 h-24 w-auto lg:mx-0"
        />
        <span className="inline-block -rotate-3 rounded-md bg-uni-cian px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-uni-noche shadow-lg">
          Bienestar Universitario
        </span>
        <h1 className="mt-5 text-5xl font-black uppercase leading-[0.9] tracking-tight text-white sm:text-6xl">
          Conecta
          <span className="text-uni-cian"> BU</span>
        </h1>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-white/80">
          Uniautónoma del Cauca
        </p>
        <p className="mt-6 hidden text-sm font-extrabold uppercase tracking-wider text-white lg:block">
          <span className="text-uni-mandarina">→ Desarrollo humano</span>
          <span className="mx-3 text-white/30">|</span>
          → Deporte
        </p>
      </div>

      <section className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl bg-white p-8 shadow-2xl">
        <div className="banda-uni absolute inset-x-0 top-0 h-2" aria-hidden />
        <div className="mb-8 text-center">
          <h2 className="text-xl font-black uppercase tracking-wide text-uni-marino">
            Iniciar sesión
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Se mostrará la lista de cuentas. Elige la institucional{" "}
            <span className="font-semibold text-slate-800">
              @{hostedDomain}
            </span>
            .
          </p>
        </div>

        <div className="space-y-4">
          {googleConfigurado ? (
            <button
              type="button"
              onClick={iniciarSesionConGoogle}
              className="banda-uni sombra-uni flex w-full items-center justify-center gap-3 rounded-full px-4 py-3.5 text-sm font-extrabold uppercase tracking-wider text-white transition active:scale-[0.98] hover:brightness-105"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                <GoogleIcon />
              </span>
              Elegir cuenta de Google
            </button>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
              Configura <span className="font-medium">VITE_GOOGLE_CLIENT_ID</span>{" "}
              en <span className="font-medium">frontend/.env</span>.
            </p>
          )}

          {cargando ? (
            <p className="text-center text-sm text-slate-500">
              Validando tu cuenta con el servidor...
            </p>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700"
            >
              {error}
            </p>
          ) : (
            <p className="text-center text-xs leading-5 text-slate-500">
              Toca la cuenta @{hostedDomain} en la lista. La personal será
              rechazada por la app.
            </p>
          )}

          {origen ? (
            <p className="break-all text-center text-[11px] text-slate-400">
              Origen: {origen}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.8-6.6 7.2l6.3 5.3C37.3 38.3 44 33 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}
