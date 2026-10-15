/**
 * Rutas del módulo Deporte PISU (frontend).
 *
 * ¿Para qué sirve?
 * El módulo no usa react-router (no se instalan librerías). La navegación es por
 * estado, pero se refleja en el hash de la URL con el formato:
 *
 *     #/deportes/<rol>/<base>[/<param1>[/<param2>]]
 *
 * p. ej. `#/deportes/docente/lista/<horarioId>/<fecha>` o `#/deportes/admin/panel`.
 * Así, al recargar (F5) la app restaura la misma pantalla y los enlaces "Volver"
 * son predecibles.
 *
 * ¿Cómo se relaciona con los demás?
 * `menus.ts` define las `key`; `DeporteShell` pinta el menú y `DeportePage` decide
 * qué pantalla mostrar usando estas mismas claves. Centralizar aquí evita cadenas
 * sueltas por todo el código.
 */

export type RolPisu = "Administrador" | "Docente" | "Estudiante";

/** Claves base de cada pantalla (sin parámetros). */
export const RUTAS = {
  admin: {
    panel: "panel",
    verificar: "verificar",
    deportes: "deportes",
    horarios: "horarios",
    eventos: "eventos",
    inscritos: "inscritos",
    docentes: "docentes",
    estudiantes: "estudiantes",
    administradores: "administradores",
    comunicados: "comunicados",
  },
  docente: {
    misDeportes: "mis-deportes",
    hoy: "hoy",
    lista: "lista",
    historial: "historial",
    estudiantes: "estudiantes",
    reporte: "reporte",
    comunicados: "comunicados",
    eventos: "eventos",
  },
  estudiante: {
    catalogo: "catalogo",
    eventos: "eventos",
    misDeportes: "mis-deportes",
    horario: "horario",
  },
} as const;

export function slugDeRol(rol: RolPisu): "admin" | "docente" | "estudiante" {
  if (rol === "Administrador") return "admin";
  if (rol === "Docente") return "docente";
  return "estudiante";
}

export function rolDeSlug(slug: string): RolPisu | null {
  if (slug === "admin") return "Administrador";
  if (slug === "docente") return "Docente";
  if (slug === "estudiante") return "Estudiante";
  return null;
}

const VISTAS_POR_ROL: Record<RolPisu, readonly string[]> = {
  Administrador: Object.values(RUTAS.admin),
  Docente: Object.values(RUTAS.docente),
  Estudiante: Object.values(RUTAS.estudiante),
};

/** Primera pantalla que se muestra al entrar al módulo con ese rol. */
export function homeDeRol(rol: RolPisu): string {
  if (rol === "Administrador") return RUTAS.admin.panel;
  if (rol === "Docente") return RUTAS.docente.misDeportes;
  return RUTAS.estudiante.catalogo;
}

/** Divide una vista interna (`base:param1:param2`) en base y parámetros. */
export function parseVista(view: string): { base: string; params: string[] } {
  const [base = "", ...params] = view.split(":");
  return { base, params };
}

/** Construye la vista interna a partir de la base y sus parámetros. */
export function construirVista(base: string, ...params: Array<string | undefined>): string {
  const limpios = params.filter((p): p is string => typeof p === "string" && p.length > 0);
  return [base, ...limpios].join(":");
}

/** ¿La vista pertenece al rol? (evita que una URL manipulada muestre otra cosa). */
export function vistaValida(rol: RolPisu, view: string): boolean {
  const { base } = parseVista(view);
  return VISTAS_POR_ROL[rol].includes(base);
}

/** Hash de la URL para una vista concreta. */
export function hashDeVista(rol: RolPisu, view: string): string {
  const { base, params } = parseVista(view);
  const partes = ["deportes", slugDeRol(rol), base, ...params];
  return `#/${partes.join("/")}`;
}

/** Lee el hash actual y devuelve rol + vista, o `null` si no es del módulo. */
export function vistaDeHash(hash: string): { rol: RolPisu; view: string } | null {
  const limpio = hash.replace(/^#/, "").replace(/^\/+/, "");
  const partes = limpio.split("/");
  if (partes[0] !== "deportes") return null;
  const rol = rolDeSlug(partes[1] ?? "");
  const base = partes[2];
  if (!rol || !base) return null;
  const params = partes.slice(3).filter((p) => p.length > 0);
  return { rol, view: [base, ...params].join(":") };
}
