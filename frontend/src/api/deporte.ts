import { api } from "./http";
import type {
  AsistenciaPisu,
  ClaseDocente,
  DeportePisu,
  EstudianteDeClase,
  InscripcionPisu,
  PerfilPisu,
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
