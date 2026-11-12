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

export class InscripcionEvento extends Model<
  InferAttributes<InscripcionEvento>,
  InferCreationAttributes<InscripcionEvento>
> {
  declare id: CreationOptional<string>;
  declare evento_id: ForeignKey<string>;
  declare estudiante_id: ForeignKey<string>;
  declare fecha_inscripcion: CreationOptional<Date>;
  declare estado: CreationOptional<EstadoInscripcionPisu>;
}

InscripcionEvento.init(
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
    estudiante_id: {
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
    tableName: "inscripciones_eventos",
    timestamps: false,
  },
);
