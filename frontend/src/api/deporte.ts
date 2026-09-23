import { api } from "./http";
import type { DeportePisu, InscripcionPisu, PerfilPisu } from "../types/deporte";

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
