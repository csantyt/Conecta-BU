export function normalizarHora(hora: string): string {
  const texto = String(hora);
  return texto.length === 5 ? `${texto}:00` : texto.slice(0, 8);
}

function aMinutos(hora: string): number {
  const [horas, minutos] = normalizarHora(hora).split(":").map(Number);
  return (horas ?? 0) * 60 + (minutos ?? 0);
}

export function hayTraslape(
  inicioA: string,
  finA: string,
  inicioB: string,
  finB: string,
): boolean {
  return aMinutos(inicioA) < aMinutos(finB) && aMinutos(finA) > aMinutos(inicioB);
}
