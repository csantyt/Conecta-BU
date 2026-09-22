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

export type EstadoInscripcion = "INSCRITO" | "CANCELADO";

export class Inscripcion extends Model<
  InferAttributes<Inscripcion>,
  InferCreationAttributes<Inscripcion>
> {
  declare id: CreationOptional<string>;
  declare evento_id: ForeignKey<string>;
  declare usuario_id: string;
  declare estado: CreationOptional<EstadoInscripcion>;
  declare asistencia: CreationOptional<"ASISTIO" | "NO_ASISTIO" | null>;
  declare fecha_inscripcion: CreationOptional<Date>;
}

Inscripcion.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    evento_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM("INSCRITO", "CANCELADO"),
      allowNull: false,
      defaultValue: "INSCRITO",
    },
    asistencia: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    fecha_inscripcion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    schema: SCHEMAS.desarrolloHumano,
    tableName: "inscripciones",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["evento_id", "usuario_id"],
      },
    ],
  },
);
