import { useEffect, useRef, useState, type FormEvent } from "react";
import { consultarOrientacion, type MensajeChat } from "../api/ia";

const SALUDO: MensajeChat = {
  rol: "asistente",
  contenido:
    "Hola, soy el asistente de orientación de Conecta BU. Puedo explicarte cómo agendar citas, ver horarios o inscribirte a eventos. No doy diagnósticos ni atención clínica.",
};

export default function ChatbotOrientacion() {
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [mensajes, setMensajes] = useState<MensajeChat[]>([SALUDO]);
  const [enviando, setEnviando] = useState(false);
  const listaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight });
  }, [mensajes, abierto]);

  async function onEnviar(event: FormEvent) {
    event.preventDefault();
    const texto = mensaje.trim();
    if (!texto || enviando) {
      return;
    }

    const historial = mensajes.slice(-10);
    const siguiente: MensajeChat = { rol: "usuario", contenido: texto };
    setMensajes((actual) => [...actual, siguiente]);
    setMensaje("");
    setEnviando(true);

    try {
      const data = await consultarOrientacion(texto, historial);
      setMensajes((actual) => [
        ...actual,
        { rol: "asistente", contenido: data.respuesta },
      ]);
    } catch {
      setMensajes((actual) => [
        ...actual,
        {
          rol: "asistente",
          contenido:
            "No pude conectar con el asistente en este momento. Agenda una cita de orientación en el módulo de Desarrollo humano.",
        },
      ]);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-5 sm:right-5">
      {abierto ? (
        <section className="flex h-[min(70dvh,28rem)] w-[min(calc(100vw-2rem),22rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl max-sm:fixed max-sm:inset-x-3 max-sm:bottom-24 max-sm:top-20 max-sm:h-auto max-sm:w-auto">
          <header className="bg-slate-900 px-4 py-3 text-white">
            <p className="text-sm font-semibold">Asistente de orientación</p>
            <p className="text-[11px] text-slate-300">
              Conecta BU · no realiza diagnósticos (RN-011)
            </p>
          </header>

          <div ref={listaRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {mensajes.map((item, indice) => (
              <p
                key={`${item.rol}-${indice}`}
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-5 ${
                  item.rol === "usuario"
                    ? "ml-auto bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                {item.contenido}
              </p>
            ))}
            {enviando ? (
              <p className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-500">
                Escribiendo...
              </p>
            ) : null}
          </div>

          <form onSubmit={(event) => void onEnviar(event)} className="border-t p-3">
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Escribe tu duda sobre la plataforma..."
                value={mensaje}
                onChange={(event) => setMensaje(event.target.value)}
                disabled={enviando}
              />
              <button
                type="submit"
                disabled={enviando || !mensaje.trim()}
                className="rounded-xl bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setAbierto((valor) => !valor)}
        className="h-14 w-14 rounded-full bg-sky-500 text-sm font-semibold text-white shadow-lg transition hover:bg-sky-400"
        aria-label={abierto ? "Cerrar asistente" : "Abrir asistente de orientación"}
      >
        {abierto ? "×" : "IA"}
      </button>
    </div>
  );
}
