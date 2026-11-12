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
import type { EstadoInscripcionPisu } from "../constantes.js";

export class InscripcionDeporte extends Model<
  InferAttributes<InscripcionDeporte>,
  InferCreationAttributes<InscripcionDeporte>
> {
  declare id: CreationOptional<string>;
  declare estudiante_id: ForeignKey<string>;
  declare deporte_id: ForeignKey<string>;
  declare fecha_inscripcion: CreationOptional<Date>;
  declare estado: CreationOptional<EstadoInscripcionPisu>;
}

InscripcionDeporte.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    estudiante_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    deporte_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    fecha_inscripcion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    estado: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "Activa",
    },
  },
  {
    sequelize,
    schema: SCHEMAS.deporte,
    tableName: "inscripciones",
    timestamps: false,
  },
);
