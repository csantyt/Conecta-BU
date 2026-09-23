import axios from "axios";
import { useEffect, useState } from "react";
import { actualizarRolUsuario, listarUsuarios } from "../api/auth";
import EventosSugeridosIA from "../components/EventosSugeridosIA";
import { MODULOS, type ModuloId } from "../config/modulos";
import { etiquetaRol, type Usuario } from "../types/auth";

type HomePageProps = {
  usuario: Usuario;
  onAbrirModulo: (id: ModuloId) => void;
};

export default function HomePage({ usuario, onAbrirModulo }: HomePageProps) {
  const nombre = usuario.nombre_completo || usuario.email;
  const esAdmin = usuario.rol === "ADMINISTRADOR";

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-10">
      <section className="mb-8 rounded-3xl border border-white/10 bg-white/5 p-5 sm:mb-10 sm:p-8">
        <p className="text-sm font-medium text-emerald-300">
          Bienestar Universitario · Corporación Universitaria Autónoma del Cauca
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Módulos de Conecta BU
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Hola, {nombre}. Están habilitados Desarrollo humano y orientación y
          Deporte. Los demás módulos aparecen para que el catálogo de Bienestar
          se mantenga visible.
        </p>
        <p className="mt-4 text-sm text-slate-400">{usuario.email}</p>
      </section>

      <EventosSugeridosIA onIrAEventos={() => onAbrirModulo("desarrollo-humano")} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULOS.map((modulo) => (
          <article
            key={modulo.id}
            className={`rounded-2xl border p-6 shadow-xl ${
              modulo.activo
                ? "border-sky-200 bg-white text-slate-900"
                : "border-white/10 bg-white/80 text-slate-900 opacity-70"
            }`}
          >
            <h2 className="text-lg font-semibold">{modulo.titulo}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {modulo.descripcion}
            </p>
            {modulo.activo ? (
              <button
                type="button"
                onClick={() => onAbrirModulo(modulo.id)}
                className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Entrar
              </button>
            ) : (
              <p className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-400">
                Próximamente
              </p>
            )}
          </article>
        ))}
      </section>

      {esAdmin ? <PanelAdministradores sesion={usuario} /> : null}
    </main>
  );
}

function PanelAdministradores({ sesion }: { sesion: Usuario }) {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function recargar() {
    try {
      setError(null);
      setUsuarios(await listarUsuarios());
    } catch {
      setError("No se pudieron cargar los usuarios.");
    }
  }

  useEffect(() => {
    void recargar();
  }, []);

  async function cambiarRol(id: string, rol: Usuario["rol"]) {
    try {
      setError(null);
      await actualizarRolUsuario(id, rol);
      await recargar();
    } catch (err) {
      if (axios.isAxiosError(err) && typeof err.response?.data?.message === "string") {
        setError(err.response.data.message);
        return;
      }
      setError("No se pudo actualizar el rol.");
    }
  }

  return (
    <section className="mt-12 rounded-3xl border border-white/10 bg-white p-6 text-slate-900">
      <h2 className="text-lg font-semibold">Administradores</h2>
      <p className="mt-1 text-sm text-slate-600">
        La persona debe iniciar sesión una vez con Google. Después puedes
        convertirla en administradora aquí.
      </p>
      {error ? (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 font-medium">Nombre</th>
              <th className="py-2 font-medium">Correo</th>
              <th className="py-2 font-medium">Rol</th>
              <th className="py-2 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-3">{item.nombre_completo || "—"}</td>
                <td className="py-3">{item.email}</td>
                <td className="py-3">{etiquetaRol(item.rol)}</td>
                <td className="py-3">
                  {item.rol === "ADMINISTRADOR" ? (
                    <button
                      type="button"
                      disabled={item.id === sesion.id}
                      onClick={() => void cambiarRol(item.id, "USUARIO")}
                      className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-40"
                    >
                      Quitar admin
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void cambiarRol(item.id, "ADMINISTRADOR")}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white"
                    >
                      Hacer administrador
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
