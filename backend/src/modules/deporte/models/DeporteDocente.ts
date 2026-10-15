/**
 * Modelo `deporte.deportes_docentes` (tabla puente docente ↔ deporte).
 *
 * ¿Para qué sirve?
 * Registra la asignación DIRECTA que hace un administrador: "este docente tiene
 * este deporte". Así el panel del docente muestra el deporte aunque todavía no
 * se haya publicado ningún horario (regla solicitada por el negocio).
 *
 * ¿Cómo se relaciona con los demás?
 * - `Deporte` y `UsuarioPisu` se asocian con esta tabla en `models/index.ts`.
 * - `docenteService.listarMisDeportes` y `asegurarDeporteDelDocente` la usan.
 * - Las clases y la asistencia siguen dependiendo de `deporte.horarios`.
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

export class DeporteDocente extends Model<
  InferAttributes<DeporteDocente>,
  InferCreationAttributes<DeporteDocente>
> {
  declare id: CreationOptional<string>;
  declare deporte_id: ForeignKey<string>;
  declare docente_id: ForeignKey<string>;
  declare fecha_asignacion: CreationOptional<Date>;
}

DeporteDocente.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    deporte_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    docente_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    fecha_asignacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    schema: SCHEMAS.deporte,
    tableName: "deportes_docentes",
    timestamps: false,
    indexes: [{ unique: true, fields: ["deporte_id", "docente_id"] }],
  },
);
