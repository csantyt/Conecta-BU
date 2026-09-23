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
    <div className="rounded-2xl border border-slate-200 p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm hover:bg-slate-100"
          onClick={() => cambiarMes(-1)}
        >
          ←
        </button>
        <p className="text-sm font-semibold">
          {NOMBRES_MES[mes]} {anio}
        </p>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm hover:bg-slate-100"
          onClick={() => cambiarMes(1)}
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-500 sm:text-xs">
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
          return (
            <button
              key={fecha}
              type="button"
              disabled={!habil}
              onClick={() => onChange(fecha)}
              className={`aspect-square rounded-lg text-xs sm:text-sm ${
                seleccionado
                  ? "bg-slate-900 text-white"
                  : habil
                    ? "bg-sky-50 text-slate-900 hover:bg-sky-100"
                    : "text-slate-300"
              }`}
            >
              {dia}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Los días en azul tienen horarios del servicio elegido.
      </p>
    </div>
  );
}
