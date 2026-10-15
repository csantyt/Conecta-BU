<<<<<<< HEAD
﻿import "dotenv/config";
=======
import "dotenv/config";
>>>>>>> 663248a4848ed69e41e2955a46aec5e172d2cd5f
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "postgres",
  logging: false,
});
const email = "demo@uniautonoma.edu.co";

await sequelize.query(
  `INSERT INTO auth.usuarios (id, email, nombre_completo, rol, estado, fecha_creacion)
   VALUES (:id, :email, 'Usuario Demo', 'ADMINISTRADOR', true, NOW())
   ON CONFLICT (email) DO UPDATE SET rol = 'ADMINISTRADOR', estado = true`,
  { replacements: { id: randomUUID(), email } },
);
const [u] = await sequelize.query(
  `SELECT id, email, nombre_completo, rol, estado FROM auth.usuarios WHERE email = :email`,
  { replacements: { email }, type: "SELECT" },
);
const token = jwt.sign({ id: u.id, email: u.email, rol: u.rol }, process.env.JWT_SECRET, { expiresIn: "8h" });
await sequelize.close();

console.log("\nPega esto en la consola del navegador (F12 > Console) y recarga:\n");
console.log(`localStorage.setItem("token", ${JSON.stringify(token)});`);
<<<<<<< HEAD
console.log(`localStorage.setItem("usuario", ${JSON.stringify(JSON.stringify(u))});`);
=======
console.log(`localStorage.setItem("usuario", ${JSON.stringify(JSON.stringify(u))});`);
>>>>>>> 663248a4848ed69e41e2955a46aec5e172d2cd5f
