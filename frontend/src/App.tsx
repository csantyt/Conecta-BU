import { useState } from "react";
import { leerToken, leerUsuario, limpiarSesion } from "./auth/session";
import LogoInstitucional from "./components/LogoInstitucional";
import ChatbotOrientacion from "./components/ChatbotOrientacion";
import type { ModuloId } from "./config/modulos";
import DesarrolloHumanoPage from "./pages/DesarrolloHumanoPage";
import DeportePage from "./pages/DeportePage";
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
    <div className="min-h-screen text-slate-100">
      <header className="relative overflow-hidden border-b border-white/10 bg-uni-noche/70 backdrop-blur">
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-full w-28 bg-uni-azul/70 [clip-path:polygon(35%_0,100%_0,100%_100%)] sm:w-40"
        />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-6 sm:py-4">
          <button
            type="button"
            onClick={() => setModuloActivo(null)}
            className="flex items-center gap-3 text-left"
          >
            <LogoInstitucional variante="oscuro" className="h-10 w-auto sm:h-14" />
            <div className="border-l border-white/20 pl-3">
              <p className="text-sm font-black uppercase tracking-wider sm:text-base">
                Conecta BU
              </p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-uni-cian sm:text-xs">
                Bienestar Universitario
              </p>
            </div>
          </button>

          <nav className="flex items-center gap-4 text-xs font-extrabold uppercase tracking-wider sm:gap-6 sm:text-sm">
            {moduloActivo ? (
              <button
                type="button"
                onClick={() => setModuloActivo(null)}
                className="hidden text-white transition hover:text-uni-cian md:inline"
              >
                <span className="text-uni-cian">→</span> Módulos
              </button>
            ) : null}
            <div className="hidden min-w-0 text-right normal-case sm:block">
              <p className="max-w-[16rem] truncate text-xs font-bold uppercase tracking-wide text-white">
                {usuario.nombre_completo || usuario.email}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-uni-cian">
                {etiquetaRol(usuario.rol)}
              </p>
            </div>
            <button
              type="button"
              onClick={cerrarSesion}
              className="shrink-0 text-uni-mandarina transition hover:text-uni-amarillo"
            >
              → Salir
            </button>
          </nav>
        </div>
      </header>

      {moduloActivo === "desarrollo-humano" ? (
        <DesarrolloHumanoPage
          usuario={usuario}
          onVolver={() => setModuloActivo(null)}
        />
      ) : moduloActivo === "deporte" ? (
        <DeportePage usuario={usuario} onVolver={() => setModuloActivo(null)} />
      ) : (
        <HomePage usuario={usuario} onAbrirModulo={setModuloActivo} />
      )}
      <ChatbotOrientacion />
    </div>
  );
}

export default App;
