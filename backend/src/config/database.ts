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

export async function alinearEsquemaAsistenciasDeporte(): Promise<void> {
  await sequelize.query(`
    DO $$
    BEGIN
      -- Si deporte.asistencias existe pero le falta estudiante_id (migración desde esquema con cabecera y detalles)
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'deporte' AND table_name = 'asistencias'
      ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'deporte' AND table_name = 'asistencias' AND column_name = 'estudiante_id'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'deporte' AND table_name = 'asistencia_detalles'
        ) THEN
          CREATE TABLE IF NOT EXISTS deporte.asistencias_migrada (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            horario_id UUID NOT NULL REFERENCES deporte.horarios (id) ON DELETE CASCADE,
            estudiante_id UUID NOT NULL REFERENCES deporte.usuarios (id) ON DELETE RESTRICT,
            docente_id UUID NOT NULL REFERENCES deporte.usuarios (id) ON DELETE RESTRICT,
            fecha DATE NOT NULL,
            presente BOOLEAN NOT NULL DEFAULT FALSE,
            estado VARCHAR(32),
            fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          INSERT INTO deporte.asistencias_migrada (horario_id, estudiante_id, docente_id, fecha, presente, fecha_registro)
          SELECT a.horario_id, d.estudiante_id, a.docente_id, a.fecha, d.presente, d.fecha_registro
          FROM deporte.asistencias a
          JOIN deporte.asistencia_detalles d ON d.asistencia_id = a.id;

          DROP TABLE deporte.asistencia_detalles CASCADE;
          DROP TABLE deporte.asistencias CASCADE;
          ALTER TABLE deporte.asistencias_migrada RENAME TO asistencias;
        ELSE
          DROP TABLE deporte.asistencias CASCADE;
        END IF;
      END IF;

      -- Si el índice asistencias_unica_por_sesion aún corresponde al formato viejo (horario_id, fecha), eliminarlo
      IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE schemaname = 'deporte' AND tablename = 'asistencias' AND indexname = 'asistencias_unica_por_sesion'
          AND indexdef NOT LIKE '%estudiante_id%'
      ) THEN
        DROP INDEX deporte.asistencias_unica_por_sesion;
      END IF;

      -- Si quedó la tabla obsoleta deporte.asistencia_detalles, limpiarla
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'deporte' AND table_name = 'asistencia_detalles'
      ) THEN
        DROP TABLE deporte.asistencia_detalles CASCADE;
      END IF;
    END $$;
  `);
}

export async function alinearEsquemaDeportePisu(): Promise<void> {
  await alinearEsquemaAsistenciasDeporte();

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
