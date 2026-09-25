import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../../config/database.js";
import { SCHEMAS } from "../../../config/schemas.js";

export class ConsultaIa extends Model<
  InferAttributes<ConsultaIa>,
  InferCreationAttributes<ConsultaIa>
> {
  declare id: CreationOptional<string>;
  declare usuario_id: string;
  declare consulta_clinica: CreationOptional<boolean>;
  declare fuente: CreationOptional<"n8n" | "local">;
  declare fecha_creacion: CreationOptional<Date>;
}

ConsultaIa.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    usuario_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    consulta_clinica: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    fuente: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "local",
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
    tableName: "consultas_ia",
    timestamps: false,
  },
);
