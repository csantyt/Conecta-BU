import { useState } from "react";
import { leerToken, leerUsuario, limpiarSesion } from "./auth/session";
import LogoInstitucional from "./components/LogoInstitucional";
import ChatbotOrientacion from "./components/ChatbotOrientacion";
import type { ModuloId } from "./config/modulos";
import DesarrolloHumanoPage from "./pages/DesarrolloHumanoPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import { etiquetaRol, type Usuario } from "./types/auth";

function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(leerUsuario);
  const [moduloActivo, setModuloActivo] = useState<ModuloId | null>(null);

  const autenticado = Boolean(leerToken() && usuario);

  function cerrarSesion() {
    limpiarSesion();
    setUsuario(null);
    setModuloActivo(null);
  }

  if (!autenticado || !usuario) {
    return <LoginPage onAutenticado={setUsuario} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:py-4">
          <button
            type="button"
            onClick={() => setModuloActivo(null)}
            className="flex items-center gap-3 text-left"
          >
            <LogoInstitucional variante="oscuro" className="h-10 w-auto sm:h-14" />
            <div>
              <p className="text-sm font-semibold tracking-wide">Conecta BU</p>
              <p className="text-xs text-slate-400">Bienestar Universitario</p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <div className="min-w-0 max-w-[42vw] text-right sm:max-w-none">
              <p className="truncate text-xs font-medium sm:text-sm">
                {usuario.nombre_completo || usuario.email}
              </p>
              <p className="truncate text-[11px] tracking-wide text-slate-400 sm:text-xs">
                {etiquetaRol(usuario.rol)}
              </p>
            </div>
            <button
              type="button"
              onClick={cerrarSesion}
              className="shrink-0 rounded-xl border border-white/15 px-3 py-2 text-xs text-slate-200 transition hover:bg-white/5 sm:text-sm"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {moduloActivo === "desarrollo-humano" ? (
        <DesarrolloHumanoPage
          usuario={usuario}
          onVolver={() => setModuloActivo(null)}
        />
      ) : (
        <HomePage usuario={usuario} onAbrirModulo={setModuloActivo} />
      )}
      <ChatbotOrientacion />
    </div>
  );
}

export default App;
