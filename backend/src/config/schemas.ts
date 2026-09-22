export const SCHEMAS = {
  auth: "auth",
  desarrolloHumano: "desarrollo_humano",
  permanenciaEstudiantil: "permanencia_estudiantil",
  saludIntegral: "salud_integral",
  deporte: "deporte",
  cultura: "cultura",
} as const;

export const ESQUEMAS_MODULOS = [
  SCHEMAS.desarrolloHumano,
  SCHEMAS.permanenciaEstudiantil,
  SCHEMAS.saludIntegral,
  SCHEMAS.deporte,
  SCHEMAS.cultura,
] as const;
