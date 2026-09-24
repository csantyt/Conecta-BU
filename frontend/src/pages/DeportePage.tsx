import { useCallback, useEffect, useState } from "react";
import { obtenerCatalogoDeportes } from "../api/deporte";
import CatalogoDeportes from "../features/deporte/CatalogoDeportes";
import TomarAsistencia from "../features/deporte/TomarAsistencia";
import { mensajeError } from "../features/deporte/utils";
import type { Usuario } from "../types/auth";
import type { DeportePisu, PerfilPisu } from "../types/deporte";

type DeportePageProps = {
  usuario: Usuario;
  onVolver: () => void;
};

type VistaPisu = "catalogo" | "asistencia";

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
    if (perfil?.rol === "Docente") {
      setVista("asistencia");
    }
  }, [perfil?.rol]);

  const verAsistencia =
    perfil?.rol === "Docente" || perfil?.rol === "Administrador";

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
          Catálogo de disciplinas para estudiantes e inscripción con validación
          de cupo. Los docentes toman asistencia del grupo asignado.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          {usuario.nombre_completo || usuario.email}
          {perfil
            ? ` · ${perfil.rol}${perfil.categoria ? ` · ${perfil.categoria}` : ""}`
            : ""}
        </p>
      </section>

      {verAsistencia ? (
        <nav className="mb-5 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setVista("catalogo")}
            className={`shrink-0 rounded-full px-4 py-2 text-sm ${
              vista === "catalogo"
                ? "bg-white text-slate-900"
                : "border border-white/15 text-slate-300"
            }`}
          >
            Catálogo
          </button>
          <button
            type="button"
            onClick={() => setVista("asistencia")}
            className={`shrink-0 rounded-full px-4 py-2 text-sm ${
              vista === "asistencia"
                ? "bg-white text-slate-900"
                : "border border-white/15 text-slate-300"
            }`}
          >
            Tomar asistencia
          </button>
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

      {vista === "catalogo" || !verAsistencia ? (
        <CatalogoDeportes
          deportes={deportes}
          perfil={perfil}
          cargando={cargando}
          onAviso={onAviso}
          onError={onError}
          onRecargar={recargar}
        />
      ) : null}

      {vista === "asistencia" && verAsistencia ? (
        <TomarAsistencia onAviso={onAviso} onError={onError} />
      ) : null}
    </main>
  );
}
