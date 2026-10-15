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

/* Copiar el logo a la carpeta /public del proyecto con este nombre */
const LOGO_URL = "/logo-uniautonoma.png";

export default function HomePage({ usuario, onAbrirModulo }: HomePageProps) {
  const nombre = usuario.nombre_completo || usuario.email;
  const esAdmin = usuario.rol === "ADMINISTRADOR";

  const activos = MODULOS.filter((modulo) => modulo.activo);

  return (
    <>
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

      <PieDePagina activos={activos} onAbrirModulo={onAbrirModulo} />
    </>
  );
}

const TRAMOS_BANDA = [
  "bg-gradient-to-r from-[#ffc20e] to-[#fdb515]",
  "bg-gradient-to-r from-[#fdb515] to-[#f9a11b]",
  "bg-gradient-to-r from-[#f9a11b] to-[#f59312]",
  "bg-gradient-to-r from-[#f59312] to-[#f18607]",
  "bg-gradient-to-r from-[#f18607] to-[#ee7d00]",
];

/* ───────────── PIE DE PÁGINA (nuevo) ───────────── */

type PieDePaginaProps = {
  activos: typeof MODULOS;
  onAbrirModulo: (id: ModuloId) => void;
};

function PieDePagina({ activos, onAbrirModulo }: PieDePaginaProps) {
  const anio = new Date().getFullYear();

  return (
    <footer className="border-t-4 border-uni-mandarina bg-uni-noche text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_0.8fr] lg:gap-0">
        {/* Institución */}
        <div>
          <div className="flex h-40 w-64 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-xl ring-4 ring-white/10">
            <img
              src={LOGO_URL}
              alt="Logo Uniautónoma del Cauca"
              className="h-full w-full object-contain p-2"
            />
          </div>
          <div className="mt-6 h-1 w-14 rounded-full bg-uni-mandarina" />
          <h3 className="mt-4 text-lg font-extrabold leading-snug text-white">
            Corporación Universitaria
            <br />
            Autónoma del Cauca
          </h3>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
            Institución de educación superior con sede en Popayán, Cauca,
            comprometida con la formación integral de sus estudiantes. Desde
            Bienestar Universitario acompañamos el desarrollo humano, el
            deporte, la salud y la cultura de toda la comunidad universitaria.
          </p>
        </div>

        {/* Contacto */}
        <div className="lg:border-l lg:border-white/10 lg:px-10">
          <h3 className="border-b border-white/10 pb-3 text-sm font-black uppercase tracking-[0.2em] text-uni-cian">
            Contacto
          </h3>
          <ul className="mt-6 space-y-5 text-sm">
            <FilaContacto
              icono={
                <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
              }
              titulo="Dirección"
              valor="Calle 5 # 3-85, Popayán, Cauca"
            />
            <FilaContacto
              icono={
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
              }
              titulo="Teléfono"
              valor="(602) 820 9900"
            />
            <FilaContacto
              icono={
                <>
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </>
              }
              titulo="Correo"
              valor="bienestar@uniautonoma.edu.co"
              href="mailto:bienestar@uniautonoma.edu.co"
            />
            <FilaContacto
              icono={
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                </>
              }
              titulo="Sitio web"
              valor="www.uniautonoma.edu.co"
              href="https://www.uniautonoma.edu.co"
            />
          </ul>
        </div>

        {/* Enlaces */}
        <div className="lg:border-l lg:border-white/10 lg:pl-10">
          <h3 className="border-b border-white/10 pb-3 text-sm font-black uppercase tracking-[0.2em] text-uni-cian">
            Bienestar
          </h3>
          <ul className="mt-6 space-y-4 text-sm">
            {activos.map((modulo) => (
              <li key={modulo.id}>
                <button
                  type="button"
                  onClick={() => onAbrirModulo(modulo.id)}
                  className="text-left font-semibold text-slate-300 transition hover:translate-x-1 hover:text-uni-mandarina"
                >
                  {modulo.titulo}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:px-6">
          <p>
            © {anio} Corporación Universitaria Autónoma del Cauca. Todos los
            derechos reservados.
          </p>
          <p>Conecta BU · Bienestar Universitario</p>
        </div>
      </div>
    </footer>
  );
}

function FilaContacto({
  icono,
  titulo,
  valor,
  href,
}: {
  icono: React.ReactNode;
  titulo: string;
  valor: string;
  href?: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-uni-marino/60 text-uni-cian">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {icono}
        </svg>
      </span>
      <span>
        <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {titulo}
        </span>
        {href ? (
          <a
            href={href}
            target={href.startsWith("http") ? "_blank" : undefined}
            rel="noreferrer"
            className="font-semibold text-white transition hover:text-uni-cian"
          >
            {valor}
          </a>
        ) : (
          <span className="font-semibold text-white">{valor}</span>
        )}
      </span>
    </li>
  );
}

/* ───────────── CÓDIGO ORIGINAL (sin cambios) ───────────── */

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