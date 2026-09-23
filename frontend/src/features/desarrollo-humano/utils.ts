import axios from "axios";

export const DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function mensajeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string") {
      return message;
    }
  }
  return "No se pudo completar la acción.";
}

export function formatearFecha(valor: string): string {
  return new Date(valor).toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}

export function fechaLocal(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function esMismaFecha(iso: string, ymd: string): boolean {
  return fechaLocal(new Date(iso)) === ymd;
}

export function etiquetaHorario(horario: {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  profesional?: string | null;
  cupo_disponible?: number;
}): string {
  const profesional = horario.profesional ? ` · ${horario.profesional}` : "";
  const cupo =
    horario.cupo_disponible !== undefined
      ? ` · ${horario.cupo_disponible} cupo(s)`
      : "";
  return `${DIAS[horario.dia_semana]} ${horaCorta(horario.hora_inicio)}-${horaCorta(horario.hora_fin)}${profesional}${cupo}`;
}
