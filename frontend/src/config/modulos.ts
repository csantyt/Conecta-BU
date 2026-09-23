export const MODULOS = [
  {
    id: "desarrollo-humano",
    titulo: "Desarrollo humano y orientación",
    descripcion:
      "Acompañamiento psicológico, orientación vocacional y talleres de crecimiento personal.",
    activo: true,
  },
  {
    id: "deporte",
    titulo: "Deporte",
    descripcion:
      "Autoinscripción a disciplinas PISU, horarios, cupos y práctica formativa.",
    activo: true,
  },
  {
    id: "permanencia-estudiantil",
    titulo: "Permanencia estudiantil",
    descripcion:
      "Seguimiento, acompañamiento y estrategias para la permanencia en la vida universitaria.",
    activo: false,
  },
  {
    id: "salud-integral",
    titulo: "Salud integral",
    descripcion:
      "Promoción, prevención y atención en salud para la comunidad universitaria.",
    activo: false,
  },
  {
    id: "cultura",
    titulo: "Cultura",
    descripcion:
      "Expresión artística, cultura institucional y espacios de participación.",
    activo: false,
  },
] as const;

export type ModuloId = (typeof MODULOS)[number]["id"];
