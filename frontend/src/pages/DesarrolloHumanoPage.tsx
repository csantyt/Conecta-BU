import { useEffect, useState } from "react";
import { obtenerCitas, obtenerEventos, obtenerServicios } from "../api/desarrolloHumano";
import PanelAdministrador from "../features/desarrollo-humano/PanelAdministrador";
import PanelEstudiante from "../features/desarrollo-humano/PanelEstudiante";
import { mensajeError } from "../features/desarrollo-humano/utils";
import type { Usuario } from "../types/auth";
import type { Cita, EventoDH, Servicio } from "../types/desarrolloHumano";

type DesarrolloHumanoPageProps = {
  usuario: Usuario;
  onVolver: () => void;
};

type Panel = "estudiante" | "admin";

export default function DesarrolloHumanoPage({
  usuario,
  onVolver,
}: DesarrolloHumanoPageProps) {
  const esAdmin = usuario.rol === "ADMINISTRADOR";
  const [panel, setPanel] = useState<Panel>(esAdmin ? "admin" : "estudiante");
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [eventos, setEventos] = useState<EventoDH[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  async function recargar() {
    setCargando(true);
    setError(null);
    try {
      const [listaServicios, listaCitas, listaEventos] = await Promise.all([
        obtenerServicios(),
        obtenerCitas(),
        obtenerEventos(),
      ]);
      setServicios(listaServicios);
      setCitas(listaCitas);
      setEventos(listaEventos);
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void recargar();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-10">
      <button
        type="button"
        onClick={onVolver}
        className="mb-4 text-xs font-extrabold uppercase tracking-wider text-slate-300 transition hover:text-uni-cian sm:mb-6"
      >
        ← Volver a módulos
      </button>

      <section className="mb-6 rounded-3xl border border-white/10 bg-uni-noche/60 p-5 backdrop-blur sm:mb-8 sm:p-8">
        <span className="inline-block -rotate-2 rounded bg-uni-cian px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-uni-noche">
          Módulo activo
        </span>
        <h1 className="mt-4 text-3xl font-black uppercase tracking-tight sm:text-5xl">
          Desarrollo humano <span className="text-uni-mandarina">y orientación</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Agenda citas, consulta horarios y participa en eventos de Bienestar.
        </p>
      </section>

      {esAdmin ? (
        <div className="mb-5 flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setPanel("estudiante")}
            className={`shrink-0 rounded-full px-4 py-2 text-sm ${
              panel === "estudiante"
                ? "banda-uni sombra-uni font-bold text-uni-noche"
                : "border border-white/15 text-slate-300 hover:border-uni-mandarina/60"
            }`}
          >
            Vista estudiante
          </button>
          <button
            type="button"
            onClick={() => setPanel("admin")}
            className={`shrink-0 rounded-full px-4 py-2 text-sm ${
              panel === "admin"
                ? "banda-uni sombra-uni font-bold text-uni-noche"
                : "border border-white/15 text-slate-300 hover:border-uni-mandarina/60"
            }`}
          >
            Panel administrador
          </button>
        </div>
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

      {cargando ? (
        <p className="text-sm text-slate-400">Cargando información...</p>
      ) : null}

      {panel === "estudiante" || !esAdmin ? (
        <PanelEstudiante
          servicios={servicios}
          citas={esAdmin ? citas.filter((cita) => cita.usuario_id === usuario.id) : citas}
          eventos={eventos}
          onAviso={(valor) => {
            setError(null);
            setAviso(valor);
          }}
          onError={(valor) => {
            setAviso(null);
            setError(valor);
          }}
          onRecargar={recargar}
        />
      ) : (
        <PanelAdministrador
          servicios={servicios}
          citas={citas}
          eventos={eventos}
          onAviso={(valor) => {
            setError(null);
            setAviso(valor);
          }}
          onError={(valor) => {
            setAviso(null);
            setError(valor);
          }}
          onRecargar={recargar}
        />
      )}
    </main>
  );
}
