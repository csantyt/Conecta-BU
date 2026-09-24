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

export function horaCorta(hora: string): string {
  return hora.slice(0, 5);
}

export function fechaLocal(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function etiquetaHorario(params: {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  lugar: string;
}): string {
  return `${DIAS[params.dia_semana] ?? "Día"} ${horaCorta(params.hora_inicio)}–${horaCorta(params.hora_fin)} · ${params.lugar}`;
}

export function estiloDeporte(nombre: string): { emoji: string; clase: string } {
  const clave = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (clave.includes("futbol")) {
    return { emoji: "⚽", clase: "bg-emerald-100 text-emerald-800" };
  }
  if (clave.includes("baloncesto") || clave.includes("basket")) {
    return { emoji: "🏀", clase: "bg-orange-100 text-orange-800" };
  }
  if (clave.includes("voleibol") || clave.includes("voley")) {
    return { emoji: "🏐", clase: "bg-sky-100 text-sky-800" };
  }
  if (clave.includes("tenis")) {
    return { emoji: "🎾", clase: "bg-lime-100 text-lime-800" };
  }
  if (clave.includes("natacion")) {
    return { emoji: "🏊", clase: "bg-cyan-100 text-cyan-800" };
  }
  return { emoji: "🏅", clase: "bg-slate-100 text-slate-800" };
}
