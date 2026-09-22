import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../../config/database.js";
import { SCHEMAS } from "../../../config/schemas.js";
import type { RolUsuario } from "../roles.js";

export type { RolUsuario } from "../roles.js";

export class Usuario extends Model<
  InferAttributes<Usuario>,
  InferCreationAttributes<Usuario>
> {
  declare id: CreationOptional<string>;
  declare email: string;
  declare nombre_completo: CreationOptional<string | null>;
  declare rol: CreationOptional<RolUsuario>;
  declare estado: CreationOptional<boolean>;
  declare fecha_creacion: CreationOptional<Date>;
}

Usuario.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    nombre_completo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rol: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "USUARIO",
    },
    estado: {
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
    schema: SCHEMAS.auth,
    tableName: "usuarios",
    timestamps: false,
  },
);
