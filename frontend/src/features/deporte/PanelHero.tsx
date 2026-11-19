/**
 * Cabecera de bienvenida compartida por los tres roles del módulo Deporte PISU.
 *
 * ¿Para qué sirve?
 * Reutiliza la plantilla visual que tenía la pantalla de inicio del estudiante
 * (saludo, fecha, rol y accesos) para que administradores y docentes vean el
 * módulo con el mismo estilo.
 */

import type { ReactNode } from "react";
import { fechaLargaHoy, saludoActual } from "./estudianteUI";
import type { RolPisu } from "./rutas";
import { Avatar } from "./ui";

const ETIQUETA_ROL: Record<RolPisu, string> = {
  Administrador: "Administrador PISU",
  Docente: "Docente PISU",
  Estudiante: "Estudiante PISU",
};

type Props = {
  nombre: string;
  rol: RolPisu;
  descripcion: string;
  chips?: ReactNode;
  acciones?: ReactNode;
};

export default function PanelHero({ nombre, rol, descripcion, chips, acciones }: Props) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-uni-marino via-uni-noche to-uni-noche p-5 sm:p-7">
      <div
        aria-hidden="true"
        className="absolute -right-6 -top-10 h-52 w-52 rounded-full bg-uni-cian/20 blur-3xl sm:h-64 sm:w-64"
      />
      <img
        src="/ilustraciones/estudiante-hero.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 hidden h-52 w-auto opacity-90 sm:block lg:h-64"
      />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-xl">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-uni-cian">
            {fechaLargaHoy()}
          </p>
          <h1 className="mt-2 text-2xl font-black leading-tight text-white sm:text-4xl">
            {saludoActual()}, <span className="text-uni-amarillo">{nombre.split(" ")[0]}</span>
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">{descripcion}</p>
          {chips ? <div className="mt-4 flex flex-wrap gap-2">{chips}</div> : null}
          {acciones ? <div className="mt-4 flex flex-wrap gap-2">{acciones}</div> : null}
        </div>
        <div className="hidden items-center gap-3 sm:flex lg:mr-40">
          <Avatar nombre={nombre} size="lg" />
          <div className="text-right">
            <p className="max-w-[12rem] truncate text-sm font-bold text-white">{nombre}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-uni-cian">
              {ETIQUETA_ROL[rol]}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
