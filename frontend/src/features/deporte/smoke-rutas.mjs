/**
 * Smoke test de navegación del módulo Deporte PISU.
 *
 * ¿Para qué sirve?
 * Recorre, para cada rol, TODAS las pantallas declaradas en el menú y comprueba
 * que el contrato de rutas (`rutas.ts`) es coherente:
 *   - la pantalla de inicio de cada rol es válida (no hay bucle de redirección);
 *   - cada ítem del menú corresponde a una vista válida de ese rol;
 *   - el hash de la URL va y vuelve sin perderse (F5 restaura la pantalla);
 *   - una vista desconocida NO es válida (se muestra la pantalla 404 por rol);
 *   - `construirVista`/`parseVista` conservan los parámetros.
 *
 * ¿Cómo se ejecuta?
 *   node src/features/deporte/smoke-rutas.mjs
 * Sale con código 1 y un mensaje claro si algo falla.
 *
 * ¿Cómo se relaciona con los demás?
 * Reutiliza el transpilador de TypeScript (ya es dependencia del frontend) para
 * leer `rutas.ts` y `menus.ts` sin necesidad de un framework de pruebas.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const aqui = dirname(fileURLToPath(import.meta.url));
const temporales = mkdtempSync(join(tmpdir(), "pisu-smoke-"));

/** Transpila un `.ts` a un `.mjs` temporal y lo importa. */
async function cargarModulo(nombreArchivo) {
  const fuente = readFileSync(join(aqui, nombreArchivo), "utf8");
  const salida = ts.transpileModule(fuente, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      verbatimModuleSyntax: false,
    },
    fileName: nombreArchivo,
  }).outputText;
  const destino = join(temporales, `${nombreArchivo.replace(/\.ts$/, "")}.mjs`);
  writeFileSync(destino, salida, "utf8");
  return import(pathToFileURL(destino).href);
}

const fallos = [];
function afirmar(condicion, mensaje) {
  if (!condicion) fallos.push(mensaje);
}

try {
  const rutas = await cargarModulo("rutas.ts");
  const menus = await cargarModulo("menus.ts");

  const roles = ["Administrador", "Docente", "Estudiante"];

  for (const rol of roles) {
    const inicio = rutas.homeDeRol(rol);
    afirmar(
      rutas.vistaValida(rol, inicio),
      `El inicio del rol ${rol} ("${inicio}") no es una vista válida (posible bucle de redirección).`,
    );
    // El hash de ida y vuelta conserva la vista (recarga sin perder la pantalla).
    const vuelta = rutas.vistaDeHash(rutas.hashDeVista(rol, inicio));
    afirmar(
      vuelta && vuelta.rol === rol && vuelta.view === inicio,
      `El hash del inicio del rol ${rol} no vuelve correctamente.`,
    );

    // Todos los ítems del menú del rol deben ser vistas válidas.
    const grupos = menus.menuPorRol(rol);
    afirmar(grupos.length > 0, `El rol ${rol} no tiene ningún grupo de menú.`);
    for (const grupo of grupos) {
      for (const item of grupo.items) {
        afirmar(
          rutas.vistaValida(rol, item.key),
          `La pantalla "${item.label}" (${item.key}) del rol ${rol} no es válida.`,
        );
        const ida = rutas.vistaDeHash(rutas.hashDeVista(rol, item.key));
        afirmar(
          ida && ida.view === item.key,
          `La pantalla "${item.key}" del rol ${rol} no sobrevive a la recarga.`,
        );
      }
    }

    // Una ruta inexistente debe caer en la pantalla 404 (no ser válida).
    afirmar(
      !rutas.vistaValida(rol, "seccion-inexistente"),
      `La vista inexistente debería inválida para ${rol} y mostrar el 404.`,
    );
  }

  // Aislamiento entre roles: una vista de administrador no es válida para estudiante.
  afirmar(
    !rutas.vistaValida("Estudiante", "panel"),
    "El estudiante no debería poder abrir el panel del administrador.",
  );
  afirmar(
    rutas.vistaValida("Docente", "eventos") &&
      rutas.vistaValida("Estudiante", "eventos") &&
      rutas.vistaValida("Administrador", "eventos"),
    "La vista de eventos debería existir para los tres roles.",
  );

  // Parámetros de ruta (p. ej. llamar a lista con horario y fecha).
  const conParametros = rutas.construirVista("lista", "horario-1", "2026-01-01");
  afirmar(
    conParametros === "lista:horario-1:2026-01-01",
    `construirVista no armó la vista esperada: ${conParametros}`,
  );
  const parseada = rutas.parseVista(conParametros);
  afirmar(
    parseada.base === "lista" && parseada.params[0] === "horario-1" && parseada.params[1] === "2026-01-01",
    "parseVista no recuperó los parámetros.",
  );
  const idaParametros = rutas.vistaDeHash(rutas.hashDeVista("Docente", conParametros));
  afirmar(
    idaParametros && idaParametros.view === conParametros,
    "La vista con parámetros no sobrevive a la recarga.",
  );
} finally {
  rmSync(temporales, { recursive: true, force: true });
}

if (fallos.length > 0) {
  console.error("Smoke de rutas Deporte PISU: FALLÓ");
  for (const fallo of fallos) console.error(`  ✗ ${fallo}`);
  process.exit(1);
}

console.log("Smoke de rutas Deporte PISU: OK (3 roles, todas las pantallas válidas).");
