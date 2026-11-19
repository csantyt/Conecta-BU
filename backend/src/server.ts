import "dotenv/config";
import app from "./app.js";
import {
  alinearEsquemaDeportePisu,
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
import "./modules/deporte/models/index.js";
import { sembrarServiciosDesarrolloHumano } from "./modules/desarrollo-humano/seed.js";
import { sembrarDeportesPisu } from "./modules/deporte/seed.js";

const PORT = Number(process.env["PORT"] ?? 3000);

async function iniciarServidor(): Promise<void> {
  try {
    await probarConexion();
    console.log("Conexión a PostgreSQL establecida correctamente.");

    await asegurarEsquemasIndependientes();
    await alinearEsquemaDeportePisu();

    // sequelize.sync() puede fallar en Supabase para tablas del schema 'auth'
    // (reservado por Supabase Auth). Lo envolvemos en try-catch para no bloquear el arranque.
    try {
      await sequelize.sync();
    } catch (syncError) {
      console.warn("⚠️  sequelize.sync() falló (posiblemente tablas de auth reservadas en Supabase):", (syncError as Error).message);
    }

    await alinearEsquemaEventos();

    // alinearRolesUsuarios y sembrarRoles tocan el schema 'auth' (reservado en Supabase).
    // Los envolvemos en try-catch para no bloquear el arranque en Supabase.
    try {
      await alinearRolesUsuarios();
    } catch (rolesError) {
      console.warn("⚠️  alinearRolesUsuarios() falló (schema auth reservado en Supabase):", (rolesError as Error).message);
    }

    try {
      await sembrarRoles();
    } catch (seedRolesError) {
      console.warn("⚠️  sembrarRoles() falló (schema auth reservado en Supabase):", (seedRolesError as Error).message);
    }

    await sembrarServiciosDesarrolloHumano();
    await sembrarDeportesPisu();
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
