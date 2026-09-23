export const ROLES_PISU = ["Administrador", "Docente", "Estudiante"] as const;
export const CATEGORIAS_PISU = ["Pregrado", "Postgrado", "Egresado"] as const;
export const ESTADOS_INSCRIPCION_PISU = ["Activa", "Cancelada"] as const;
export const AUDIENCIAS_ALERTA_PISU = ["Todos", "Docentes", "Estudiantes"] as const;

export type RolPisu = (typeof ROLES_PISU)[number];
export type CategoriaPisu = (typeof CATEGORIAS_PISU)[number];
export type EstadoInscripcionPisu = (typeof ESTADOS_INSCRIPCION_PISU)[number];
export type AudienciaAlertaPisu = (typeof AUDIENCIAS_ALERTA_PISU)[number];
