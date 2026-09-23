import axios from "axios";
import { useEffect, useState } from "react";
import {
  autoinscribirseDeporte,
  cancelarInscripcionPisu,
  obtenerCatalogoDeportes,
} from "../api/deporte";
import type { Usuario } from "../types/auth";
import type { DeportePisu, PerfilPisu } from "../types/deporte";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

type DeportePageProps = {
  usuario: Usuario;
  onVolver: () => void;
};

function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") {
      return message;
    }
  }
  return "No se pudo completar la acción.";
}

function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}

export default function DeportePage({ usuario, onVolver }: DeportePageProps) {
  const [deportes, setDeportes] = useState<DeportePisu[]>([]);
  const [perfil, setPerfil] = useState<PerfilPisu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);

  async function recargar() {
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
  }

  useEffect(() => {
    void recargar();
  }, []);

  async function inscribir(deporte: DeportePisu) {
    setEnviandoId(deporte.id);
    setError(null);
    setAviso(null);
    try {
      await autoinscribirseDeporte(deporte.id);
      setAviso(`Quedaste inscrito en ${deporte.nombre}.`);
      await recargar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviandoId(null);
    }
  }

  async function cancelar(deporte: DeportePisu) {
    if (!deporte.inscripcion_id) {
      return;
    }
    setEnviandoId(deporte.id);
    setError(null);
    setAviso(null);
    try {
      await cancelarInscripcionPisu(deporte.inscripcion_id);
      setAviso(`Se canceló tu inscripción a ${deporte.nombre}.`);
      await recargar();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviandoId(null);
    }
  }

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
          Autoinscripción a disciplinas (RF-019). El cupo, tu categoría y los
          cruces de horario se validan en el servidor.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          {usuario.nombre_completo || usuario.email}
          {perfil ? ` · ${perfil.rol}${perfil.categoria ? ` · ${perfil.categoria}` : ""}` : ""}
        </p>
      </section>

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
        <p className="text-sm text-slate-400">Cargando disciplinas...</p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {deportes.map((deporte) => (
            <article
              key={deporte.id}
              className="rounded-2xl border border-white/10 bg-white p-5 text-slate-900"
            >
              <h2 className="text-lg font-semibold">{deporte.nombre}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {deporte.descripcion}
              </p>
              <p className="mt-3 text-xs text-slate-500">
                Cupo {deporte.cupo_disponible}/{deporte.cupo_maximo} · Categorías:{" "}
                {deporte.categorias_permitidas.join(", ")}
              </p>
              {deporte.horarios.length > 0 ? (
                <ul className="mt-3 space-y-1 text-xs text-slate-600">
                  {deporte.horarios.map((horario) => (
                    <li key={horario.id}>
                      {DIAS[horario.dia_semana]} {horaCorta(horario.hora_inicio)}–
                      {horaCorta(horario.hora_fin)} · {horario.lugar}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-400">
                  Aún no hay horarios publicados.
                </p>
              )}
              {deporte.inscrito ? (
                <button
                  type="button"
                  disabled={enviandoId === deporte.id}
                  onClick={() => void cancelar(deporte)}
                  className="mt-4 w-full rounded-xl border px-4 py-2.5 text-sm disabled:opacity-50"
                >
                  Cancelar inscripción
                </button>
              ) : (
                <button
                  type="button"
                  disabled={
                    enviandoId === deporte.id ||
                    deporte.cupo_disponible <= 0 ||
                    perfil?.rol !== "Estudiante"
                  }
                  onClick={() => void inscribir(deporte)}
                  className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  Inscribirme
                </button>
              )}
            </article>
          ))}
        </section>
      )}

      {!cargando && deportes.length === 0 ? (
        <p className="text-sm text-slate-400">No hay disciplinas publicadas.</p>
      ) : null}
    </main>
  );
}
