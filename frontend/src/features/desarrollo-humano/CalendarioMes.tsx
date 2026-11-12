import { fechaLocal } from "./utils";

type CalendarioMesProps = {
  valor: string;
  diasHabiles: number[];
  onChange: (fecha: string) => void;
};

const NOMBRES_MES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function CalendarioMes({
  valor,
  diasHabiles,
  onChange,
}: CalendarioMesProps) {
  const base = valor ? new Date(`${valor}T12:00:00`) : new Date();
  const anio = base.getFullYear();
  const mes = base.getMonth();
  const habilitados = new Set(diasHabiles);
  const hoy = fechaLocal(new Date());
  const primerDia = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const celdas: (number | null)[] = [
    ...Array.from({ length: primerDia }, () => null),
    ...Array.from({ length: diasEnMes }, (_, i) => i + 1),
  ];

  function cambiarMes(delta: number) {
    const siguiente = new Date(anio, mes + delta, 1);
    onChange(fechaLocal(siguiente));
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-uni-noche/40 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => cambiarMes(-1)}
          aria-label="Mes anterior"
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          ←
        </button>
        <p className="text-sm font-semibold text-white" aria-live="polite">
          {NOMBRES_MES[mes]} {anio}
        </p>
        <button
          type="button"
          onClick={() => cambiarMes(1)}
          aria-label="Mes siguiente"
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
        {["D", "L", "M", "M", "J", "V", "S"].map((dia, i) => (
          <span key={`${dia}-${i}`}>{dia}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {celdas.map((dia, indice) => {
          if (!dia) {
            return <span key={`v-${indice}`} />;
          }
          const fecha = fechaLocal(new Date(anio, mes, dia));
          const weekday = new Date(anio, mes, dia).getDay();
          const pasado = fecha < hoy;
          const habil = habilitados.has(weekday) && !pasado;
          const seleccionado = valor === fecha;
          const esHoy = fecha === hoy;
          return (
            <button
              key={fecha}
              type="button"
              disabled={!habil}
              aria-label={`${dia} de ${NOMBRES_MES[mes]}${esHoy ? ", hoy" : ""}${habil ? ", con horarios" : ""}`}
              aria-pressed={seleccionado}
              onClick={() => onChange(fecha)}
              className={`relative aspect-square rounded-lg text-xs font-medium transition-all duration-200 sm:text-sm ${
                seleccionado
                  ? "banda-uni font-bold text-uni-noche shadow-lg shadow-uni-cian/20"
                  : habil
                    ? "bg-white/[0.06] text-slate-100 hover:bg-uni-cian/15 hover:text-white"
                    : "cursor-not-allowed text-slate-600"
              } ${esHoy && !seleccionado ? "ring-1 ring-inset ring-uni-cian/60" : ""}`}
            >
              {dia}
              {habil && !seleccionado ? (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-uni-cian/70"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Los días resaltados tienen horarios del servicio elegido.
      </p>
    </div>
  );
}
