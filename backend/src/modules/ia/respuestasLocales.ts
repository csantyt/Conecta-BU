import type { EventoDisponible } from "./contextoDesarrolloHumano.js";

export const RESPUESTA_RN011 =
  "No puedo dar diagnósticos psicológicos, prescripciones ni atención clínica. Si necesitas acompañamiento profesional, agenda una cita de orientación en Desarrollo humano y orientación → Citas → Agendar cita.";

export const RESPUESTA_CRISIS =
  RESPUESTA_RN011 +
  " Si estás en riesgo o en crisis, busca ayuda inmediata en Bienestar Universitario o en un servicio de urgencias local.";

const PATRON_CLINICO =
  /diagnost|prescri|receta|medicament|dosis|trastorno|depres|ansiedad grave|\btde\b|tdah|bipolar|esquizofr|autoles|suicid|matarme|quitarme la vida|ataque de panico|psiquiat/;

const PATRON_CRISIS = /suicid|autoles|matarme|quitarme la vida|no quiero vivir/;

export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function pareceConsultaClinica(texto: string): boolean {
  return PATRON_CLINICO.test(normalizarTexto(texto));
}

export function pareceCrisis(texto: string): boolean {
  return PATRON_CRISIS.test(normalizarTexto(texto));
}

const REGLAS: Array<{ patron: RegExp; respuesta: string }> = [
  {
    patron: /cancel/,
    respuesta:
      "En Mis citas abre la cita AGENDADA y pulsa Cancelar. Eso libera el cupo para otra persona.",
  },
  {
    patron: /agend|cita|horario|cupo/,
    respuesta:
      "Para agendar: entra a Desarrollo humano y orientación → Citas, elige servicio, fecha y un horario con cupo, y confirma. Solo puedes tener una cita activa. Si cancelas, el horario se libera.",
  },
  {
    patron: /evento|taller|inscrip/,
    respuesta:
      "En la pestaña Eventos ves talleres con cupo y fecha límite. Inscribirte reserva un cupo; si el evento está lleno o venció la fecha, elige otro o espera una nueva convocatoria.",
  },
  {
    patron: /vocacion/,
    respuesta:
      "La orientación vocacional se agenda como cita en el módulo. Elige ese servicio, un horario libre y confirma. Este chat no reemplaza la sesión con el profesional.",
  },
  {
    patron: /psicolog|acompanamiento/,
    respuesta:
      "El acompañamiento psicológico se solicita agendando una cita con un profesional. Aquí solo oriento el uso de la plataforma; no hago atención clínica.",
  },
  {
    patron: /deporte|pisu|futbol|baloncesto|voleibol/,
    respuesta:
      "Las disciplinas deportivas están en el módulo Deporte: allí ves el catálogo PISU, te inscribes a una disciplina con cupo y consultas tu horario y asistencia en Mi actividad.",
  },
  {
    patron: /hola|buenas|quien eres|ayuda/,
    respuesta:
      "Soy el asistente de orientación de Conecta BU. Puedo explicarte cómo agendar citas, ver horarios o inscribirte a eventos. No doy diagnósticos ni recetas.",
  },
];

const RESPUESTA_GENERAL =
  "Puedo ayudarte con el uso de Conecta BU: citas, horarios y eventos de Desarrollo humano. Si necesitas atención profesional, agenda una cita en el módulo. ¿Qué quieres hacer?";

export function responderLocalmente(mensaje: string): string {
  const texto = normalizarTexto(mensaje);
  if (!texto.trim()) {
    return "Cuéntame tu duda sobre citas, horarios o eventos de Desarrollo humano y orientación.";
  }
  if (pareceCrisis(mensaje)) {
    return RESPUESTA_CRISIS;
  }
  if (pareceConsultaClinica(mensaje)) {
    return RESPUESTA_RN011;
  }
  return REGLAS.find((regla) => regla.patron.test(texto))?.respuesta ?? RESPUESTA_GENERAL;
}

export function motivoLocal(evento: Pick<EventoDisponible, "descripcion" | "cupo_disponible">): string {
  const cupos = `${evento.cupo_disponible} cupo${evento.cupo_disponible === 1 ? "" : "s"} disponible${evento.cupo_disponible === 1 ? "" : "s"}`;
  const descripcion = evento.descripcion?.trim();
  return descripcion
    ? `Taller próximo con ${cupos}. ${descripcion.slice(0, 120)}`
    : `Taller próximo con ${cupos}.`;
}
