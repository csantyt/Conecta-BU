import "dotenv/config";
import app from "./app.js";
import { probarConexion, sequelize } from "./config/database.js";
import "./modules/auth/models/Usuario.js";

const PORT = Number(process.env["PORT"] ?? 3000);

async function iniciarServidor(): Promise<void> {
  try {
    await probarConexion();
    console.log("Conexión a PostgreSQL establecida correctamente.");

    await sequelize.sync();
    console.log("Modelos sincronizados con la base de datos.");

    app.listen(PORT, () => {
      console.log(`Servidor Conecta BU escuchando en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error("No fue posible iniciar el servidor:", error);
    process.exit(1);
  }
}

void iniciarServidor();
