export type HorarioPisu = {
  id: string;
  deporte_id: string;
  docente_id?: string;
  docente?: { id: string; nombre: string };
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  estado: boolean;
};

export type DeportePisu = {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen?: string | null;
  imagen_url?: string | null;
  cupo_maximo: number;
  cupo_disponible: number;
  categorias_permitidas: string[];
  inscrito: boolean;
  inscripcion_id: string | null;
  horarios: HorarioPisu[];
  estado: boolean;
};

export type InscripcionPisu = {
  id: string;
  estudiante_id: string;
  deporte_id: string;
  fecha_inscripcion: string;
  estado: "Activa" | "Cancelada";
  deporte?: { id: string; nombre: string };
};

export type PerfilPisu = {
  id: string;
  nombre: string;
  correo: string;
  rol: "Administrador" | "Docente" | "Estudiante";
  categoria: string | null;
};

export type UsuarioPisuAdmin = {
  id: string | null;
  auth_usuario_id: string | null;
  nombre: string;
  correo: string;
  rol: PerfilPisu["rol"] | null;
  categoria: string | null;
  estado: boolean;
};

export type ClaseDocente = HorarioPisu & {
  docente_id: string;
  deporte?: { id: string; nombre: string; descripcion?: string | null };
};

export type EstudianteDeClase = {
  inscripcion_id: string;
  estudiante: {
    id: string;
    nombre: string;
    correo: string;
    categoria: string | null;
    rol: string;
    estado: boolean;
  } | null;
};

export type AsistenciaPisu = {
  id: string;
  horario_id: string;
  estudiante_id: string;
  docente_id: string;
  fecha: string;
  presente: boolean;
  fecha_registro: string;
};

export type ResumenPisu = {
  usuarios: number;
  deportes_activos: number;
  inscripciones_activas: number;
  asistencias: number;
  alertas: number;
  horarios_activos: number;
  eventos_activos: number;
};

export type TipoEventoPisu =
  | "Torneo"
  | "Masterclass"
  | "Amistoso"
  | "Jornada de práctica"
  | "Otro"
  | "General";

export type EventoPisu = {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo?: string;
  fecha: string;
  hora_inicio?: string | null;
  hora_fin?: string | null;
  lugar: string;
  cupo_maximo: number;
  fecha_limite_inscripcion?: string | null;
  categorias_permitidas?: string[] | null;
  estado: boolean;
  estado_evento?: "publicado" | "cancelado";
  motivo_cancelacion?: string | null;
  deporte_id?: string | null;
  creado_por_id?: string | null;
  deporte?: { id: string; nombre: string } | null;
  creador?: { id: string; nombre: string } | null;
  fecha_creacion?: string;
  inscritos?: number;
  cupo_disponible?: number;
  cupos_libres?: number;
  inscrito?: boolean;
  inscripcion_id?: string | null;
  abierto?: boolean;
  inscripcion_abierta?: boolean;
  finalizado?: boolean;
};

/** Inscrito a un evento visto por el docente (para la tabla y el CSV). */
export type InscritoEventoDocentePisu = {
  id: string;
  nombre: string;
  documento: string | null;
  correo: string;
  categoria: string | null;
  fecha_inscripcion: string;
};

/** Conflicto de lugar devuelto por el backend (409). */
export type ConflictoEventoPisu = {
  tipo: "evento" | "clase" | "cupo";
  nombre?: string;
  lugar?: string;
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
};

export type InscritoDeportePisu = {
  nombre: string;
  documento: string | null;
  correo: string | null;
  categoria: string | null;
  fecha_inscripcion: string;
  asistencias_total: number;
  asistencias_presentes: number;
  porcentaje_asistencia: number | null;
  inasistencias: number;
};

export type GrupoInscritosDeporte = {
  deporte: { id: string; nombre: string; cupo_maximo: number; estado: boolean };
  total: number;
  inscritos: InscritoDeportePisu[];
};

export type InscritoEventoPisu = {
  id: string;
  fecha_inscripcion: string;
  estudiante?: {
    id: string;
    nombre: string;
    correo: string;
    categoria: string | null;
  };
};

export type AlertaPisu = {
  id: string;
  titulo: string;
  mensaje: string;
  audiencia: "Todos" | "Docentes" | "Estudiantes";
  estudiante_id?: string | null;
  estudiante?: { id: string; nombre: string; correo: string } | null;
  fecha_creacion: string;
};

export type HorarioEstudiantePisu = HorarioPisu & {
  deporte?: { id: string; nombre: string };
  docente?: { id: string; nombre: string };
};

export type AsistenciaEstudiantePisu = {
  id: string;
  fecha: string;
  presente: boolean;
  horario?: {
    id: string;
    deporte_id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    lugar: string;
    deporte?: { id: string; nombre: string };
  };
};

export type ResumenAsistenciaPisu = {
  deporte_id: string;
  deporte: string;
  presentes: number;
  ausentes: number;
  porcentaje: number;
};

export type HorarioAdminPisu = HorarioPisu & {
  docente_id: string;
  deporte?: { id: string; nombre: string };
  docente?: { id: string; nombre: string; correo: string; rol: string };
};

export type DeporteAsignadoDocente = {
  id: string;
  nombre: string;
  tiene_horario: boolean;
};

export type DocentePisu = {
  id: string;
  nombre: string;
  correo: string;
  documento?: string | null;
  especialidad?: string | null;
  rol: PerfilPisu["rol"];
  estado?: boolean;
  /** Deportes asignados directamente por el administrador. */
  deportes?: DeporteAsignadoDocente[];
};

// ============================================================================
// Rol Docente — tipos de la interfaz (módulo Deporte PISU)
// ============================================================================

export type EstadoHorarioDocente = {
  es_hoy: boolean;
  en_curso: boolean;
  finalizada: boolean;
  etiqueta: string;
  detalle: string;
};

export type HorarioResumenDocente = {
  id: string;
  dia_semana: number;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  estado: boolean;
  describe: EstadoHorarioDocente;
};

export type MiDeporteDocente = {
  id: string;
  nombre: string;
  descripcion: string | null;
  imagen_url: string | null;
  cupo_maximo: number;
  categorias_permitidas: string[];
  inscritos: number;
  cupos_disponibles: number;
  porcentaje_asistencia: number | null;
  clases_hoy: number;
  horarios: HorarioResumenDocente[];
};

export type ClaseHoyDocente = {
  horario_id: string;
  deporte: { id: string; nombre: string };
  dia_semana: number;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  fecha: string;
  inscritos: number;
  estado: "Por comenzar" | "En curso" | "Finalizada";
  asistencia_registrada: boolean;
  puede_tomar: boolean;
  motivo_no_puede: string | null;
};

export type EstadoAsistenciaTexto =
  | "Al día"
  | "En riesgo"
  | "Reprobaría"
  | "Sin clases registradas";

export type FilaListaDocente = {
  estudiante_id: string;
  nombre: string;
  documento: string | null;
  correo: string | null;
  categoria: string | null;
  asistencia_id: string | null;
  presente: boolean | null;
  presentes: number;
  faltas: number;
  dictadas: number;
  porcentaje: number;
  estado: EstadoAsistenciaTexto;
};

export type SesionListaDocente = {
  horario: {
    id: string;
    deporte_id: string;
    deporte: string;
    dia_semana: number;
    dia: string;
    hora_inicio: string;
    hora_fin: string;
    lugar: string;
  };
  fecha: string;
  ventana: { abierta: boolean; motivo: string | null; desde: string; hasta: string };
  ignorar_horario: boolean;
  ya_registrada: boolean;
  editable: boolean;
  resumen: { presentes: number; ausentes: number; total: number };
  estudiantes: FilaListaDocente[];
};

export type EstudianteDeporteDocente = {
  estudiante_id: string;
  nombre: string;
  documento: string | null;
  correo: string | null;
  categoria: string | null;
  presentes: number;
  faltas: number;
  dictadas: number;
  porcentaje: number;
  estado: EstadoAsistenciaTexto;
};

export type DetalleAsistenciaDocente = {
  asistencia_id: string;
  estudiante_id: string;
  nombre: string;
  documento: string | null;
  categoria: string | null;
  presente: boolean;
};

export type SesionHistorialDocente = {
  horario_id: string;
  fecha: string;
  fecha_larga: string;
  deporte: { id: string; nombre: string };
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  presentes: number;
  ausentes: number;
  total: number;
  porcentaje: number;
  puede_editar: boolean;
  detalle: DetalleAsistenciaDocente[];
};

export type FilaReporteDocente = {
  estudiante_id: string;
  nombre: string;
  documento: string | null;
  correo: string | null;
  categoria: string | null;
  presentes: number;
  faltas: number;
  dictadas: number;
  porcentaje: number;
  aprobado: boolean;
  estado: EstadoAsistenciaTexto;
};

export type SesionReporteDocente = {
  horario_id: string;
  fecha: string;
  dia: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
};

export type ReporteDocente = {
  deporte: { id: string; nombre: string };
  docente: string;
  periodo: string;
  horarios: Array<{ dia: string; hora_inicio: string; hora_fin: string; lugar: string }>;
  generado: string;
  tipo: "REPORTE FINAL" | "REPORTE PARCIAL";
  semestre_finalizado: boolean;
  minimo: number;
  dictadas: number;
  total_estudiantes: number;
  aprobados: number;
  reprobados: number;
  promedio: number;
  sesiones: SesionReporteDocente[];
  estudiantes: FilaReporteDocente[];
  matriz: Record<string, Record<string, boolean>>;
};
