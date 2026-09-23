const RN011 =
  "No puedo dar diagnósticos psicológicos, prescripciones ni atención clínica. Si necesitas acompañamiento, agenda una cita de orientación en Desarrollo humano y orientación → Citas → Agendar cita.";

const CRISIS =
  RN011 +
  " Si estás en riesgo o en crisis, busca ayuda inmediata en Bienestar Universitario o en un servicio de urgencias local.";

function cuerpo(item) {
  if (item.body && typeof item.body === "object") {
    return item.body;
  }
  return item;
}

function textoDe(valor) {
  return String(valor || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const item = $input.first().json;
const data = cuerpo(item);
const mensaje = String(data.mensaje || data.chatInput || data.text || "");
const t = textoDe(mensaje);
const clinica = Boolean(data.consulta_clinica) ||
  /diagnost|prescri|receta|medicament|dosis|trastorno|depres|ansiedad|tdah|bipolar|esquizofr|autoles|suicid|matarme|quitarme la vida|psiquiat|panico|pánico/.test(t);
const crisis = /suicid|autoles|matarme|quitarme la vida|no quiero vivir/.test(t);

let respuesta = "";
if (!mensaje.trim()) {
  respuesta = "Cuéntame tu duda sobre citas, horarios o eventos de Desarrollo humano y orientación.";
} else if (crisis) {
  respuesta = CRISIS;
} else if (clinica) {
  respuesta = RN011;
} else if (/agend|cita|horario|cupo/.test(t)) {
  respuesta = "Para agendar: entra a Desarrollo humano y orientación → Citas, elige servicio, fecha y un horario con cupo, y confirma. Solo puedes tener una cita activa. Si cancelas, el horario se libera.";
} else if (/cancel/.test(t)) {
  respuesta = "En Mis citas abre la cita AGENDADA y pulsa Cancelar. Eso libera el cupo para otra persona.";
} else if (/evento|taller|inscrip/.test(t)) {
  respuesta = "En la pestaña Eventos ves talleres con cupo y fecha límite. Inscribirte reserva un cupo; si el evento está lleno o venció la fecha, elige otro o espera una nueva convocatoria.";
} else if (/orientacion vocacional|vocacion/.test(t)) {
  respuesta = "La orientación vocacional se agenda como cita en el módulo. Elige ese servicio, un horario libre y confirma. Este chat no reemplaza la sesión con el profesional.";
} else if (/acompanamiento psicologic|psicolog/.test(t)) {
  respuesta = "El acompañamiento psicológico se solicita agendando una cita con un profesional. Aquí solo oriento el uso de la plataforma; no hago atención clínica.";
} else if (/hola|buenas|quien eres|ayuda/.test(t)) {
  respuesta = "Soy el asistente de orientación de Conecta BU. Puedo explicarte cómo agendar citas, ver horarios o inscribirte a eventos. No doy diagnósticos ni recetas.";
} else {
  respuesta = "Puedo ayudarte con el uso de Conecta BU: citas, horarios y eventos de Desarrollo humano. Si necesitas atención profesional, agenda una cita en el módulo. ¿Qué quieres hacer?";
}

return [{ json: { respuesta } }];
