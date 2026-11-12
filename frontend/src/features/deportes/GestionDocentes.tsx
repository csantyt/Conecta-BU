import { useEffect, useState } from "react";
import {
  actualizarDocenteAdmin,
  cargarDocentesCsvAdmin,
  crearDocenteAdmin,
  obtenerDocentesPisu,
} from "../../api/deporte";
import type { DocentePisu } from "../../types/deporte";
import { mensajeError } from "./utils";

type Props = {
  onAviso: (valor: string, accion?: string) => void;
  onError: (valor: string) => void;
};

const inputClass =
  "mt-1 w-full rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white outline-none ring-sky-400 focus:ring-2";
const btnPrimario =
  "banda-uni sombra-uni rounded-full px-4 py-2 text-sm font-bold text-uni-noche transition hover:brightness-105 disabled:opacity-50";
const btnSecundario =
  "rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-400/10";

export default function GestionDocentes({ onAviso, onError }: Props) {
  const [docentes, setDocentes] = useState<DocentePisu[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [documento, setDocumento] = useState("");
  const [especialidad, setEspecialidad] = useState("");

  const [passwordTemporal, setPasswordTemporal] = useState<string | null>(null);

  async function recargar() {
    setCargando(true);
    try {
      setDocentes(await obtenerDocentesPisu());
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void recargar();
  }, []);

  const filtrados = docentes.filter((d) => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return true;
    return (
      d.nombre.toLowerCase().includes(q) ||
      d.correo.toLowerCase().includes(q) ||
      (d.documento ?? "").toLowerCase().includes(q) ||
      (d.especialidad ?? "").toLowerCase().includes(q)
    );
  });

  async function onCrear(event: React.FormEvent) {
    event.preventDefault();
    setGuardando(true);
    try {
      const resultado = await crearDocenteAdmin({
        nombre,
        correo,
        documento: documento || null,
        especialidad: especialidad || null,
      });
      setNombre("");
      setCorreo("");
      setDocumento("");
      setEspecialidad("");
      setPasswordTemporal(resultado.passwordTemporal);
      onAviso("Docente creado. Copia la contraseña temporal ahora.", "docentes");
      await recargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  async function onCambiarEstado(docente: DocentePisu, estado: boolean) {
    if (!docente.id) return;
    try {
      await actualizarDocenteAdmin(docente.id, { estado });
      onAviso(estado ? "Docente activado." : "Docente desactivado.");
      await recargar();
    } catch (err) {
      onError(mensajeError(err));
    }
  }

  async function onCsvChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const texto = await file.text();
    try {
      const resumen = await cargarDocentesCsvAdmin(texto);
      onAviso(
        `Carga masiva finalizada. Creados: ${resumen.creados}. Errores: ${resumen.errores.length}.`,
      );
      if (resumen.errores.length) {
        onError(
          resumen.errores
            .map((e) => `Fila ${e.fila}: ${e.motivo}`)
            .join(" | "),
        );
      }
      await recargar();
    } catch (err) {
      onError(mensajeError(err));
    } finally {
      event.target.value = "";
    }
  }

  return (
    <section className="space-y-6">
      <form
        onSubmit={(e) => void onCrear(e)}
        className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
      >
        <h2 className="text-lg font-semibold">Nuevo docente</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            Nombre
            <input required className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="text-xs text-slate-400">
            Correo
            <input type="email" required className={inputClass} value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </label>
          <label className="text-xs text-slate-400">
            Documento
            <input className={inputClass} value={documento} onChange={(e) => setDocumento(e.target.value)} />
          </label>
          <label className="text-xs text-slate-400">
            Especialidad
            <input className={inputClass} value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} />
          </label>
        </div>
        <button type="submit" disabled={guardando} className={`mt-4 ${btnPrimario}`}>
          {guardando ? "Guardando..." : "Crear docente"}
        </button>
      </form>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="text-lg font-semibold">Carga masiva por CSV</h2>
        <p className="mt-1 text-sm text-slate-400">
          Columnas: nombre, correo, documento, especialidad.
        </p>
        <input type="file" accept=".csv,text/csv" onChange={(e) => void onCsvChange(e)} className="mt-3 text-sm" />
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Docentes</h2>
          <input
            className="rounded-xl border border-white/15 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        {cargando ? (
          <p className="mt-4 text-sm text-slate-400">Cargando docentes...</p>
        ) : filtrados.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">No hay docentes registrados.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Correo</th>
                  <th className="px-3 py-2">Especialidad</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((docente) => (
                  <tr key={docente.id} className="border-t border-white/5">
                    <td className="px-3 py-2">{docente.nombre}</td>
                    <td className="px-3 py-2 text-slate-300">{docente.correo}</td>
                    <td className="px-3 py-2 text-slate-400">{docente.especialidad ?? "—"}</td>
                    <td className="px-3 py-2">{docente.estado === false ? "Inactivo" : "Activo"}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className={btnSecundario}
                        onClick={() => void onCambiarEstado(docente, docente.estado === false)}
                      >
                        {docente.estado === false ? "Activar" : "Desactivar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {passwordTemporal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 text-white">
            <h3 className="text-lg font-semibold">Contraseña temporal</h3>
            <p className="mt-2 text-sm text-slate-300">
              Copia esta contraseña ahora. Solo se muestra una vez:
            </p>
            <div className="mt-3 rounded-xl border border-sky-400/30 bg-slate-950 px-4 py-3 font-mono text-sm">
              {passwordTemporal}
            </div>
            <button
              type="button"
              className={`mt-4 ${btnPrimario}`}
              onClick={() => setPasswordTemporal(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}