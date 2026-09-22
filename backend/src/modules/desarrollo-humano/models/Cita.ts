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

export type EstadoCita = "AGENDADA" | "CANCELADA" | "ASISTIO" | "NO_ASISTIO";

export class Cita extends Model<
  InferAttributes<Cita>,
  InferCreationAttributes<Cita>
> {
  declare id: CreationOptional<string>;
  declare usuario_id: string;
  declare servicio_id: ForeignKey<string>;
  declare horario_id: CreationOptional<ForeignKey<string> | null>;
  declare fecha_hora: Date;
  declare estado: CreationOptional<EstadoCita>;
  declare motivo_cancelacion: CreationOptional<string | null>;
  declare notas: CreationOptional<string | null>;
  declare fecha_creacion: CreationOptional<Date>;
  declare fecha_actualizacion: CreationOptional<Date>;
}

Cita.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    servicio_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    horario_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    fecha_hora: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM("AGENDADA", "CANCELADA", "ASISTIO", "NO_ASISTIO"),
      allowNull: false,
      defaultValue: "AGENDADA",
    },
    motivo_cancelacion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    notas: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    fecha_actualizacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    schema: SCHEMAS.desarrolloHumano,
    tableName: "citas",
    timestamps: false,
  },
);
