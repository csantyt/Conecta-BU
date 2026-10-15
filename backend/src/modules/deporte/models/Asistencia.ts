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

export class Asistencia extends Model<
  InferAttributes<Asistencia>,
  InferCreationAttributes<Asistencia>
> {
  declare id: CreationOptional<string>;
  declare horario_id: ForeignKey<string>;
  declare fecha: string;
  declare docente_id: ForeignKey<string>;
  declare fecha_registro: CreationOptional<Date>;
}

Asistencia.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    horario_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    docente_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    fecha_registro: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    schema: SCHEMAS.deporte,
    tableName: "asistencias",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["horario_id", "fecha"],
        name: "asistencias_unica_por_sesion",
      },
    ],
  },
);