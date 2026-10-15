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

export class AsistenciaDetalle extends Model<
  InferAttributes<AsistenciaDetalle>,
  InferCreationAttributes<AsistenciaDetalle>
> {
  declare id: CreationOptional<string>;
  declare asistencia_id: ForeignKey<string>;
  declare estudiante_id: ForeignKey<string>;
  declare presente: CreationOptional<boolean>;
  declare fecha_registro: CreationOptional<Date>;
}

AsistenciaDetalle.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    asistencia_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    estudiante_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    presente: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
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
    tableName: "asistencia_detalles",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["asistencia_id", "estudiante_id"],
        name: "asistencia_detalles_unica_por_estudiante",
      },
    ],
  },
);