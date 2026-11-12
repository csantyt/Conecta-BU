import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../../config/database.js";
import { SCHEMAS } from "../../../config/schemas.js";
import type { AudienciaAlertaPisu } from "../constantes.js";

export class Alerta extends Model<
  InferAttributes<Alerta>,
  InferCreationAttributes<Alerta>
> {
  declare id: CreationOptional<string>;
  declare titulo: string;
  declare mensaje: string;
  declare audiencia: AudienciaAlertaPisu;
  declare estudiante_id: CreationOptional<string | null>;
  declare clave: CreationOptional<string | null>;
  declare fecha_creacion: CreationOptional<Date>;
}

Alerta.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    titulo: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    mensaje: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    audiencia: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    estudiante_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    clave: {
      type: DataTypes.STRING(200),
      allowNull: true,
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
    tableName: "alertas",
    timestamps: false,
  },
);
