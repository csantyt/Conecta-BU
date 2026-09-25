export type HorarioPisu = {
  id: string;
  deporte_id: string;
  docente_id?: string;
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

export type EventoPisu = {
  id: string;
  nombre: string;
  descripcion: string | null;
  fecha: string;
  lugar: string;
  cupo_maximo: number;
  estado: boolean;
  fecha_creacion?: string;
};

export type AlertaPisu = {
  id: string;
  titulo: string;
  mensaje: string;
  audiencia: "Todos" | "Docentes" | "Estudiantes";
  fecha_creacion: string;
};

export type HorarioAdminPisu = HorarioPisu & {
  docente_id: string;
  deporte?: { id: string; nombre: string };
  docente?: { id: string; nombre: string; correo: string; rol: string };
};

export type DocentePisu = {
  id: string;
  nombre: string;
  correo: string;
  rol: PerfilPisu["rol"];
};
