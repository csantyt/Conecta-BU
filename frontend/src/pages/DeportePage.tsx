import { useCallback, useEffect, useState } from "react";
import { obtenerCatalogoDeportes } from "../api/deporte";
import CatalogoDeportes from "../features/deporte/CatalogoDeportes";
import EventosAlertasPisu from "../features/deporte/EventosAlertasPisu";
import PanelAdminPisu from "../features/deporte/PanelAdminPisu";
import PanelUsuariosPisu from "../features/deporte/PanelUsuariosPisu";
import TomarAsistencia from "../features/deporte/TomarAsistencia";
import { mensajeError } from "../features/deporte/utils";
import type { Usuario } from "../types/auth";
import type { DeportePisu, PerfilPisu } from "../types/deporte";

type DeportePageProps = {
  usuario: Usuario;
  onVolver: () => void;
};

type VistaPisu = "catalogo" | "asistencia" | "usuarios" | "admin";

const tabActiva =
  "bg-gradient-to-r from-sky-400 to-cyan-300 text-slate-950 shadow-[0_10px_24px_-12px_rgba(56,189,248,0.9)]";
const tabInactiva =
  "border border-white/15 text-slate-300 hover:border-sky-400/35 hover:bg-white/5 hover:text-white";

export default function DeportePage({ usuario, onVolver }: DeportePageProps) {
  const [deportes, setDeportes] = useState<DeportePisu[]>([]);
  const [perfil, setPerfil] = useState<PerfilPisu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<VistaPisu>("catalogo");

  const onAviso = useCallback((valor: string) => {
    setError(null);
    setAviso(valor);
  }, []);

  const onError = useCallback((valor: string) => {
    setAviso(null);
    setError(valor);
  }, []);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await obtenerCatalogoDeportes();
      setDeportes(data.deportes);
      setPerfil(data.perfil);
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, [onError]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  useEffect(() => {
    if (perfil?.rol === "Docente" && usuario.rol !== "ADMINISTRADOR") {
      setVista("asistencia");
    }
  }, [perfil?.rol, usuario.rol]);

  const verAsistencia =
    perfil?.rol === "Docente" || perfil?.rol === "Administrador";
  const verUsuarios =
    perfil?.rol === "Administrador" || usuario.rol === "ADMINISTRADOR";
  const verAdmin = verUsuarios;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-10">
      <button
        type="button"
        onClick={onVolver}
        className="mb-4 text-sm text-slate-300 transition hover:text-white sm:mb-6"
      >
        ← Volver a módulos
      </button>

      <section className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5 sm:mb-8 sm:p-8">
        <p className="text-sm font-medium text-sky-300">Módulo activo</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Deporte · PISU
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Catálogo, inscripción, asistencia docente, eventos, alertas y
          administración completa del módulo.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          {usuario.nombre_completo || usuario.email}
          {perfil
            ? ` · ${perfil.rol}${perfil.categoria ? ` · ${perfil.categoria}` : ""}`
            : ""}
        </p>
      </section>

      {verAsistencia || verUsuarios || verAdmin ? (
        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setVista("catalogo")}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
              vista === "catalogo" ? tabActiva : tabInactiva
            }`}
          >
            Catálogo
          </button>
          {verAsistencia ? (
            <button
              type="button"
              onClick={() => setVista("asistencia")}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                vista === "asistencia" ? tabActiva : tabInactiva
              }`}
            >
              Tomar asistencia
            </button>
          ) : null}
          {verUsuarios ? (
            <button
              type="button"
              onClick={() => setVista("usuarios")}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                vista === "usuarios" ? tabActiva : tabInactiva
              }`}
            >
              Usuarios PISU
            </button>
          ) : null}
          {verAdmin ? (
            <button
              type="button"
              onClick={() => setVista("admin")}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                vista === "admin" ? tabActiva : tabInactiva
              }`}
            >
              Administración
            </button>
          ) : null}
        </nav>
      ) : null}

      {error ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {aviso ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {aviso}
        </p>
      ) : null}

      {vista === "catalogo" || (!verAsistencia && !verUsuarios && !verAdmin) ? (
        <>
          <EventosAlertasPisu onError={onError} />
          <CatalogoDeportes
            deportes={deportes}
            perfil={perfil}
            cargando={cargando}
            onAviso={onAviso}
            onError={onError}
            onRecargar={recargar}
          />
        </>
      ) : null}

      {vista === "asistencia" && verAsistencia ? (
        <TomarAsistencia onAviso={onAviso} onError={onError} />
      ) : null}

      {vista === "usuarios" && verUsuarios && perfil ? (
        <PanelUsuariosPisu
          perfil={perfil}
          onAviso={onAviso}
          onError={onError}
          onRecargarSesion={recargar}
        />
      ) : null}

      {vista === "admin" && verAdmin ? (
        <PanelAdminPisu
          deportes={deportes}
          onAviso={onAviso}
          onError={onError}
          onRecargar={recargar}
        />
      ) : null}
    </main>
  );
}
