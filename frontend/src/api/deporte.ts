import { api } from "./http";
import type {
  AlertaPisu,
  AsistenciaPisu,
  ClaseDocente,
  DeportePisu,
  DocentePisu,
  EstudianteDeClase,
  EventoPisu,
  HorarioAdminPisu,
  InscripcionPisu,
  PerfilPisu,
  ResumenPisu,
  UsuarioPisuAdmin,
} from "../types/deporte";

export async function obtenerCatalogoDeportes(): Promise<{
  deportes: DeportePisu[];
  perfil: PerfilPisu;
}> {
  const { data } = await api.get<{ deportes: DeportePisu[]; perfil: PerfilPisu }>(
    "/deportes",
  );
  return data;
}

export async function obtenerEventosPisu(): Promise<EventoPisu[]> {
  const { data } = await api.get<{ eventos: EventoPisu[] }>("/deportes/eventos");
  return data.eventos;
}

export async function obtenerAlertasPisu(): Promise<AlertaPisu[]> {
  const { data } = await api.get<{ alertas: AlertaPisu[] }>("/deportes/alertas");
  return data.alertas;
}

export async function obtenerInscripcionesPisu(): Promise<InscripcionPisu[]> {
  const { data } = await api.get<{ inscripciones: InscripcionPisu[] }>(
    "/estudiante/inscripciones",
  );
  return data.inscripciones;
}

export async function autoinscribirseDeporte(deporteId: string): Promise<void> {
  await api.post("/estudiante/inscripciones", { deporte_id: deporteId });
}

export async function cancelarInscripcionPisu(id: string): Promise<void> {
  await api.patch(`/estudiante/inscripciones/${id}/cancelar`);
}

export async function obtenerMisClasesDocente(): Promise<ClaseDocente[]> {
  const { data } = await api.get<{ clases: ClaseDocente[] }>("/docente/mis-clases");
  return data.clases;
}

export async function obtenerEstudiantesDeClase(
  horarioId: string,
): Promise<{ horario: ClaseDocente; estudiantes: EstudianteDeClase[] }> {
  const { data } = await api.get<{
    horario: ClaseDocente;
    estudiantes: EstudianteDeClase[];
  }>(`/docente/clases/${horarioId}/estudiantes`);
  return data;
}

export async function obtenerAsistenciasDocente(
  fecha?: string,
): Promise<AsistenciaPisu[]> {
  const { data } = await api.get<{ asistencias: AsistenciaPisu[] }>(
    "/docente/asistencias",
    { params: fecha ? { fecha } : undefined },
  );
  return data.asistencias;
}

export async function guardarAsistenciaDocente(params: {
  horarioId: string;
  fecha: string;
  estudiantes: Array<{ estudianteId: string; presente: boolean }>;
}): Promise<AsistenciaPisu[]> {
  const { data } = await api.post<{ asistencias: AsistenciaPisu[] }>(
    "/docente/asistencia",
    params,
  );
  return data.asistencias;
}

export async function editarAsistenciaDocente(
  asistenciaId: string,
  presente: boolean,
): Promise<AsistenciaPisu> {
  const { data } = await api.put<{ asistencia: AsistenciaPisu }>(
    `/docente/asistencia/${asistenciaId}`,
    { presente },
  );
  return data.asistencia;
}

export async function obtenerUsuariosPisuAdmin(): Promise<UsuarioPisuAdmin[]> {
  const { data } = await api.get<{ usuarios: UsuarioPisuAdmin[] }>(
    "/admin/usuarios",
  );
  return data.usuarios;
}

export async function asignarRolPisuAdmin(params: {
  id: string | null;
  authUsuarioId: string | null;
  rol: PerfilPisu["rol"];
  categoria?: string | null;
}): Promise<void> {
  const destino = params.id ?? "nuevo";
  await api.patch(`/admin/usuarios/${destino}`, {
    rol: params.rol,
    categoria: params.categoria ?? null,
    ...(params.authUsuarioId ? { auth_usuario_id: params.authUsuarioId } : {}),
  });
}

export async function obtenerResumenPisu(): Promise<ResumenPisu> {
  const { data } = await api.get<{ resumen: ResumenPisu }>("/admin/resumen");
  return data.resumen;
}

export async function obtenerDeportesAdmin(): Promise<
  Array<{
    id: string;
    nombre: string;
    descripcion: string | null;
    cupo_maximo: number;
    categorias_permitidas: string[];
    estado: boolean;
  }>
> {
  const { data } = await api.get<{
    deportes: Array<{
      id: string;
      nombre: string;
      descripcion: string | null;
      cupo_maximo: number;
      categorias_permitidas: string[];
      estado: boolean;
    }>;
  }>("/admin/deportes");
  return data.deportes;
}

export async function crearDeporteAdmin(payload: {
  nombre: string;
  descripcion?: string;
  cupo_maximo: number;
  categorias_permitidas?: string[];
}): Promise<void> {
  await api.post("/admin/deportes", payload);
}

export async function actualizarDeporteAdmin(
  id: string,
  payload: Partial<{
    nombre: string;
    descripcion: string | null;
    cupo_maximo: number;
    categorias_permitidas: string[];
    estado: boolean;
  }>,
): Promise<void> {
  await api.patch(`/admin/deportes/${id}`, payload);
}

export async function obtenerDocentesPisu(): Promise<DocentePisu[]> {
  const { data } = await api.get<{ docentes: DocentePisu[] }>("/admin/docentes");
  return data.docentes;
}

export async function obtenerHorariosAdmin(): Promise<HorarioAdminPisu[]> {
  const { data } = await api.get<{ horarios: HorarioAdminPisu[] }>(
    "/admin/horarios",
  );
  return data.horarios;
}

export async function crearHorarioAdmin(payload: {
  deporte_id: string;
  docente_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
}): Promise<void> {
  await api.post("/admin/horarios", payload);
}

export async function actualizarHorarioAdmin(
  id: string,
  payload: Partial<{
    deporte_id: string;
    docente_id: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    lugar: string;
    estado: boolean;
  }>,
): Promise<void> {
  await api.patch(`/admin/horarios/${id}`, payload);
}

export async function obtenerEventosAdmin(): Promise<EventoPisu[]> {
  const { data } = await api.get<{ eventos: EventoPisu[] }>("/admin/eventos");
  return data.eventos;
}

export async function crearEventoAdmin(payload: {
  nombre: string;
  descripcion?: string;
  fecha: string;
  lugar: string;
  cupo_maximo: number;
}): Promise<void> {
  await api.post("/admin/eventos", payload);
}

export async function actualizarEventoAdmin(
  id: string,
  payload: Partial<{
    nombre: string;
    descripcion: string | null;
    fecha: string;
    lugar: string;
    cupo_maximo: number;
    estado: boolean;
  }>,
): Promise<void> {
  await api.patch(`/admin/eventos/${id}`, payload);
}

export async function obtenerAlertasAdmin(): Promise<AlertaPisu[]> {
  const { data } = await api.get<{ alertas: AlertaPisu[] }>("/admin/alertas");
  return data.alertas;
}

export async function crearAlertaAdmin(payload: {
  titulo: string;
  mensaje: string;
  audiencia: AlertaPisu["audiencia"];
}): Promise<void> {
  await api.post("/admin/alertas", payload);
}

export async function eliminarAlertaAdmin(id: string): Promise<void> {
  await api.delete(`/admin/alertas/${id}`);
}
