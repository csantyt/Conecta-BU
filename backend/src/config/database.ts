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
