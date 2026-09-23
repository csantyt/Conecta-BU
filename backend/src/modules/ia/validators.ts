import { z } from "zod";

export const mensajeChatSchema = z.object({
  mensaje: z.string().trim().min(1).max(2000),
  historial: z
    .array(
      z.object({
        rol: z.enum(["usuario", "asistente"]),
        contenido: z.string().trim().min(1).max(4000),
      }),
    )
    .max(12)
    .optional(),
});
