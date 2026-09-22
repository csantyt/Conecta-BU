import "dotenv/config";
import { Sequelize } from "sequelize";

const databaseUrl = process.env["DATABASE_URL"];

if (!databaseUrl) {
  throw new Error("La variable de entorno DATABASE_URL es obligatoria.");
}

export const sequelize = new Sequelize(databaseUrl, {
  dialect: "postgres",
  logging: false,
  define: {
    underscored: true,
  },
});

export async function probarConexion(): Promise<void> {
  await sequelize.authenticate();
}
