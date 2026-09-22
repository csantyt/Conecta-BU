import "dotenv/config";
import app from "./app.js";
import {
  alinearEsquemaEventos,
  alinearRolesUsuarios,
  asegurarEsquemasIndependientes,
  probarConexion,
  sequelize,
} from "./config/database.js";
import { sembrarRoles } from "./modules/auth/seed.js";
import "./modules/auth/models/Rol.js";
import "./modules/auth/models/Usuario.js";
import "./modules/desarrollo-humano/models/index.js";
import { sembrarServiciosDesarrolloHumano } from "./modules/desarrollo-humano/seed.js";

const PORT = Number(process.env["PORT"] ?? 3000);

async function iniciarServidor(): Promise<void> {
  try {
    await probarConexion();
    console.log("Conexión a PostgreSQL establecida correctamente.");

    await asegurarEsquemasIndependientes();
    await sequelize.sync();
    await alinearEsquemaEventos();
    await alinearRolesUsuarios();
    await sembrarRoles();
    await sembrarServiciosDesarrolloHumano();
    console.log("Esquemas por módulo listos y modelos sincronizados.");

    app.listen(PORT, () => {
      console.log(`Servidor Conecta BU escuchando en el puerto ${PORT}`);
    });
  } catch (error) {
    console.error("No fue posible iniciar el servidor:", error);
    process.exit(1);
  }
}

void iniciarServidor();
