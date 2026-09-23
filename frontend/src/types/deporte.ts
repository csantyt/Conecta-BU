export type HorarioPisu = {
  id: string;
  deporte_id: string;
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
