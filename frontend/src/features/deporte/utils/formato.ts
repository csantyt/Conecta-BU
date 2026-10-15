export function formatearFecha(fecha: string | Date): string {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatearHora(hora: string | Date): string {
  if (typeof hora === "string") {
    const partes = hora.split(":");
    if (partes.length >= 2) {
      const d = new Date();
      d.setHours(Number(partes[0]), Number(partes[1]), 0, 0);
      return new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(d);
    }
  }
  const d = new Date(hora);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-CO", { hour: "numeric", minute: "2-digit" }).format(d);
}

export function formatearRangoHora(inicio: string, fin: string): string {
  return `${formatearHora(inicio)} - ${formatearHora(fin)}`;
}