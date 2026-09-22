-- =============================================================================
-- Conecta BU — script inicial PostgreSQL
-- Identidad en schema auth. Cada módulo de Bienestar tiene schema propio.
-- Roles de la aplicación: USUARIO y ADMINISTRADOR.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS desarrollo_humano;
CREATE SCHEMA IF NOT EXISTS permanencia_estudiantil;
CREATE SCHEMA IF NOT EXISTS salud_integral;
CREATE SCHEMA IF NOT EXISTS deporte;
CREATE SCHEMA IF NOT EXISTS cultura;

-- -----------------------------------------------------------------------------
-- Identidad compartida (no pertenece a un módulo de Bienestar)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS auth.roles (
  codigo VARCHAR(32) PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL
);

INSERT INTO auth.roles (codigo, nombre) VALUES
  ('USUARIO', 'Usuario'),
  ('ADMINISTRADOR', 'Administrador')
ON CONFLICT (codigo) DO NOTHING;

CREATE TABLE IF NOT EXISTS auth.usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  nombre_completo VARCHAR(255),
  rol VARCHAR(32) NOT NULL DEFAULT 'USUARIO'
    REFERENCES auth.roles (codigo),
  estado BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Módulo 1 (esta fase): Desarrollo humano y orientación
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS desarrollo_humano.servicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS desarrollo_humano.horarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  servicio_id UUID NOT NULL REFERENCES desarrollo_humano.servicios (id) ON DELETE CASCADE,
  profesional VARCHAR(150),
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  cupo INTEGER NOT NULL DEFAULT 1 CHECK (cupo > 0),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT horarios_rango_chk CHECK (hora_fin > hora_inicio)
);

CREATE TABLE IF NOT EXISTS desarrollo_humano.citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL,
  servicio_id UUID NOT NULL REFERENCES desarrollo_humano.servicios (id),
  horario_id UUID REFERENCES desarrollo_humano.horarios (id),
  fecha_hora TIMESTAMPTZ NOT NULL,
  estado VARCHAR(32) NOT NULL DEFAULT 'AGENDADA'
    CHECK (estado IN ('AGENDADA', 'CANCELADA', 'ASISTIO', 'NO_ASISTIO')),
  motivo_cancelacion TEXT,
  notas TEXT,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS citas_usuario_idx
  ON desarrollo_humano.citas (usuario_id);
CREATE INDEX IF NOT EXISTS citas_fecha_idx
  ON desarrollo_humano.citas (fecha_hora);

CREATE TABLE IF NOT EXISTS desarrollo_humano.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(180) NOT NULL,
  descripcion TEXT,
  fecha_inicio TIMESTAMPTZ NOT NULL,
  fecha_fin TIMESTAMPTZ,
  fecha_limite_inscripcion TIMESTAMPTZ,
  cupo_total INTEGER NOT NULL CHECK (cupo_total >= 1),
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT eventos_rango_chk CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
  CONSTRAINT eventos_limite_chk CHECK (
    fecha_limite_inscripcion IS NULL OR fecha_limite_inscripcion <= fecha_inicio
  )
);

CREATE TABLE IF NOT EXISTS desarrollo_humano.inscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_id UUID NOT NULL REFERENCES desarrollo_humano.eventos (id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL,
  estado VARCHAR(32) NOT NULL DEFAULT 'INSCRITO'
    CHECK (estado IN ('INSCRITO', 'CANCELADO')),
  asistencia VARCHAR(32)
    CHECK (asistencia IS NULL OR asistencia IN ('ASISTIO', 'NO_ASISTIO')),
  fecha_inscripcion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (evento_id, usuario_id)
);

-- -----------------------------------------------------------------------------
-- Módulos 2-5: esquemas vacíos a propósito.
-- Cuando se implementen, sus tablas nacen DENTRO de su schema
-- (ej. deporte.eventos), sin alterar desarrollo_humano ni auth.
-- usuario_id se guarda como UUID, sin FK cruzada entre módulos.
-- -----------------------------------------------------------------------------
