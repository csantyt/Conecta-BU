import { useState } from "react";
import { leerToken, leerUsuario, limpiarSesion } from "./auth/session";
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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <button
            type="button"
            onClick={() => setModuloActivo(null)}
            className="flex items-center gap-3 text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-semibold text-slate-900">
              BU
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide">Conecta BU</p>
              <p className="text-xs text-slate-400">
                Universidad Autónoma del Cauca
              </p>
            </div>
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">
                {usuario.nombre_completo || usuario.email}
              </p>
              <p className="text-xs tracking-wide text-slate-400">
                {etiquetaRol(usuario.rol)}
              </p>
            </div>
            <button
              type="button"
              onClick={cerrarSesion}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5"
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
    </div>
  );
}

export default App;
