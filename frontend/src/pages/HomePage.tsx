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

  const activos = MODULOS.filter((modulo) => modulo.activo);

  return (
    <main className="pb-28">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-16">
        <span className="inline-block -rotate-3 rounded-md bg-uni-cian px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-uni-noche shadow-lg">
          Bienestar Universitario
        </span>
        <h1 className="mt-5 text-5xl font-black uppercase leading-[0.9] tracking-tight sm:text-7xl">
          Conecta
          <span className="text-uni-cian"> BU</span>
        </h1>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-white/80 sm:text-sm">
          Corporación Universitaria Autónoma del Cauca
        </p>
        <p className="mt-6 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
          Hola, <span className="font-bold text-white">{nombre}</span>. Están
          habilitados Desarrollo humano y orientación y Deporte. Los demás
          módulos aparecen para que el catálogo de Bienestar se mantenga visible.
        </p>

        <nav className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm font-extrabold uppercase tracking-wider">
          {activos.map((modulo, indice) => (
            <button
              key={modulo.id}
              type="button"
              onClick={() => onAbrirModulo(modulo.id)}
              className={`transition hover:translate-x-1 ${
                indice === 0 ? "text-uni-mandarina" : "text-white hover:text-uni-cian"
              }`}
            >
              → {modulo.titulo}
            </button>
          ))}
        </nav>
      </section>

      <section className="sm:[clip-path:polygon(0_7%,100%_0,100%_100%,0_100%)] lg:[clip-path:polygon(0_14%,100%_0,100%_100%,0_100%)]">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5">
          {MODULOS.map((modulo, indice) => {
            const tramo = TRAMOS_BANDA[indice % TRAMOS_BANDA.length];
            const contenido = (
              <>
                <IconoModulo id={modulo.id} />
                <h2 className="mt-4 text-base font-black uppercase leading-tight text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] sm:text-lg">
                  {modulo.titulo}
                </h2>
                <p className="mt-2 text-xs font-semibold leading-5 text-uni-noche/80">
                  {modulo.descripcion}
                </p>
                {modulo.activo ? (
                  <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-uni-noche px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-white transition group-hover:bg-uni-marino">
                    Entrar <span className="text-uni-cian">→</span>
                  </span>
                ) : (
                  <span className="mt-5 inline-block -rotate-2 rounded bg-uni-cian px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-uni-noche">
                    Muy pronto
                  </span>
                )}
              </>
            );
            const clases = `group flex flex-col items-start px-6 py-8 text-left sm:min-h-64 sm:pt-16 lg:min-h-80 lg:pt-24 ${tramo}`;

            return modulo.activo ? (
              <button
                key={modulo.id}
                type="button"
                onClick={() => onAbrirModulo(modulo.id)}
                className={`${clases} transition hover:brightness-105`}
              >
                {contenido}
              </button>
            ) : (
              <article key={modulo.id} className={clases}>
                {contenido}
              </article>
            );
          })}
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <EventosSugeridosIA onIrAEventos={() => onAbrirModulo("desarrollo-humano")} />
        {esAdmin ? <PanelAdministradores sesion={usuario} /> : null}
      </div>
    </main>
  );
}

const TRAMOS_BANDA = [
  "bg-gradient-to-r from-[#ffc20e] to-[#fdb515]",
  "bg-gradient-to-r from-[#fdb515] to-[#f9a11b]",
  "bg-gradient-to-r from-[#f9a11b] to-[#f59312]",
  "bg-gradient-to-r from-[#f59312] to-[#f18607]",
  "bg-gradient-to-r from-[#f18607] to-[#ee7d00]",
];

function IconoModulo({ id }: { id: ModuloId }) {
  const comun = {
    width: 44,
    height: 44,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]",
    "aria-hidden": true,
  };

  switch (id) {
    case "desarrollo-humano":
      return (
        <svg {...comun}>
          <circle cx="12" cy="7" r="3.2" />
          <path d="M5.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5" />
          <path d="M12 13.5v2.5M9.5 17.5h5" />
        </svg>
      );
    case "deporte":
      return (
        <svg {...comun}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m12 7.5 3.3 2.4-1.3 3.9h-4l-1.3-3.9z" />
          <path d="M12 3.5v4M20.1 9.3l-4.8.6M16.9 19.2 14 13.8M7.1 19.2l2.9-5.4M3.9 9.3l4.8.6" />
        </svg>
      );
    case "permanencia-estudiantil":
      return (
        <svg {...comun}>
          <path d="m2.5 9 9.5-4.5L21.5 9 12 13.5z" />
          <path d="M6.5 11v4.5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3V11" />
          <path d="M21.5 9v5" />
        </svg>
      );
    case "salud-integral":
      return (
        <svg {...comun}>
          <path d="M12 20s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.6-7.5 10-7.5 10z" />
          <path d="M8 12.5h2l1.2-2.5 1.6 4 1.2-1.5H16" />
        </svg>
      );
    case "cultura":
      return (
        <svg {...comun}>
          <path d="M9 18V6l11-2v12" />
          <circle cx="6.5" cy="18" r="2.5" />
          <circle cx="17.5" cy="16" r="2.5" />
        </svg>
      );
  }
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
