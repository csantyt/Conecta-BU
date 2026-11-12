/**
 * Piezas visuales propias del rol Estudiante (módulo Deporte PISU).
 *
 * ¿Para qué sirve?
 * Reúne portadas de deporte, anillos de progreso e insignias para que las
 * pantallas del estudiante compartan la misma estética sin duplicar código.
 * Las portadas son locales (public/covers) para evitar dependencias externas.
 */

import type { ReactNode } from "react";
import { Icon, SportIcon, type NombreIcono } from "./ui";

const PORTADAS: Array<{ claves: string[]; archivo: string; gradiente: string }> = [
  {
    claves: ["futbol", "soccer"],
    archivo: "/covers/futbol.jpg",
    gradiente: "from-emerald-500/70 via-emerald-900/30",
  },
  {
    claves: ["baloncesto", "basket"],
    archivo: "/covers/baloncesto.jpg",
    gradiente: "from-orange-500/70 via-orange-900/30",
  },
  {
    claves: ["voleibol", "voley"],
    archivo: "/covers/voleibol.jpg",
    gradiente: "from-sky-500/70 via-sky-900/30",
  },
  {
    claves: ["atletismo", "pista", "running"],
    archivo: "/covers/atletismo.jpg",
    gradiente: "from-amber-500/70 via-amber-900/30",
  },
  {
    claves: ["natacion", "swim"],
    archivo: "/covers/natacion.jpg",
    gradiente: "from-cyan-500/70 via-cyan-900/30",
  },
  {
    claves: ["danza", "baile", "cultura"],
    archivo: "/covers/danza.jpg",
    gradiente: "from-fuchsia-500/70 via-purple-900/30",
  },
  {
    claves: [],
    archivo: "/covers/bienestar.jpg",
    gradiente: "from-uni-azul/70 via-uni-noche/60",
  },
];

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Devuelve la portada local y el degradado de respaldo para un deporte. */
export function portadaDeporte(nombre: string): { src: string; gradiente: string } {
  const clave = normalizar(nombre);
  const encontrada =
    PORTADAS.find((item) => item.claves.some((c) => clave.includes(c))) ??
    PORTADAS[PORTADAS.length - 1];
  return { src: encontrada.archivo, gradiente: encontrada.gradiente };
}

/**
 * Portada de una disciplina. Se muestra la imagen remota si el servidor la
 * entrega; si falla, queda el degradado con el icono (sin romper el diseño).
 */
export function CoverDeporte({
  nombre,
  imagen,
  className = "h-36",
  children,
}: {
  nombre: string;
  imagen?: string | null;
  className?: string;
  children?: ReactNode;
}) {
  const portada = portadaDeporte(nombre);
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${portada.gradiente} to-uni-noche ${className}`}
    >
      <img
        src={imagen || portada.src}
        alt={`Portada de ${nombre}`}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-uni-noche via-uni-noche/30 to-transparent"
      />
      <span className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl bg-uni-noche/70 text-uni-amarillo ring-1 ring-white/20 backdrop-blur">
        <SportIcon nombre={nombre} className="h-6 w-6" />
      </span>
      {children}
    </div>
  );
}

/** Anillo de progreso SVG (asistencia, perfil, cupos). */
export function AnilloProgreso({
  valor,
  etiqueta,
  detalle,
  tamano = 112,
}: {
  valor: number;
  etiqueta: string;
  detalle?: string;
  tamano?: number;
}) {
  const seguro = Math.min(100, Math.max(0, valor));
  const radio = 46;
  const perimetro = 2 * Math.PI * radio;
  const color =
    seguro >= 80 ? "#34d399" : seguro >= 60 ? "#fbbf24" : seguro > 0 ? "#fb7185" : "#64748b";
  return (
    <div
      className="relative inline-flex shrink-0 flex-col items-center justify-center"
      style={{ width: tamano, height: tamano }}
    >
      <svg
        viewBox="0 0 112 112"
        className="absolute inset-0 h-full w-full -rotate-90"
        role="img"
        aria-label={`${etiqueta}: ${Math.round(seguro)}%`}
      >
        <circle cx="56" cy="56" r={radio} fill="none" stroke="rgb(255 255 255 / 0.1)" strokeWidth="8" />
        <circle
          cx="56"
          cy="56"
          r={radio}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={perimetro}
          strokeDashoffset={perimetro - (perimetro * seguro) / 100}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <span className="text-xl font-black tabular-nums text-white">{Math.round(seguro)}%</span>
      <span className="mt-0.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {etiqueta}
      </span>
      {detalle ? (
        <span className="mt-0.5 text-center text-[10px] text-slate-400">{detalle}</span>
      ) : null}
    </div>
  );
}

/** Insignia de logro (gamificación ligera). */
export function Logro({
  icono,
  titulo,
  descripcion,
  desbloqueado,
}: {
  icono: NombreIcono;
  titulo: string;
  descripcion: string;
  desbloqueado: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 ${
        desbloqueado
          ? "border-uni-amarillo/40 bg-gradient-to-br from-uni-amarillo/15 to-uni-mandarina/5 hover:-translate-y-0.5 hover:shadow-lg"
          : "border-white/10 bg-white/[0.03] opacity-70"
      }`}
      title={desbloqueado ? "Logro desbloqueado" : "Sigue participando para desbloquearlo"}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            desbloqueado
              ? "bg-uni-amarillo text-uni-noche shadow-[0_0_24px_-6px_rgb(255_194_14_/0.8)]"
              : "bg-white/10 text-slate-500"
          }`}
        >
          <Icon nombre={icono} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className={`text-sm font-bold ${desbloqueado ? "text-white" : "text-slate-400"}`}>
            {titulo}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-slate-400">{descripcion}</p>
        </div>
      </div>
      <span
        aria-hidden="true"
        className={`absolute right-3 top-3 text-[10px] font-black uppercase tracking-wider ${
          desbloqueado ? "text-uni-amarillo" : "text-slate-600"
        }`}
      >
        {desbloqueado ? "Listo" : "Bloqueado"}
      </span>
    </div>
  );
}

/** Saludo según la hora del día (para el dashboard). */
export function saludoActual(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Buenos días";
  if (hora < 18) return "Buenas tardes";
  return "Buenas noches";
}

/** Fecha larga en español, p. ej. "miércoles, 12 de noviembre". */
export function fechaLargaHoy(): string {
  return new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
