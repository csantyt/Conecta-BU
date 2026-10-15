import { api } from "./http";
import type {
  AlertaPisu,
  AsistenciaEstudiantePisu,
  AsistenciaPisu,
  ClaseDocente,
  DeportePisu,
  DocentePisu,
  EstudianteDeClase,
  EventoPisu,
  HorarioAdminPisu,
  HorarioEstudiantePisu,
  InscripcionPisu,
  InscritoEventoPisu,
  PerfilPisu,
  ResumenAsistenciaPisu,
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

export async function inscribirseEventoPisu(eventoId: string): Promise<void> {
  await api.post(`/estudiante/eventos/${eventoId}/inscripcion`);
}

export async function cancelarInscripcionEventoPisu(eventoId: string): Promise<void> {
  await api.delete(`/estudiante/eventos/${eventoId}/inscripcion`);
}

export async function obtenerMisHorariosPisu(): Promise<HorarioEstudiantePisu[]> {
  const { data } = await api.get<{ horarios: HorarioEstudiantePisu[] }>(
    "/estudiante/horarios",
  );
  return data.horarios;
}

export async function obtenerMisAsistenciasPisu(): Promise<{
  asistencias: AsistenciaEstudiantePisu[];
  resumen: ResumenAsistenciaPisu[];
}> {
  const { data } = await api.get<{
    asistencias: AsistenciaEstudiantePisu[];
    resumen: ResumenAsistenciaPisu[];
  }>("/estudiante/asistencias");
  return data;
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
  imagen?: string;
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

export async function obtenerInscritosEventoAdmin(
  eventoId: string,
): Promise<InscritoEventoPisu[]> {
  const { data } = await api.get<{ inscripciones: InscritoEventoPisu[] }>(
    `/admin/eventos/${eventoId}/inscritos`,
  );
  return data.inscripciones;
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

export async function obtenerDashboardAdmin(): Promise<unknown> {
  const { data } = await api.get("/admin/dashboard");
  return data.dashboard;
}

export async function eliminarDeporteAdmin(id: string): Promise<void> {
  await api.delete(`/admin/deportes/${id}`);
}

export async function crearDocenteAdmin(payload: {
  nombre: string;
  correo: string;
  documento?: string | null;
  especialidad?: string | null;
}): Promise<{ docente: DocentePisu; passwordTemporal: string }> {
  const { data } = await api.post("/admin/docentes", payload);
  return data;
}

export async function actualizarDocenteAdmin(
  id: string,
  payload: Partial<{
    nombre: string;
    correo: string;
    documento: string | null;
    especialidad: string | null;
    estado: boolean;
  }>,
): Promise<void> {
  await api.patch(`/admin/docentes/${id}`, payload);
}

export async function cargarDocentesCsvAdmin(csv: string): Promise<{
  creados: number;
  errores: Array<{ fila: number; motivo: string }>;
}> {
  const { data } = await api.post("/admin/docentes/csv", { csv });
  return data.resumen;
}

export async function listarEstudiantesAdmin(q = ""): Promise<
  Array<{
    id: string;
    nombre: string;
    correo: string;
    documento?: string | null;
    categoria: string | null;
    estado: boolean;
  }>
> {
  const { data } = await api.get("/admin/estudiantes", { params: q ? { q } : undefined });
  return data.estudiantes;
}

export async function actualizarEstudianteAdmin(
  id: string,
  payload: { categoria?: string; estado?: boolean; nombre?: string },
): Promise<void> {
  await api.patch(`/admin/estudiantes/${id}`, payload);
}

export async function buscarEstudiantesAdmin(q: string): Promise<
  Array<{
    id: string;
    nombre: string;
    correo: string;
    documento?: string | null;
    categoria: string | null;
    estado: boolean;
    inscripciones?: Array<{ estado: string; deporte?: { id: string; nombre: string } }>;
  }>
> {
  const { data } = await api.get("/admin/estudiantes/buscar", { params: { q } });
  return data.estudiantes;
}

export async function inscribirEstudianteManualAdmin(payload: {
  estudiante_id: string;
  deporte_id: string;
}): Promise<void> {
  await api.post("/admin/inscripciones", payload);
}

export async function retirarInscripcionManualAdmin(id: string): Promise<void> {
  await api.patch(`/admin/inscripciones/${id}/cancelar`);
}

export async function obtenerInscritosDeporte(
  deporteId: string,
  params: { q?: string; categoria?: string; orden?: string; page?: number; pageSize?: number },
) {
  const { data } = await api.get(`/deportes/${deporteId}/inscritos`, { params });
  return data as {
    filas: Array<{
      id: string; estudiante_id: string; nombre: string; documento: string | null; correo: string | null;
      categoria: string | null; fecha_inscripcion: string; asistencias_total: number; asistencias_presentes: number;
      porcentaje_asistencia: number | null; inasistencias: number;
    }>;
    total: number; page: number; pageSize: number; reducido?: boolean;
  };
}

export async function obtenerEstudiantesGeneral(params: { deporteId?: string; categoria?: string; sinInscripcion?: boolean; q?: string }) {
  const { data } = await api.get("/admin/estudiantes", { params });
  return data.estudiantes as Array<{ id: string; nombre: string; correo: string; documento?: string | null; categoria: string | null; estado: boolean; inscripciones?: Array<{ deporte_id: string; deporte?: { id: string; nombre: string } }> }>;
}

export async function obtenerInscripcionesEstudiante(id: string) {
  const { data } = await api.get(`/admin/estudiantes/${id}/inscripciones`);
  return data.inscripciones as Array<{ inscripcion_id: string; fecha_inscripcion: string; deporte: { id: string; nombre: string } | null; horarios: Array<{ dia_semana: number; hora_inicio: string; hora_fin: string; lugar: string; docente: { nombre: string } | null }>; asistencia: { total: number; presentes: number; porcentaje: number | null; inasistencias: number } }>;
}

export async function obtenerMisInscripcionesCompletas() {
  const { data } = await api.get("/estudiante/inscripciones/completas");
  return data.inscripciones as Array<{ inscripcion_id: string; fecha_inscripcion: string; deporte: { id: string; nombre: string } | null; horarios: Array<{ dia_semana: number; hora_inicio: string; hora_fin: string; lugar: string; docente: { nombre: string } | null }>; asistencia: { total: number; presentes: number; porcentaje: number | null; inasistencias: number } }>;
}

export async function obtenerVerificacion() {
  const { data } = await api.get('/admin/verificacion');
  return data.verificacion;
}
