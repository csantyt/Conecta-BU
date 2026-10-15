import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const location = useLocation();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState<Usuario | null>(leerUsuario);
  const [moduloActivo, setModuloActivo] = useState<ModuloId | null>(null);
  const [vistaDeporte, setVistaDeporte] = useState<"catalogo" | "actividad" | "asistencia" | "usuarios" | "admin">("catalogo");

  useEffect(() => {
    const path = location.pathname;
    if (path === "/" || path === "/modulos") setModuloActivo(null);
    else if (path.startsWith("/desarrollo-humano")) setModuloActivo("desarrollo-humano");
    else if (
      path.startsWith("/deporte") ||
      path.startsWith("/catalogo") ||
      path.startsWith("/eventos") ||
      path.startsWith("/mis-deportes") ||
      path.startsWith("/mi-horario") ||
      path.startsWith("/asistencia")
    ) {
      setModuloActivo("deporte");
      if (path.startsWith("/mis-deportes") || path.startsWith("/mi-horario")) setVistaDeporte("actividad");
      else if (path.startsWith("/asistencia")) setVistaDeporte("asistencia");
      else setVistaDeporte("catalogo");
    }
  }, [location.pathname]);

  const autenticado = Boolean(leerToken() && usuario);

  function abrirModulo(modulo: ModuloId | null) {
    setModuloActivo(modulo);
    if (modulo === "deporte") navigate("/deporte");
    else if (modulo === "desarrollo-humano") navigate("/desarrollo-humano");
    else navigate("/");
  }

  function cerrarVistaDeporte(vista: string) {
    const v = vista as "catalogo" | "actividad" | "asistencia" | "usuarios" | "admin";
    setVistaDeporte(v);
    const path =
      v === "actividad" ? "/mis-deportes" : v === "asistencia" ? "/asistencia" : v === "admin" ? "/admin" : v === "usuarios" ? "/usuarios" : "/catalogo";
    navigate(path);
  }

  function cerrarSesion() {
    limpiarSesion();
    setUsuario(null);
    setModuloActivo(null);
    navigate("/login");
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
            onClick={() => abrirModulo(null)}
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
                onClick={() => abrirModulo(null)}
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
          onVolver={() => abrirModulo(null)}
        />
      ) : moduloActivo === "deporte" ? (
        <DeportePage
          usuario={usuario}
          onVolver={() => abrirModulo(null)}
          vistaInicial={vistaDeporte}
          onVistaChange={cerrarVistaDeporte}
        />
      ) : (
        <HomePage usuario={usuario} onAbrirModulo={abrirModulo} />
      )}
      <ChatbotOrientacion />
    </div>
  );
}

export default App;
