import "dotenv/config";
import {
  alinearEsquemaDeportePisu,
  alinearEsquemaEventos,
  alinearRolesUsuarios,
  asegurarEsquemasIndependientes,
  probarConexion,
} from "../src/config/database.js";

await probarConexion();
await asegurarEsquemasIndependientes();
await alinearEsquemaDeportePisu();
await alinearEsquemaEventos();
await alinearRolesUsuarios();
