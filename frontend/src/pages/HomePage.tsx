import { MODULOS, type ModuloId } from "../config/modulos";
import type { Usuario } from "../types/auth";

type HomePageProps = {
  usuario: Usuario;
  onAbrirModulo: (id: ModuloId) => void;
};

export default function HomePage({ usuario, onAbrirModulo }: HomePageProps) {
  const nombre = usuario.nombre_completo || usuario.email;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-sm font-medium text-emerald-300">Bienestar Universitario</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Módulos de Conecta BU
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Hola, {nombre}. Conecta BU está organizado en cinco módulos. Por ahora
          solo está habilitado Desarrollo humano y orientación.
        </p>
        <p className="mt-4 text-sm text-slate-400">{usuario.email}</p>
      </section>

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
    </main>
  );
}
