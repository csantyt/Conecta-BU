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

export class Horario extends Model<
  InferAttributes<Horario>,
  InferCreationAttributes<Horario>
> {
  declare id: CreationOptional<string>;
  declare servicio_id: ForeignKey<string>;
  declare profesional: CreationOptional<string | null>;
  declare dia_semana: number;
  declare hora_inicio: string;
  declare hora_fin: string;
  declare cupo: CreationOptional<number>;
  declare activo: CreationOptional<boolean>;
}

Horario.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    servicio_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    profesional: {
      type: DataTypes.STRING(150),
      allowNull: true,
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
    cupo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    schema: SCHEMAS.desarrolloHumano,
    tableName: "horarios",
    timestamps: false,
  },
);
