import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../../config/database.js";
import { SCHEMAS } from "../../../config/schemas.js";

export class Comunicado extends Model<
  InferAttributes<Comunicado>,
  InferCreationAttributes<Comunicado>
> {
  declare id: CreationOptional<string>;
  declare titulo: string;
  declare mensaje: string;
  declare audiencia: "Todos" | "Docentes" | "Estudiantes";
  declare fecha_creacion: CreationOptional<Date>;
}

Comunicado.init(
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
      defaultValue: "Todos",
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
    tableName: "comunicados",
    timestamps: false,
  },
);