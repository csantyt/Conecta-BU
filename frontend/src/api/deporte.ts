import { api } from "./http";
import type {
  AlertaPisu,
  AsistenciaEstudiantePisu,
  AsistenciaPisu,
  ClaseDocente,
  ComunicadoPisu,
  DeportePisu,
  DocentePisu,
  EstudianteDeClase,
  EstudianteDeporteDocente,
  EventoPisu,
  GrupoInscritosDeporte,
  HorarioAdminPisu,
  HorarioEstudiantePisu,
  InscripcionPisu,
  InscritoEventoDocentePisu,
  InscritoEventoPisu,
  MiDeporteDocente,
  PerfilPisu,
  ReporteDocente,
  ResumenAsistenciaPisu,
  ResumenPisu,
  SesionHistorialDocente,
  SesionListaDocente,
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

/** Eventos en los que el estudiante está inscrito (incluye los cancelados). */
export async function obtenerMisEventosPisu(): Promise<EventoPisu[]> {
  const { data } = await api.get<{ eventos: EventoPisu[] }>("/estudiante/eventos/mios");
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

/**
 * Completa el perfil del estudiante con datos que no se pueden inventar
 * (sección 10.1). Hoy solo la categoría académica.
 */
export async function completarPerfilPisu(
  categoria: "Pregrado" | "Postgrado" | "Egresado",
): Promise<PerfilPisu> {
  const { data } = await api.patch<{ perfil: PerfilPisu }>("/estudiante/perfil", {
    categoria,
  });
  return data.perfil;
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

export async function obtenerMisClasesHoyDocente(): Promise<{
  clases: ClaseDocente[];
  comunicados: ComunicadoPisu[];
  mensaje: string | null;
}> {
  const { data } = await api.get<{
    clases: ClaseDocente[];
    comunicados: ComunicadoPisu[];
    mensaje?: string | null;
  }>("/docente/mis-clases/hoy");
  return {
    clases: data.clases,
    comunicados: data.comunicados,
    mensaje: data.mensaje ?? null,
  };
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

/**
 * Reemplaza la lista de deportes asignados a un docente. Al asignarle un deporte,
 * el docente lo verá en su panel aunque todavía no tenga horarios publicados.
 */
export async function asignarDeportesDocenteAdmin(
  id: string,
  deporteIds: string[],
): Promise<DeporteAsignadoDocente[]> {
  const { data } = await api.put<{ deportes: DeporteAsignadoDocente[] }>(
    `/admin/docentes/${id}/deportes`,
    { deporteIds },
  );
  return data.deportes;
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

export async function obtenerInscritosAgrupados(params?: { q?: string; categoria?: string }) {
  const { data } = await api.get<{ grupos: GrupoInscritosDeporte[] }>("/admin/inscripciones/agrupadas", { params });
  return data.grupos;
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

// ============================================================================
// Rol Docente — cliente del módulo (siempre con JWT por el interceptor)
// ============================================================================

export async function obtenerMisDeportesDocente(): Promise<MiDeporteDocente[]> {
  const { data } = await api.get<{ deportes: MiDeporteDocente[] }>("/docente/mis-deportes");
  return data.deportes;
}

export async function obtenerClasesHoyDocente(): Promise<ClaseHoyDocente[]> {
  const { data } = await api.get<{ clases: ClaseHoyDocente[] }>("/docente/hoy");
  return data.clases;
}

export async function obtenerSesionListaDocente(
  horarioId: string,
  fecha: string,
): Promise<SesionListaDocente> {
  const { data } = await api.get<SesionListaDocente>(
    `/docente/clases/${horarioId}/lista`,
    { params: { fecha } },
  );
  return data;
}

export async function obtenerHistorialDocente(
  deporteId?: string,
): Promise<SesionHistorialDocente[]> {
  const { data } = await api.get<{ sesiones: SesionHistorialDocente[] }>(
    "/docente/historial",
    { params: deporteId ? { deporteId } : undefined },
  );
  return data.sesiones;
}

export async function obtenerEstudiantesDeporteDocente(deporteId: string): Promise<{
  deporte: { id: string; nombre: string; cupo_maximo: number };
  dictadas: number;
  estudiantes: EstudianteDeporteDocente[];
}> {
  const { data } = await api.get<{
    deporte: { id: string; nombre: string; cupo_maximo: number };
    dictadas: number;
    estudiantes: EstudianteDeporteDocente[];
  }>(`/docente/deportes/${deporteId}/estudiantes`);
  return data;
}

export async function obtenerReporteDocente(deporteId: string): Promise<ReporteDocente> {
  const { data } = await api.get<{ reporte: ReporteDocente }>(
    `/docente/deportes/${deporteId}/reporte`,
  );
  return data.reporte;
}

function nombreDesdeCabecera(disposicion: unknown): string | null {
  if (typeof disposicion !== "string") return null;
  const coincidencia = /filename="?([^";]+)"?/i.exec(disposicion);
  return coincidencia?.[1] ?? null;
}

/** Descarga el Excel del reporte usando el blob y el nombre del encabezado. */
export async function descargarReporteExcelDocente(
  deporteId: string,
  deporteNombre: string,
): Promise<void> {
  const respuesta = await api.get(`/docente/deportes/${deporteId}/reporte/excel`, {
    responseType: "blob",
  });
  const blob = respuesta.data as Blob;
  const nombre =
    nombreDesdeCabecera(respuesta.headers["content-disposition"]) ??
    `reporte_${deporteNombre.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.xlsx`;
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

// ============================================================================
// Rol Docente — eventos (torneos, masterclass, etc.)
// ============================================================================

export type PayloadEventoDocente = {
  nombre: string;
  descripcion?: string | null;
  tipo: string;
  deporte_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
  cupo_maximo: number;
  fecha_limite_inscripcion?: string | null;
  categorias_permitidas?: string[];
};

export async function obtenerEventosDocente(): Promise<EventoPisu[]> {
  const { data } = await api.get<{ eventos: EventoPisu[] }>("/deportes/docente/eventos");
  return data.eventos;
}

export async function crearEventoDocente(
  payload: PayloadEventoDocente,
): Promise<{ evento: EventoPisu; aviso: string | null; notificados: number }> {
  const { data } = await api.post<{ evento: EventoPisu; aviso: string | null; notificados: number }>(
    "/deportes/docente/eventos",
    payload,
  );
  return data;
}

export async function actualizarEventoDocente(
  id: string,
  payload: Partial<PayloadEventoDocente>,
): Promise<{ evento: EventoPisu; aviso: string | null; notificados: number }> {
  const { data } = await api.put<{ evento: EventoPisu; aviso: string | null; notificados: number }>(
    `/deportes/docente/eventos/${id}`,
    payload,
  );
  return data;
}

export async function cancelarEventoDocente(
  id: string,
  motivo: string,
): Promise<{ eliminado: boolean; notificados: number; inscritos: number }> {
  const { data } = await api.post(
    `/deportes/docente/eventos/${id}/cancelar`,
    { motivo },
  );
  return data as { eliminado: boolean; notificados: number; inscritos: number };
}

export async function obtenerInscritosEventoDocente(
  id: string,
  q = "",
): Promise<{ evento: EventoPisu; inscritos: InscritoEventoDocentePisu[] }> {
  const { data } = await api.get<{
    evento: EventoPisu;
    inscritos: InscritoEventoDocentePisu[];
  }>(`/deportes/docente/eventos/${id}/inscritos`, { params: q ? { q } : undefined });
  return data;
}

/** Descarga el CSV de inscritos generado por el backend. */
export async function descargarCsvInscritosEventoDocente(
  id: string,
  nombreEvento: string,
): Promise<void> {
  const respuesta = await api.get(`/deportes/docente/eventos/${id}/inscritos`, {
    params: { formato: "csv" },
    responseType: "blob",
  });
  const blob = respuesta.data as Blob;
  const nombre =
    nombreDesdeCabecera(respuesta.headers["content-disposition"]) ??
    `inscritos_${nombreEvento.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.csv`;
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
