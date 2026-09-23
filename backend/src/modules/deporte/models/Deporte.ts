import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../../config/database.js";
import { SCHEMAS } from "../../../config/schemas.js";
import type { CategoriaPisu } from "../constantes.js";

export class Deporte extends Model<
  InferAttributes<Deporte>,
  InferCreationAttributes<Deporte>
> {
  declare id: CreationOptional<string>;
  declare nombre: string;
  declare descripcion: CreationOptional<string | null>;
  declare cupo_maximo: number;
  declare categorias_permitidas: CreationOptional<CategoriaPisu[]>;
  declare estado: CreationOptional<boolean>;
  declare fecha_creacion: CreationOptional<Date>;
}

Deporte.init(
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
    cupo_maximo: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    categorias_permitidas: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: ["Pregrado", "Postgrado", "Egresado"],
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
    tableName: "deportes",
    timestamps: false,
  },
);
