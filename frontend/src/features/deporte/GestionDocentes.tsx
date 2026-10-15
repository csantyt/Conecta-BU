import { useEffect, useState } from "react";
import {
  actualizarDocenteAdmin,
  asignarDeportesDocenteAdmin,
  cargarDocentesCsvAdmin,
  crearDocenteAdmin,
  obtenerDeportesAdmin,
  obtenerDocentesPisu,
} from "../../api/deporte";
import type { DocentePisu } from "../../types/deporte";
import { mensajeError } from "./utils";

/** Elemento del catálogo de deportes que devuelve `/admin/deportes`. */
type DeporteCatalogo = Awaited<ReturnType<typeof obtenerDeportesAdmin>>[number];

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
  const [catalogo, setCatalogo] = useState<DeporteCatalogo[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [documento, setDocumento] = useState("");
  const [especialidad, setEspecialidad] = useState("");

  // Asignación de deportes: docente abierto en el modal y su selección actual.
  const [docenteAsignando, setDocenteAsignando] = useState<DocentePisu | null>(null);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);

  async function recargar() {
    setCargando(true);
    try {
      const [listaDocentes, listaDeportes] = await Promise.all([
        obtenerDocentesPisu(),
        obtenerDeportesAdmin(),
      ]);
      setDocentes(listaDocentes);
      setCatalogo(listaDeportes);
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
      (d.especialidad ?? "").toLowerCase().includes(q) ||
      (d.deportes ?? []).some((dep) => dep.nombre.toLowerCase().includes(q))
    );
  });

  function abrirAsignacion(docente: DocentePisu) {
    setDocenteAsignando(docente);
    setSeleccion((docente.deportes ?? []).map((dep) => dep.id));
  }

  async function onCrear(event: React.FormEvent) {
    event.preventDefault();
    setGuardando(true);
    try {
      const { docente } = await crearDocenteAdmin({
        nombre,
        correo,
        documento: documento || null,
        especialidad: especialidad || null,
      });
      setNombre("");
      setCorreo("");
      setDocumento("");
      setEspecialidad("");
      onAviso("Docente creado. Ahora asígnale sus deportes.", "docentes");
      await recargar();
      // Abrimos el modal de asignación para completar el flujo sin buscar en la tabla.
      abrirAsignacion({ ...docente, deportes: docente.deportes ?? [] });
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

  async function onGuardarAsignacion() {
    if (!docenteAsignando) return;
    setGuardandoAsignacion(true);
    try {
      await asignarDeportesDocenteAdmin(docenteAsignando.id, seleccion);
      onAviso(
        `Deportes actualizados para ${docenteAsignando.nombre}. Al entrar con su correo institucional verá estos deportes.`,
      );
      setDocenteAsignando(null);
      await recargar();
    } catch (err) {
      // Los errores de acción (400/404) NO cierran ni reemplazan la pantalla.
      onError(mensajeError(err));
    } finally {
      setGuardandoAsignacion(false);
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

  const activos = catalogo.filter((dep) => dep.estado !== false);

  return (
    <section className="space-y-6">
      <form
        onSubmit={(e) => void onCrear(e)}
        className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
      >
        <h2 className="text-lg font-semibold">Nuevo docente</h2>
        <p className="mt-1 text-sm text-slate-400">
          El acceso es con el correo institucional (Google). No se crea contraseña:
          al entrar por primera vez, el docente verá su panel con los deportes que le
          asignes aquí.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            Nombre
            <input required className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <label className="text-xs text-slate-400">
            Correo institucional
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
          Columnas: nombre, correo, documento, especialidad. Después asigna los deportes
          desde la tabla.
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
                  <th className="px-3 py-2">Deportes asignados</th>
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
                    <td className="px-3 py-2">
                      {docente.rol !== "Docente" ? (
                        <span className="text-slate-500">—</span>
                      ) : (docente.deportes ?? []).length === 0 ? (
                        <span className="text-slate-500">Sin asignar</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {(docente.deportes ?? []).map((dep) => (
                            <span
                              key={dep.id}
                              title={dep.tiene_horario ? "Con horario publicado" : "Sin horario publicado aún"}
                              className={
                                dep.tiene_horario
                                  ? "rounded-full border border-sky-400/40 bg-sky-400/10 px-2.5 py-0.5 text-xs text-sky-200"
                                  : "rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-0.5 text-xs text-amber-200"
                              }
                            >
                              {dep.nombre}
                              {dep.tiene_horario ? "" : " · sin horario"}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">{docente.estado === false ? "Inactivo" : "Activo"}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        {docente.rol === "Docente" ? (
                          <button
                            type="button"
                            className={btnSecundario}
                            onClick={() => abrirAsignacion(docente)}
                          >
                            Asignar deportes
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className={btnSecundario}
                          onClick={() => void onCambiarEstado(docente, docente.estado === false)}
                        >
                          {docente.estado === false ? "Activar" : "Desactivar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {docenteAsignando ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 text-white">
            <h3 className="text-lg font-semibold">Deportes de {docenteAsignando.nombre}</h3>
            <p className="mt-2 text-sm text-slate-300">
              Marca los deportes que este docente podrá gestionar. Al entrar con su correo
              institucional le aparecerán en su panel.
            </p>
            {activos.length === 0 ? (
              <p className="mt-3 text-sm text-amber-300">
                No hay deportes activos. Crea uno en la sección Deportes.
              </p>
            ) : (
              <div className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
                {activos.map((dep) => {
                  const marcado = seleccion.includes(dep.id);
                  return (
                    <label
                      key={dep.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-sky-400"
                        checked={marcado}
                        onChange={() =>
                          setSeleccion((actual) =>
                            marcado
                              ? actual.filter((id) => id !== dep.id)
                              : [...actual, dep.id],
                          )
                        }
                      />
                      <span>{dep.nombre}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className={btnSecundario}
                disabled={guardandoAsignacion}
                onClick={() => setDocenteAsignando(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={btnPrimario}
                disabled={guardandoAsignacion || activos.length === 0}
                onClick={() => void onGuardarAsignacion()}
              >
                {guardandoAsignacion ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
