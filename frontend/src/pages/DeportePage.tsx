import { useCallback, useEffect, useState } from "react";
import { obtenerCatalogoDeportes, obtenerMisAsistenciasPisu } from "../api/deporte";
import CatalogoDeportes from "../features/deporte/CatalogoDeportes";
import DeporteShell from "../features/deporte/DeporteShell";
import { Toast } from "../features/deporte/ui";
import EventosAlertasPisu from "../features/deporte/EventosAlertasPisu";
import EventosEstudiante from "../features/deporte/EventosEstudiante";
import MiHorarioEstudiante from "../features/deporte/MiHorarioEstudiante";
import MisDeportesEventos from "../features/deporte/MisDeportesEventos";
import GestionGrupoDocente from "../features/deporte/GestionGrupoDocente";
import { GestionDeportes, GestionHorarios, GestionEventos, GestionAlertas } from "../features/deporte/PanelAdminPisu";
import GestionDocentes from "../features/deporte/GestionDocentes";
import GestionEstudiantes from "../features/deporte/GestionEstudiantes";
import PanelInformacionAdmin from "../features/deporte/PanelInformacionAdmin";
import VerificarContenido from "../features/deporte/VerificarContenido";
import { mensajeError } from "../features/deporte/utils";
import type { Usuario } from "../types/auth";
import type { DeportePisu, PerfilPisu, AsistenciaEstudiantePisu } from "../types/deporte";

type DeportePageProps = { usuario: Usuario; onVolver: () => void; vistaInicial?: string; onVistaChange?: (vista: string) => void };

export default function DeportePage({ usuario, onVolver: _onVolver, vistaInicial = "catalogo", onVistaChange }: DeportePageProps) {
  const [view, setView] = useState<string>(vistaInicial ?? "catalogo");
  const [deportes, setDeportes] = useState<DeportePisu[]>([]);
  const [perfil, setPerfil] = useState<PerfilPisu | null>(null);
  const [asistencias, setAsistencias] = useState<AsistenciaEstudiantePisu[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  // Sync view with hash (used by DeporteShell sidebar)
  useEffect(() => {
    function syncFromHash() {
      const hash = window.location.hash.replace(/^#/, "").replace(/^\/deportes\/[^/]*\//, "");
      if (hash) setView(hash);
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  // Notify App.tsx of view changes (for browser back/forward)
  useEffect(() => {
    onVistaChange?.(view);
    // Update hash without triggering hashchange loop
    const currentHash = window.location.hash.replace(/^#/, "").replace(/^\/deportes\/[^/]*\//, "");
    if (currentHash !== view) {
      window.location.hash = `/deportes/${view}`;
    }
  }, [view, onVistaChange]);

  // Clear errors on view change
  useEffect(() => {
    setError(null);
    setAccionConflicto(undefined);
  }, [view]);

  const [initialized, setInitialized] = useState(false);
  const [toast, setToast] = useState<{ mensaje: string; accion?: string } | null>(null);
  const [accionConflicto, setAccionConflicto] = useState<string | undefined>(undefined);

  const mostrarAviso = useCallback((mensaje: string, accion?: string) => {
    setToast({ mensaje, accion });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const mostrarError = useCallback((mensaje: string) => {
    const match = mensaje.match(/\(Ver: (\w+)\)\s*$/);
    const limpio = mensaje.replace(/\s*\(Ver: \w+\)\s*$/, "");
    setError(limpio);
    setAccionConflicto(match ? match[1] : undefined);
    window.setTimeout(() => {
      setError(null);
      setAccionConflicto(undefined);
    }, 8000);
  }, []);

  // Auto-redirect based on role after profile loads
  useEffect(() => {
    if (initialized || !perfil) return;
    if (perfil.rol === "Administrador") setView("panel");
    else if (perfil.rol === "Docente") setView("mis-grupos");
    else setView("catalogo");
    setInitialized(true);
  }, [perfil, initialized]);

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const [data, historial] = await Promise.all([
        obtenerCatalogoDeportes(),
        obtenerMisAsistenciasPisu().catch(() => ({ asistencias: [] as AsistenciaEstudiantePisu[] })),
      ]);
      setDeportes(data.deportes);
      setPerfil(data.perfil);
      setAsistencias(historial.asistencias);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void recargar(); }, [recargar]);

  const rolPisu = perfil?.rol ?? "Estudiante";

  const rendered = () => {
    if (cargando && !perfil) return <p className="text-sm text-slate-400">Cargando...</p>;
    if (error && !perfil) {
      return (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5">
          <p className="text-sm text-rose-100">{error}</p>
          <button type="button" className="mt-3 rounded-full border border-rose-400/40 px-4 py-1.5 text-xs" onClick={() => void recargar()}>
            Reintentar
          </button>
        </div>
      );
    }
    // Admin views
    if (view === "panel") return <PanelInformacionAdmin deportes={deportes} usuario={usuario} onError={mostrarError} onNavegar={(v) => setView(v)} />;
    if (view === "verificar") return <VerificarContenido onError={mostrarError} />;
    if (view === "deportes") return <GestionDeportes deportesCatalogo={deportes} onAviso={mostrarAviso} onError={mostrarError} onRecargar={recargar} />;
    if (view === "horarios") return <GestionHorarios deportes={deportes} onAviso={mostrarAviso} onError={mostrarError} onRecargar={recargar} />;
    if (view === "eventos") return <GestionEventos onAviso={mostrarAviso} onError={mostrarError} />;
    if (view === "docentes" || view === "administradores") return <GestionDocentes onAviso={mostrarAviso} onError={mostrarError} />;
    if (view === "estudiantes") return <GestionEstudiantes onAviso={mostrarAviso} onError={mostrarError} />;
    if (view === "comunicados") return <GestionAlertas onAviso={mostrarAviso} onError={mostrarError} />;
    if (view === "mis-grupos") return <GestionGrupoDocente onError={mostrarError} />;
    // Student views
    if (view === "eventos-estudiante") return <EventosEstudiante perfil={perfil} onAviso={mostrarAviso} onError={mostrarError} />;
    if (view === "mis-deportes") return <MisDeportesEventos asistencias={asistencias} onError={mostrarError} />;
    if (view === "mi-horario") return <MiHorarioEstudiante asistencias={asistencias} />;
    if (view === "catalogo") {
      return (
        <>
          <EventosAlertasPisu perfil={perfil} onAviso={mostrarAviso} onError={mostrarError} />
          <CatalogoDeportes deportes={deportes} perfil={perfil} cargando={cargando} onAviso={mostrarAviso} onError={mostrarError} onRecargar={recargar} />
        </>
      );
    }
    return <p className="text-sm text-slate-300">Sección en construcción: {view}</p>;
  };

  return (
    <DeporteShell usuario={usuario} rolPisu={rolPisu} view={view} setView={setView}>
      {rendered()}
      {error ? <Toast message={error} action={accionConflicto} onAction={() => { if (accionConflicto) setView(accionConflicto); setError(null); setAccionConflicto(undefined); }} /> : (toast ? <Toast message={toast.mensaje} action={toast.accion} onAction={() => { if (toast.accion) setView(toast.accion); setToast(null); }} /> : null)}
    </DeporteShell>
  );
}