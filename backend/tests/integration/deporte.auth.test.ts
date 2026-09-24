import { describe, expect, it } from "@jest/globals";
import request from "supertest";
import app from "../../src/app.js";
import "../../src/modules/deporte/models/index.js";

describe("API Deporte — autenticación (401)", () => {
  const protegidos: Array<{ method: "get" | "post"; path: string }> = [
    { method: "get", path: "/api/v1/deportes" },
    { method: "get", path: "/api/v1/docente/mis-clases" },
    { method: "post", path: "/api/v1/docente/asistencia" },
    { method: "post", path: "/api/v1/admin/deportes" },
    { method: "post", path: "/api/v1/estudiante/inscripciones" },
  ];

  it.each(protegidos)(
    "responde 401 Unauthorized en $method $path sin JWT",
    async ({ method, path }) => {
      const respuesta = await request(app)[method](path).send({});
      expect(respuesta.status).toBe(401);
      expect(String(respuesta.body.message ?? "")).toMatch(/token|autentic/i);
    },
  );
});
