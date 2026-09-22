import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../../config/database.js";
import { SCHEMAS } from "../../../config/schemas.js";
import type { RolUsuario } from "../roles.js";

export class Rol extends Model<
  InferAttributes<Rol>,
  InferCreationAttributes<Rol>
> {
  declare codigo: RolUsuario;
  declare nombre: string;
}

Rol.init(
  {
    codigo: {
      type: DataTypes.STRING(32),
      primaryKey: true,
    },
    nombre: {
      type: DataTypes.STRING(80),
      allowNull: false,
    },
  },
  {
    sequelize,
    schema: SCHEMAS.auth,
    tableName: "roles",
    timestamps: false,
  },
);
