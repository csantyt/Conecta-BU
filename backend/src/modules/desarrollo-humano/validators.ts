import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const crearHorarioSchema = z.object({
  servicio_id: uuidSchema,
  profesional: z.string().trim().max(150).optional(),
  dia_semana: z.number().int().min(0).max(6),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  hora_fin: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  cupo: z.number().int().min(1).default(1),
});

export const actualizarHorarioSchema = crearHorarioSchema.partial().extend({
  activo: z.boolean().optional(),
});

export const consultarHorariosSchema = z.object({
  servicio_id: uuidSchema.optional(),
  activo: z
    .enum(["true", "false"])
    .optional()
    .transform((valor) => (valor === undefined ? undefined : valor === "true")),
});

export const horariosDisponiblesSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  servicio_id: uuidSchema.optional(),
});

export const crearCitaSchema = z.object({
  servicio_id: uuidSchema,
  horario_id: uuidSchema,
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const cancelarCitaSchema = z.object({
  motivo: z.string().trim().max(500).optional(),
});

export const asistenciaSchema = z.object({
  estado: z.enum(["ASISTIO", "NO_ASISTIO"]),
});

export const crearEventoSchema = z.object({
  titulo: z.string().trim().min(3).max(180),
  descripcion: z.string().trim().max(2000).optional(),
  fecha_inicio: z.string().min(10),
  fecha_fin: z.string().min(10).optional(),
  cupo_total: z.number().int().min(1),
});
