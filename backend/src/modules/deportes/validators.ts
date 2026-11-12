import { z } from "zod";

export const uuidSchema = z.string().uuid();

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

export const crearDeporteSchema = z.object({
  nombre: z.string().min(2).max(150),
  descripcion: z.string().nullable().optional(),
  imagen: z.string().url().nullable().optional(),
  cupo_maximo: z.number().int().min(1),
  categorias_permitidas: z
    .array(z.enum(["Pregrado", "Postgrado", "Egresado"]))
    .min(1)
    .optional(),
});

export const crearDocenteSchema = z.object({
  nombre: z.string().min(2).max(180),
  correo: z.string().email().max(255),
  documento: z.string().max(60).nullable().optional(),
  especialidad: z.string().max(120).nullable().optional(),
});

export const actualizarDocenteSchema = crearDocenteSchema.partial().extend({
  estado: z.boolean().optional(),
});

export const crearEstudiantePisuSchema = z.object({
  nombre: z.string().min(2).max(180),
  correo: z.string().email().max(255),
  documento: z.string().max(60).nullable().optional(),
  categoria: z.enum(["Pregrado", "Postgrado", "Egresado"]).default("Pregrado"),
});

export const actualizarEstudiantePisuSchema = z.object({
  nombre: z.string().min(2).max(180).optional(),
  categoria: z.enum(["Pregrado", "Postgrado", "Egresado"]).optional(),
  estado: z.boolean().optional(),
});

export const inscripcionManualSchema = z.object({
  estudiante_id: z.string().uuid(),
  deporte_id: z.string().uuid(),
});

export const crearAdministradorPisuSchema = z.object({
  nombre: z.string().min(2).max(180),
  correo: z.string().email().max(255),
  documento: z.string().max(60).nullable().optional(),
});

export const asignarRolPisuSchema = z.object({
  rol: z.enum(["Administrador", "Docente", "Estudiante"]),
  categoria: z.enum(["Pregrado", "Postgrado", "Egresado"]).nullable().optional(),
  auth_usuario_id: z.string().uuid().optional(),
});

export const actualizarDeporteSchema = z.object({
  nombre: z.string().min(2).max(150).optional(),
  descripcion: z.string().nullable().optional(),
  imagen: z.string().url().nullable().optional(),
  cupo_maximo: z.number().int().min(1).optional(),
  categorias_permitidas: z
    .array(z.enum(["Pregrado", "Postgrado", "Egresado"]))
    .min(1)
    .optional(),
  estado: z.boolean().optional(),
});

export const crearEventoPisuSchema = z.object({
  nombre: z.string().min(2).max(180),
  descripcion: z.string().nullable().optional(),
  tipo: z.string().max(80).optional(),
  fecha: z.string().min(8),
  lugar: z.string().min(2).max(180),
  cupo_maximo: z.number().int().min(1),
});

export const actualizarEventoPisuSchema = crearEventoPisuSchema.partial().extend({
  estado: z.boolean().optional(),
});

export const crearHorarioPisuSchema = z.object({
  deporte_id: z.string().uuid(),
  docente_id: z.string().uuid(),
  dia_semana: z.number().int().min(0).max(6),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  hora_fin: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  lugar: z.string().min(2).max(180),
});

export const actualizarHorarioPisuSchema = crearHorarioPisuSchema.partial().extend({
  estado: z.boolean().optional(),
});


export const crearAlertaPisuSchema = z.object({
  titulo: z.string().min(2).max(180),
  mensaje: z.string().min(2),
  audiencia: z.enum(["Todos", "Docentes", "Estudiantes"]),
});
