import "dotenv/config";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
  dialectOptions:
    process.env.SUPABASE_SSL === "true"
      ? { ssl: { require: true, rejectUnauthorized: false } }
      : {},
});
const email = "demo@uniautonoma.edu.co";

await sequelize.query(
  `INSERT INTO conecta_auth.usuarios (id, email, nombre_completo, rol, estado, fecha_creacion)
   VALUES (:id, :email, 'Usuario Demo', 'ADMINISTRADOR', true, NOW())
   ON CONFLICT (email) DO UPDATE SET rol = 'ADMINISTRADOR', estado = true`,
  { replacements: { id: randomUUID(), email } },
);
const [u] = await sequelize.query(
  `SELECT id, email, nombre_completo, rol, estado FROM conecta_auth.usuarios WHERE email = :email`,
  { replacements: { email }, type: "SELECT" },
);
const token = jwt.sign({ id: u.id, email: u.email, rol: u.rol }, process.env.JWT_SECRET, { expiresIn: "8h" });
await sequelize.close();

console.log("\nPega esto en la consola del navegador (F12 > Console) y recarga:\n");
console.log(`localStorage.setItem("token", ${JSON.stringify(token)});`);
console.log(`localStorage.setItem("usuario", ${JSON.stringify(JSON.stringify(u))});`);