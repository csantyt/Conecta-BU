function cuerpo(item) {
  if (item.body && typeof item.body === "object") {
    return item.body;
  }
  return item;
}

const data = cuerpo($input.first().json);
const eventos = Array.isArray(data.eventos) ? data.eventos : [];

const recomendaciones = eventos.slice(0, 3).map((evento) => ({
  evento_id: evento.id,
  motivo: evento.descripcion
    ? `Recomendado por cupo disponible (${evento.cupo_disponible}) y su enfoque: ${String(evento.descripcion).slice(0, 120)}`
    : `Taller próximo con ${evento.cupo_disponible} cupo(s) disponible(s).`,
}));

return [{ json: { recomendaciones } }];
