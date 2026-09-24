import { z } from "zod";

export const autoinscripcionSchema = z.object({
  deporte_id: z.string().uuid(),
});

const registroAsistenciaSchema = z
  .object({
    estudianteId: z.string().uuid().optional(),
    estudiante_id: z.string().uuid().optional(),
    presente: z.boolean(),
  })
  .refine((item) => Boolean(item.estudianteId ?? item.estudiante_id), {
    message: "estudianteId es obligatorio",
    path: ["estudianteId"],
  })
  .transform((item) => ({
    estudianteId: (item.estudianteId ?? item.estudiante_id) as string,
    presente: item.presente,
  }));

export const registrarAsistenciaSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }
  const body = raw as Record<string, unknown>;
  return {
    horarioId: body["horarioId"] ?? body["horario_id"],
    fecha: body["fecha"],
    estudiantes:
      body["estudiantes"] ?? body["registros"] ?? body["asistencias"],
  };
}, z.object({
  horarioId: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  estudiantes: z.array(registroAsistenciaSchema).min(1),
}));

export const editarAsistenciaSchema = z.object({
  presente: z.boolean(),
});
