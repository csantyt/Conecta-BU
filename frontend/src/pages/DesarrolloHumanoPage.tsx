type DesarrolloHumanoPageProps = {
  onVolver: () => void;
};

const servicios = [
  {
    titulo: "Acompañamiento psicológico",
    descripcion:
      "Espacio de escucha y orientación para el bienestar emocional de la comunidad universitaria.",
  },
  {
    titulo: "Orientación vocacional",
    descripcion:
      "Apoyo para la toma de decisiones académicas y el proyecto de vida profesional.",
  },
  {
    titulo: "Talleres de desarrollo humano",
    descripcion:
      "Encuentros formativos en habilidades para la vida, convivencia y crecimiento personal.",
  },
];

export default function DesarrolloHumanoPage({
  onVolver,
}: DesarrolloHumanoPageProps) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <button
        type="button"
        onClick={onVolver}
        className="mb-6 text-sm text-slate-300 transition hover:text-white"
      >
        ← Volver a módulos
      </button>

      <section className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-sm font-medium text-sky-300">Módulo activo</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Desarrollo humano y orientación
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Este módulo concentra el acompañamiento psicoeducativo de Bienestar
          Universitario. Aquí se gestionarán citas, talleres y seguimiento a
          estudiantes.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {servicios.map((servicio) => (
          <article
            key={servicio.titulo}
            className="rounded-2xl border border-white/10 bg-white p-6 text-slate-900 shadow-xl"
          >
            <h2 className="text-lg font-semibold">{servicio.titulo}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {servicio.descripcion}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
