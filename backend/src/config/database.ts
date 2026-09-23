import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "dotenv/config";
import { Sequelize } from "sequelize";
import { SCHEMAS } from "./schemas.js";

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("La variable de entorno DATABASE_URL es obligatoria.");
}

export const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: false,
  define: {
    underscored: true,
  },
});

export async function probarConexion(): Promise<void> {
  await sequelize.authenticate();
}

export async function asegurarEsquemasIndependientes(): Promise<void> {
  const esquemas = Object.values(SCHEMAS);

  for (const schema of esquemas) {
    await sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  }
}

export async function alinearEsquemaEventos(): Promise<void> {
  await sequelize.query(`
    ALTER TABLE IF EXISTS desarrollo_humano.eventos
      ADD COLUMN IF NOT EXISTS fecha_limite_inscripcion TIMESTAMPTZ;
  `);
  await sequelize.query(`
    ALTER TABLE IF EXISTS desarrollo_humano.inscripciones
      ADD COLUMN IF NOT EXISTS asistencia VARCHAR(32);
  `);
}

export async function alinearRolesUsuarios(): Promise<void> {
  await sequelize.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'auth' AND table_name = 'usuarios'
      ) THEN
        ALTER TABLE auth.usuarios
          ALTER COLUMN rol TYPE VARCHAR(32)
          USING rol::text;
        ALTER TABLE auth.usuarios
          ALTER COLUMN rol SET DEFAULT 'USUARIO';
        UPDATE auth.usuarios
          SET rol = 'USUARIO'
          WHERE rol = 'ESTUDIANTE';
      END IF;
    END $$;
  `);
}

export async function alinearEsquemaDeportePisu(): Promise<void> {
  const archivo = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../database/deporte_pisu.sql",
  );
  const sql = await readFile(archivo, "utf8");
  const sentencias = sql
    .split(";")
    .map((parte) => parte.trim())
    .filter((parte) => {
      if (!parte) {
        return false;
      }
      const sinComentarios = parte
        .split("\n")
        .map((linea) => linea.trim())
        .filter((linea) => linea.length > 0 && !linea.startsWith("--"));
      return sinComentarios.length > 0;
    });

  for (const sentencia of sentencias) {
    await sequelize.query(`${sentencia};`);
  }
}
