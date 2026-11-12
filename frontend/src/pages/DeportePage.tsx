import { useCallback, useEffect, useRef, useState } from "react";
import { obtenerCatalogoDeportes } from "../api/deporte";
import CatalogoDeportes from "../features/deporte/CatalogoDeportes";
import DocenteClasesHoy from "../features/deporte/DocenteClasesHoy";
import DocenteComunicados from "../features/deporte/DocenteComunicados";
import DocenteEstudiantes from "../features/deporte/DocenteEstudiantes";
import DocenteEventos from "../features/deporte/DocenteEventos";
import DocenteHistorial from "../features/deporte/DocenteHistorial";
import DocenteLlamarLista from "../features/deporte/DocenteLlamarLista";
import DocenteMisDeportes from "../features/deporte/DocenteMisDeportes";
import DocenteReporte from "../features/deporte/DocenteReporte";
import EstudianteMisDeportes from "../features/deporte/EstudianteMisDeportes";
import MiActividadPisu from "../features/deporte/MiActividadPisu";
import DeporteShell from "../features/deporte/DeporteShell";
import {
  ErrorState,
  NoEncontrada,
  Skeleton,
  Toast,
} from "../features/deporte/ui";
import EventosAlertasPisu from "../features/deporte/EventosAlertasPisu";
import {
  GestionDeportes,
  GestionHorarios,
  GestionEventos,
  GestionAlertas,
} from "../features/deporte/PanelAdminPisu";
import GestionDocentes from "../features/deporte/GestionDocentes";
import GestionEstudiantes from "../features/deporte/GestionEstudiantes";
import GestionInscritosDeporte from "../features/deporte/GestionInscritosDeporte";
import PanelInformacionAdmin from "../features/deporte/PanelInformacionAdmin";
import PanelUsuariosPisu from "../features/deporte/PanelUsuariosPisu";
import VerificarContenido from "../features/deporte/VerificarContenido";
import {
  homeDeRol,
  hashDeVista,
  parseVista,
  vistaDeHash,
  vistaValida,
  type RolPisu,
} from "../features/deporte/rutas";
import { mensajeError } from "../features/deporte/utils";
import type { Usuario } from "../types/auth";
import type { DeportePisu, PerfilPisu } from "../types/deporte";

type DeportePageProps = { usuario: Usuario; onVolver: () => void };

export default function DeportePage({ usuario, onVolver }: DeportePageProps) {
  const [deportes, setDeportes] = useState<DeportePisu[]>([]);
  const [perfil, setPerfil] = useState<PerfilPisu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [view, setView] = useState<string | null>(null);
  const [toast, setToast] = useState<{ mensaje: string; accion?: string } | null>(null);
  const [accionConflicto, setAccionConflicto] = useState<string | undefined>(undefined);
  const inicializado = useRef(false);

  const rol: RolPisu = perfil?.rol ?? "Estudiante";

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

  const recargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await obtenerCatalogoDeportes();
      setDeportes(data.deportes);
      setPerfil(data.perfil);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  // Al cambiar de pantalla se limpian los errores/filtros/modales globales.
  useEffect(() => {
    setError(null);
    setAccionConflicto(undefined);
  }, [view]);

  /**
   * Navega a otra vista, reflejándola en el hash para que F5 la restaure.
   * Solo se aceptan vistas del rol actual (evita URLs manipuladas).
   */
  const navegar = useCallback(
    (destino: string) => {
      const objetivo = vistaValida(rol, destino) ? destino : destino || homeDeRol(rol);
      setView(objetivo);
      const hash = hashDeVista(rol, objetivo);
      if (window.location.hash !== hash) {
        window.location.hash = hash;
      }
    },
    [rol],
  );

  // Vista inicial: la del hash si es válida para el rol; si no, la de inicio.
  useEffect(() => {
    if (inicializado.current) return;
    if (!perfil) return;
    const info = vistaDeHash(window.location.hash);
    const inicial =
      info && info.rol === perfil.rol ? info.view : homeDeRol(perfil.rol);
    setView(inicial);
    window.location.hash = hashDeVista(perfil.rol, inicial);
    inicializado.current = true;
  }, [perfil]);

  // Soporta atrás/adelante del navegador.
  useEffect(() => {
    function sincronizar() {
      if (!perfil) return;
      const info = vistaDeHash(window.location.hash);
      if (info && info.rol === perfil.rol) setView(info.view);
    }
    window.addEventListener("hashchange", sincronizar);
    return () => window.removeEventListener("hashchange", sincronizar);
  }, [perfil]);

  const vista = view ?? homeDeRol(rol);
  const { base, params } = parseVista(vista);

  const contenidoDocente = () => {
    if (base === "mis-deportes") return <DocenteMisDeportes onError={mostrarError} onNavegar={navegar} />;
    if (base === "hoy") return <DocenteClasesHoy onError={mostrarError} onNavegar={navegar} />;
    if (base === "eventos")
      return <DocenteEventos deporteInicial={params[0]} onAviso={mostrarAviso} onError={mostrarError} />;
    if (base === "lista")
      return (
        <DocenteLlamarLista
          horarioId={params[0] ?? ""}
          fechaInicial={params[1]}
          onAviso={mostrarAviso}
          onError={mostrarError}
          onNavegar={navegar}
        />
      );
    if (base === "historial") return <DocenteHistorial onError={mostrarError} onNavegar={navegar} />;
    if (base === "estudiantes") return <DocenteEstudiantes deporteInicial={params[0]} onError={mostrarError} />;
    if (base === "reporte")
      return <DocenteReporte deporteInicial={params[0]} onAviso={mostrarAviso} onError={mostrarError} />;
    if (base === "comunicados") return <DocenteComunicados onError={mostrarError} />;
    return null;
  };

  const contenidoEstudiante = () => {
    if (base === "catalogo")
      return (
        <CatalogoDeportes
          deportes={deportes}
          perfil={perfil}
          cargando={cargando}
          onAviso={mostrarAviso}
          onError={mostrarError}
          onRecargar={recargar}
        />
      );
    if (base === "eventos")
      return <EventosAlertasPisu perfil={perfil} onAviso={mostrarAviso} onError={mostrarError} />;
    if (base === "mis-deportes")
      return (
        <EstudianteMisDeportes
          perfil={perfil}
          onAviso={mostrarAviso}
          onError={mostrarError}
          onNavegar={navegar}
          onRecargar={recargar}
        />
      );
    if (base === "horario") return <MiActividadPisu onError={mostrarError} />;
    return null;
  };

  const contenidoAdmin = () => {
    if (base === "panel")
      return (
        <PanelInformacionAdmin
          deportes={deportes}
          usuario={usuario}
          onError={mostrarError}
          onNavegar={navegar}
        />
      );
    if (base === "verificar") return <VerificarContenido onError={mostrarError} />;
    if (base === "deportes")
      return (
        <GestionDeportes
          deportesCatalogo={deportes}
          onAviso={mostrarAviso}
          onError={mostrarError}
          onRecargar={recargar}
        />
      );
    if (base === "horarios")
      return (
        <GestionHorarios
          deportes={deportes}
          onAviso={mostrarAviso}
          onError={mostrarError}
          onRecargar={recargar}
        />
      );
    if (base === "eventos") return <GestionEventos onAviso={mostrarAviso} onError={mostrarError} />;
    if (base === "docentes") return <GestionDocentes onAviso={mostrarAviso} onError={mostrarError} />;
    if (base === "administradores")
      return perfil ? (
        <PanelUsuariosPisu
          perfil={perfil}
          onAviso={mostrarAviso}
          onError={mostrarError}
          onRecargarSesion={recargar}
        />
      ) : null;
    if (base === "estudiantes")
      return <GestionEstudiantes onAviso={mostrarAviso} onError={mostrarError} />;
    if (base === "inscritos")
      return <GestionInscritosDeporte onAviso={mostrarAviso} onError={mostrarError} />;
    if (base === "comunicados")
      return <GestionAlertas onAviso={mostrarAviso} onError={mostrarError} />;
    return null;
  };

  const contenido = () => {
    if (cargando && !perfil) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }
    if (error && !perfil) {
      return <ErrorState message={error} onRetry={() => void recargar()} />;
    }
    if (rol === "Docente") {
      const docente = contenidoDocente();
      if (docente) return docente;
    }
    if (rol === "Estudiante") {
      const estudiante = contenidoEstudiante();
      if (estudiante) return estudiante;
    }
    if (rol === "Administrador") {
      const admin = contenidoAdmin();
      if (admin) return admin;
    }
    // Ruta comodín: no existe o no pertenece a este rol.
    return <NoEncontrada onInicio={() => navegar(homeDeRol(rol))} />;
  };

  return (
    <DeporteShell
      usuario={usuario}
      rolPisu={rol}
      view={vista}
      setView={navegar}
      onVolver={onVolver}
    >
      {contenido()}
      {error ? (
        <Toast
          message={error}
          action={accionConflicto}
          onAction={() => {
            if (accionConflicto) navegar(accionConflicto);
            setError(null);
            setAccionConflicto(undefined);
          }}
        />
      ) : toast ? (
        <Toast
          message={toast.mensaje}
          action={toast.accion}
          onAction={() => {
            if (toast.accion) navegar(toast.accion);
            setToast(null);
          }}
        />
      ) : null}
    </DeporteShell>
  );
}
