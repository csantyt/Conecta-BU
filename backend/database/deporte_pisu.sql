-- =============================================================================
-- Conecta BU — Módulo Deportes PISU
-- Schema: deporte (independiente de auth y de desarrollo_humano)
--
-- Identidad de PISU vive AQUÍ (roles Administrador / Docente / Estudiante).
-- auth.usuario_id es un puente opcional hacia el login Google de Conecta BU,
-- sin FK cruzada entre schemas (regla de arquitectura modular).
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS deporte;

-- -----------------------------------------------------------------------------
-- usuarios
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deporte.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_usuario_id UUID,
  nombre VARCHAR(180) NOT NULL,
  correo VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  rol VARCHAR(32) NOT NULL
    CHECK (rol IN ('Administrador', 'Docente', 'Estudiante')),
  categoria VARCHAR(32)
    CHECK (categoria IS NULL OR categoria IN ('Pregrado', 'Postgrado', 'Egresado')),
  estado BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT usuarios_correo_institucional_chk
    CHECK (correo ~* '@uniautonoma\.edu\.co$'),
  CONSTRAINT usuarios_categoria_estudiante_chk
    CHECK (
      (rol = 'Estudiante' AND categoria IS NOT NULL)
      OR (rol IN ('Administrador', 'Docente'))
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_correo_unico
  ON deporte.usuarios (lower(correo));
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_auth_id_unico
  ON deporte.usuarios (auth_usuario_id)
  WHERE auth_usuario_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS usuarios_rol_idx
  ON deporte.usuarios (rol);
CREATE INDEX IF NOT EXISTS usuarios_estado_idx
  ON deporte.usuarios (estado);

-- -----------------------------------------------------------------------------
-- deportes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deporte.deportes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  cupo_maximo INTEGER NOT NULL CHECK (cupo_maximo >= 1),
  categorias_permitidas TEXT[] NOT NULL DEFAULT ARRAY['Pregrado', 'Postgrado', 'Egresado']::TEXT[],
  estado BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT deportes_categorias_chk CHECK (
    categorias_permitidas <@ ARRAY['Pregrado', 'Postgrado', 'Egresado']::TEXT[]
    AND cardinality(categorias_permitidas) >= 1
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS deportes_nombre_unico
  ON deporte.deportes (lower(trim(nombre)));
CREATE INDEX IF NOT EXISTS deportes_estado_idx
  ON deporte.deportes (estado);
CREATE INDEX IF NOT EXISTS deportes_categorias_gin
  ON deporte.deportes USING GIN (categorias_permitidas);

-- -----------------------------------------------------------------------------
-- eventos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deporte.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(180) NOT NULL,
  descripcion TEXT,
  fecha TIMESTAMPTZ NOT NULL,
  lugar VARCHAR(180) NOT NULL,
  cupo_maximo INTEGER NOT NULL CHECK (cupo_maximo >= 1),
  estado BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS eventos_fecha_idx
  ON deporte.eventos (fecha);
CREATE INDEX IF NOT EXISTS eventos_estado_idx
  ON deporte.eventos (estado);

-- -----------------------------------------------------------------------------
-- horarios
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deporte.horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deporte_id UUID NOT NULL REFERENCES deporte.deportes (id) ON DELETE RESTRICT,
  docente_id UUID NOT NULL REFERENCES deporte.usuarios (id) ON DELETE RESTRICT,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  lugar VARCHAR(180) NOT NULL,
  estado BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT horarios_rango_chk CHECK (hora_fin > hora_inicio)
);

CREATE INDEX IF NOT EXISTS horarios_deporte_idx
  ON deporte.horarios (deporte_id);
CREATE INDEX IF NOT EXISTS horarios_docente_idx
  ON deporte.horarios (docente_id);
CREATE INDEX IF NOT EXISTS horarios_dia_idx
  ON deporte.horarios (dia_semana, hora_inicio);

-- -----------------------------------------------------------------------------
-- inscripciones (estudiante ↔ deporte)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deporte.inscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id UUID NOT NULL REFERENCES deporte.usuarios (id) ON DELETE RESTRICT,
  deporte_id UUID NOT NULL REFERENCES deporte.deportes (id) ON DELETE RESTRICT,
  fecha_inscripcion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  estado VARCHAR(32) NOT NULL DEFAULT 'Activa'
    CHECK (estado IN ('Activa', 'Cancelada'))
);

CREATE INDEX IF NOT EXISTS inscripciones_estudiante_idx
  ON deporte.inscripciones (estudiante_id);
CREATE INDEX IF NOT EXISTS inscripciones_deporte_idx
  ON deporte.inscripciones (deporte_id);
CREATE UNIQUE INDEX IF NOT EXISTS inscripciones_activa_unica
  ON deporte.inscripciones (estudiante_id, deporte_id)
  WHERE estado = 'Activa';

-- -----------------------------------------------------------------------------
-- asistencias
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deporte.asistencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  horario_id UUID NOT NULL REFERENCES deporte.horarios (id) ON DELETE CASCADE,
  estudiante_id UUID NOT NULL REFERENCES deporte.usuarios (id) ON DELETE RESTRICT,
  docente_id UUID NOT NULL REFERENCES deporte.usuarios (id) ON DELETE RESTRICT,
  fecha DATE NOT NULL,
  presente BOOLEAN NOT NULL DEFAULT FALSE,
  fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS asistencias_unica_por_sesion
  ON deporte.asistencias (horario_id, estudiante_id, fecha);
CREATE INDEX IF NOT EXISTS asistencias_estudiante_idx
  ON deporte.asistencias (estudiante_id, fecha);
CREATE INDEX IF NOT EXISTS asistencias_docente_idx
  ON deporte.asistencias (docente_id, fecha);

-- -----------------------------------------------------------------------------
-- alertas
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deporte.alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(180) NOT NULL,
  mensaje TEXT NOT NULL,
  audiencia VARCHAR(32) NOT NULL
    CHECK (audiencia IN ('Todos', 'Docentes', 'Estudiantes')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS alertas_audiencia_idx
  ON deporte.alertas (audiencia);
CREATE INDEX IF NOT EXISTS alertas_fecha_idx
  ON deporte.alertas (fecha_creacion DESC);
