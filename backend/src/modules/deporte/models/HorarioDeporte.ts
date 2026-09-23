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

export class HorarioDeporte extends Model<
  InferAttributes<HorarioDeporte>,
  InferCreationAttributes<HorarioDeporte>
> {
  declare id: CreationOptional<string>;
  declare deporte_id: ForeignKey<string>;
  declare docente_id: ForeignKey<string>;
  declare dia_semana: number;
  declare hora_inicio: string;
  declare hora_fin: string;
  declare lugar: string;
  declare estado: CreationOptional<boolean>;
}

HorarioDeporte.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    deporte_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    docente_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    dia_semana: {
      type: DataTypes.SMALLINT,
      allowNull: false,
    },
    hora_inicio: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    hora_fin: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    lugar: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    schema: SCHEMAS.deporte,
    tableName: "horarios",
    timestamps: false,
  },
);
