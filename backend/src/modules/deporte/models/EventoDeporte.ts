/**
 * Modelo `EventoDeporte` (tabla `deporte.eventos`).
 *
 * ¿Para qué sirve?
 * Representa un evento deportivo: puede haberlo creado un administrador
 * (compatibilidad con el módulo original) o un docente (torneos, masterclass,
 * amistosos, jornadas de práctica). Cuando lo crea un docente queda ligado a uno
 * de SUS deportes (`deporte_id`) y a su usuario (`creado_por_id`).
 *
 * ¿Cómo se relaciona con los demás?
 * - `Deporte` 1—N `EventoDeporte` por `deporte_id` (un evento pertenece a un deporte).
 * - `UsuarioPisu` 1—N `EventoDeporte` por `creado_por_id` (quién lo creó).
 * - `InscripcionEvento` N—1 `EventoDeporte` (estudiantes inscritos).
 *
 * Nota de compatibilidad: la columna booleana `estado` se conserva porque el panel
 * de administración la usa como bandera de "activo"; el ciclo de vida publicado /
 * cancelado se guarda en `estado_evento`.
 */

import {
  DataTypes,
  Model,
  type CreationOptional,
  type ForeignKey,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../../config/database.js";
import { SCHEMAS } from "../../../config/schemas.js";
import type { CategoriaPisu, EstadoEventoPisu } from "../constantes.js";

export class EventoDeporte extends Model<
  InferAttributes<EventoDeporte>,
  InferCreationAttributes<EventoDeporte>
> {
  declare id: CreationOptional<string>;
  declare nombre: string;
  declare descripcion: CreationOptional<string | null>;
  declare tipo: CreationOptional<string>;
  declare fecha: Date;
  declare hora_inicio: CreationOptional<string | null>;
  declare hora_fin: CreationOptional<string | null>;
  declare lugar: string;
  declare cupo_maximo: number;
  declare fecha_limite_inscripcion: CreationOptional<Date | null>;
  declare categorias_permitidas: CreationOptional<CategoriaPisu[] | null>;
  declare estado_evento: CreationOptional<EstadoEventoPisu>;
  declare motivo_cancelacion: CreationOptional<string | null>;
  declare deporte_id: CreationOptional<ForeignKey<string> | null>;
  declare creado_por_id: CreationOptional<ForeignKey<string> | null>;
  declare estado: CreationOptional<boolean>;
  declare fecha_creacion: CreationOptional<Date>;
}

EventoDeporte.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tipo: {
      type: DataTypes.STRING(80),
      allowNull: false,
      defaultValue: "General",
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    // Hora de inicio/fin del evento (formato "HH:MM"). Opcionales para no romper
    // los eventos creados por el administrador antes de esta funcionalidad.
    hora_inicio: {
      type: DataTypes.STRING(5),
      allowNull: true,
    },
    hora_fin: {
      type: DataTypes.STRING(5),
      allowNull: true,
    },
    lugar: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    cupo_maximo: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // Fecha y hora límite para inscribirse; debe ser anterior al inicio del evento.
    fecha_limite_inscripcion: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // Categorías habilitadas. `null` significa "todas las del deporte".
    categorias_permitidas: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    estado_evento: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "publicado",
    },
    motivo_cancelacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    deporte_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    creado_por_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    schema: SCHEMAS.deporte,
    tableName: "eventos",
    timestamps: false,
  },
);
