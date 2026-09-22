import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../../config/database.js";
import { SCHEMAS } from "../../../config/schemas.js";

export class Servicio extends Model<
  InferAttributes<Servicio>,
  InferCreationAttributes<Servicio>
> {
  declare id: CreationOptional<string>;
  declare nombre: string;
  declare descripcion: CreationOptional<string | null>;
  declare activo: CreationOptional<boolean>;
  declare fecha_creacion: CreationOptional<Date>;
}

Servicio.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    activo: {
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
    schema: SCHEMAS.desarrolloHumano,
    tableName: "servicios",
    timestamps: false,
  },
);
