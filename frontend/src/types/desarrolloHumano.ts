export type Horario = {
  id: string;
  servicio_id: string;
  profesional: string | null;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  cupo: number;
  activo: boolean;
  cupo_disponible?: number;
};

export type Servicio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  horarios?: Horario[];
};

export type Cita = {
  id: string;
  usuario_id: string;
  servicio_id: string;
  horario_id: string | null;
  fecha_hora: string;
  estado: "AGENDADA" | "CANCELADA" | "ASISTIO" | "NO_ASISTIO";
  motivo_cancelacion: string | null;
  servicio?: Servicio;
  horario?: Horario;
};

export type EventoDH = {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  fecha_limite_inscripcion: string | null;
  cupo_total: number;
  cupo_disponible: number;
  inscrito: boolean;
  activo?: boolean;
};

export type InscripcionEvento = {
  id: string;
  evento_id: string;
  usuario_id: string;
  estado: "INSCRITO" | "CANCELADO";
  asistencia: "ASISTIO" | "NO_ASISTIO" | null;
  fecha_inscripcion: string;
};
