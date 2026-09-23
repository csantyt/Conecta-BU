import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../../config/database.js";
import { SCHEMAS } from "../../../config/schemas.js";

export class EventoDeporte extends Model<
  InferAttributes<EventoDeporte>,
  InferCreationAttributes<EventoDeporte>
> {
  declare id: CreationOptional<string>;
  declare nombre: string;
  declare descripcion: CreationOptional<string | null>;
  declare fecha: Date;
  declare lugar: string;
  declare cupo_maximo: number;
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
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    lugar: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    cupo_maximo: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
