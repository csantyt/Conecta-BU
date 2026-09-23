import { api } from "./http";
import type { Cita, EventoDH, Horario, InscripcionEvento, Servicio } from "../types/desarrolloHumano";

const base = "/desarrollo-humano";

export async function obtenerServicios(): Promise<Servicio[]> {
  const { data } = await api.get<{ servicios: Servicio[] }>(`${base}/servicios`);
  return data.servicios;
}

export async function obtenerHorarios(): Promise<Horario[]> {
  const { data } = await api.get<{ horarios: Horario[] }>(`${base}/horarios`);
  return data.horarios;
}

export async function obtenerHorariosDisponibles(params: {
  fecha: string;
  servicio_id?: string;
}): Promise<Horario[]> {
  const { data } = await api.get<{ horarios: Horario[] }>(
    `${base}/horarios/disponibles`,
    { params },
  );
  return data.horarios;
}

export async function crearHorario(payload: {
  servicio_id: string;
  profesional?: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  cupo: number;
}): Promise<void> {
  await api.post(`${base}/horarios`, payload);
}

export async function actualizarHorario(
  id: string,
  payload: Partial<{
    servicio_id: string;
    profesional: string;
    dia_semana: number;
    hora_inicio: string;
    hora_fin: string;
    cupo: number;
    activo: boolean;
  }>,
): Promise<void> {
  await api.patch(`${base}/horarios/${id}`, payload);
}

export async function deshabilitarHorario(id: string): Promise<void> {
  await api.patch(`${base}/horarios/${id}/deshabilitar`);
}

export async function obtenerCitas(): Promise<Cita[]> {
  const { data } = await api.get<{ citas: Cita[] }>(`${base}/citas`);
  return data.citas;
}

export async function agendarCita(payload: {
  servicio_id: string;
  horario_id: string;
  fecha: string;
}): Promise<void> {
  await api.post(`${base}/citas`, payload);
}

export async function cancelarCita(id: string, motivo?: string): Promise<void> {
  await api.patch(`${base}/citas/${id}/cancelar`, { motivo });
}

export async function registrarAsistencia(
  id: string,
  estado: "ASISTIO" | "NO_ASISTIO",
): Promise<void> {
  await api.patch(`${base}/citas/${id}/asistencia`, { estado });
}

export async function obtenerEventos(): Promise<EventoDH[]> {
  const { data } = await api.get<{ eventos: EventoDH[] }>(`${base}/eventos`);
  return data.eventos;
}

export async function crearEvento(payload: {
  titulo: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  fecha_limite_inscripcion?: string;
  cupo_total: number;
}): Promise<void> {
  await api.post(`${base}/eventos`, payload);
}

export async function actualizarEvento(
  id: string,
  payload: Partial<{
    titulo: string;
    descripcion: string;
    fecha_inicio: string;
    fecha_fin: string;
    fecha_limite_inscripcion: string;
    cupo_total: number;
    activo: boolean;
  }>,
): Promise<void> {
  await api.patch(`${base}/eventos/${id}`, payload);
}

export async function eliminarEvento(id: string): Promise<void> {
  await api.delete(`${base}/eventos/${id}`);
}

export async function inscribirseEvento(id: string): Promise<void> {
  await api.post(`${base}/eventos/${id}/inscripciones`);
}

export async function cancelarInscripcion(id: string): Promise<void> {
  await api.delete(`${base}/eventos/${id}/inscripciones`);
}

export async function obtenerInscripcionesEvento(
  id: string,
): Promise<InscripcionEvento[]> {
  const { data } = await api.get<{ inscripciones: InscripcionEvento[] }>(
    `${base}/eventos/${id}/inscripciones`,
  );
  return data.inscripciones;
}

export async function registrarAsistenciaEvento(
  eventoId: string,
  usuarioId: string,
  asistencia: "ASISTIO" | "NO_ASISTIO",
): Promise<void> {
  await api.patch(`${base}/eventos/${eventoId}/asistencia`, {
    usuario_id: usuarioId,
    asistencia,
  });
}
