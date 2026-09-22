import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../../config/database.js";
import { SCHEMAS } from "../../../config/schemas.js";

export class Evento extends Model<
  InferAttributes<Evento>,
  InferCreationAttributes<Evento>
> {
  declare id: CreationOptional<string>;
  declare titulo: string;
  declare descripcion: CreationOptional<string | null>;
  declare fecha_inicio: Date;
  declare fecha_fin: CreationOptional<Date | null>;
  declare cupo_total: number;
  declare activo: CreationOptional<boolean>;
  declare fecha_creacion: CreationOptional<Date>;
}

Evento.init(
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
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fecha_inicio: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    fecha_fin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cupo_total: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    tableName: "eventos",
    timestamps: false,
  },
);
