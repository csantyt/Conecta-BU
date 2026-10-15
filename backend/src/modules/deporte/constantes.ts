export const ROLES_PISU = ["Administrador", "Docente", "Estudiante"] as const;
export const CATEGORIAS_PISU = ["Pregrado", "Postgrado", "Egresado"] as const;
export const ESTADOS_INSCRIPCION_PISU = ["Activa", "Cancelada"] as const;
export const AUDIENCIAS_ALERTA_PISU = ["Todos", "Docentes", "Estudiantes"] as const;
export const UMBRAL_INASISTENCIAS_ALERTA = 3;

/**
 * Tipos de evento que puede crear un docente. Se guardan como etiquetas legibles
 * (ver `EventoDeporte.tipo`) y se muestran tal cual en la interfaz.
 */
export const TIPOS_EVENTO_PISU = [
  "Torneo",
  "Masterclass",
  "Amistoso",
  "Jornada de práctica",
  "Otro",
] as const;

/**
 * Ciclo de vida de un evento del docente.
 * - `publicado`: aparece en el catálogo del estudiante y admite inscripciones.
 * - `cancelado`: se conserva el registro y el motivo, pero desaparece del catálogo.
 * - `finalizado`: la fecha ya pasó (se calcula dinámicamente, no se guarda).
 */
export const ESTADOS_EVENTO_PISU = ["publicado", "cancelado"] as const;

export type RolPisu = (typeof ROLES_PISU)[number];
export type CategoriaPisu = (typeof CATEGORIAS_PISU)[number];
export type EstadoInscripcionPisu = (typeof ESTADOS_INSCRIPCION_PISU)[number];
export type AudienciaAlertaPisu = (typeof AUDIENCIAS_ALERTA_PISU)[number];
export type TipoEventoPisu = (typeof TIPOS_EVENTO_PISU)[number];
export type EstadoEventoPisu = (typeof ESTADOS_EVENTO_PISU)[number];
