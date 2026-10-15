/**
 * Configuración de menús del módulo Deporte PISU.
 *
 * ¿Para qué sirve?
 * Centraliza el menú lateral de cada rol en un solo archivo (en lugar de repartir
 * condicionales por los componentes). `DeporteShell` solo lee esta configuración.
 *
 * ¿Cómo se relaciona con los demás?
 * `DeporteShell.tsx` elige el grupo según el rol PISU y `DeportePage.tsx` usa las
 * mismas `key` para decidir qué pantalla mostrar.
 */

export type MenuItem = { key: string; label: string; icon: string };
export type MenuGroup = { title: string; items: MenuItem[] };

export const MENU_ADMINISTRADOR: MenuGroup[] = [
  {
    title: "GENERAL",
    items: [
      { key: "panel", label: "Panel", icon: "panel" },
      { key: "verificar", label: "Verificar contenido", icon: "verificar" },
    ],
  },
  {
    title: "GESTIÓN DEPORTIVA",
    items: [
      { key: "deportes", label: "Deportes", icon: "deportes" },
      { key: "horarios", label: "Horarios", icon: "horarios" },
      { key: "eventos", label: "Eventos", icon: "eventos" },
      { key: "inscritos", label: "Inscritos por deporte", icon: "inscritos" },
    ],
  },
  {
    title: "PERSONAS",
    items: [
      { key: "docentes", label: "Docentes", icon: "personas" },
      { key: "estudiantes", label: "Estudiantes", icon: "personas" },
      { key: "administradores", label: "Administradores", icon: "personas" },
    ],
  },
  {
    title: "COMUNICACIÓN",
    items: [{ key: "comunicados", label: "Comunicados", icon: "comunicados" }],
  },
];

export const MENU_DOCENTE: MenuGroup[] = [
  {
    title: "GENERAL",
    items: [
      { key: "mis-deportes", label: "Mis deportes", icon: "deportes" },
      { key: "hoy", label: "Clases de hoy", icon: "horarios" },
    ],
  },
  {
    title: "EVENTOS",
    items: [{ key: "eventos", label: "Mis eventos", icon: "eventos" }],
  },
  {
    title: "ASISTENCIA",
    items: [
      { key: "lista", label: "Llamar a lista", icon: "verificar" },
      { key: "historial", label: "Historial de asistencia", icon: "eventos" },
      { key: "estudiantes", label: "Mis estudiantes", icon: "inscritos" },
    ],
  },
  {
    title: "CIERRE DEL CURSO",
    items: [{ key: "reporte", label: "Reporte final", icon: "panel" }],
  },
  {
    title: "COMUNICACIÓN",
    items: [{ key: "comunicados", label: "Comunicados", icon: "comunicados" }],
  },
];

export const MENU_ESTUDIANTE: MenuGroup[] = [
  {
    title: "GENERAL",
    items: [
      { key: "catalogo", label: "Catálogo", icon: "deportes" },
      { key: "eventos", label: "Eventos", icon: "eventos" },
      { key: "mis-deportes", label: "Mis deportes", icon: "inscritos" },
      { key: "horario", label: "Mi horario", icon: "horarios" },
    ],
  },
];

export function menuPorRol(rolPisu: string): MenuGroup[] {
  if (rolPisu === "Administrador") return MENU_ADMINISTRADOR;
  if (rolPisu === "Docente") return MENU_DOCENTE;
  return MENU_ESTUDIANTE;
}

/** Devuelve la etiqueta legible de una `key` (soporta `key:param`). */
export function etiquetaDeVista(rolPisu: string, view: string): string {
  const base = view.split(":")[0] ?? view;
  for (const grupo of menuPorRol(rolPisu)) {
    const item = grupo.items.find((i) => i.key === base);
    if (item) return item.label;
  }
  return view;
}
