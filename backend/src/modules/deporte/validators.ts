import { z } from "zod";

export const autoinscripcionSchema = z.object({
  deporte_id: z.string().uuid(),
});
