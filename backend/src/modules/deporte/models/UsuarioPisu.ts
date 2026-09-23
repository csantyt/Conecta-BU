import {
  DataTypes,
  Model,
  type CreationOptional,
  type InferAttributes,
  type InferCreationAttributes,
} from "sequelize";
import { sequelize } from "../../../config/database.js";
import { SCHEMAS } from "../../../config/schemas.js";
import type { CategoriaPisu, RolPisu } from "../constantes.js";

export class UsuarioPisu extends Model<
  InferAttributes<UsuarioPisu>,
  InferCreationAttributes<UsuarioPisu>
> {
  declare id: CreationOptional<string>;
  declare auth_usuario_id: CreationOptional<string | null>;
  declare nombre: string;
  declare correo: string;
  declare password_hash: CreationOptional<string | null>;
  declare rol: RolPisu;
  declare categoria: CreationOptional<CategoriaPisu | null>;
  declare estado: CreationOptional<boolean>;
  declare fecha_creacion: CreationOptional<Date>;
}

UsuarioPisu.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    auth_usuario_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    nombre: {
      type: DataTypes.STRING(180),
      allowNull: false,
    },
    correo: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    rol: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    categoria: {
      type: DataTypes.STRING(32),
      allowNull: true,
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
    schema: SCHEMAS.deporte,
    tableName: "usuarios",
    timestamps: false,
  },
);
