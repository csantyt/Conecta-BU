# Bitácora de avances — Conecta BU

Registro de lo que se subió a GitHub en cada commit de `main`, para que un colaborador nuevo entienda el orden del trabajo y no rehacer lo ya resuelto.

Repositorio: https://github.com/csantyt/Conecta-BU

## Tecnologías de fondo (todo el proyecto)

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4, Axios
- **Backend:** Node.js, Express 5, TypeScript, Zod, Sequelize 6, PostgreSQL (un schema por módulo)
- **Identidad:** Google OIDC (`id_token`) + JWT Bearer 8 h. Dominio `uniautonoma.edu.co`
- **IA:** n8n (webhooks) con respuesta local de respaldo. Regla RN-011: sin diagnóstico clínico
- **Herramientas de trabajo:** Git, GitHub, PostgreSQL, n8n, consola de Google Cloud (OAuth)

---

## Avance 1 — Base de la aplicación

**Commit:** [`48062d7`](https://github.com/csantyt/Conecta-BU/commit/48062d7)  
**Mensaje:** *Agrega el backend de Conecta BU, la autenticación del frontend y los módulos de Bienestar.*

**Qué se hizo.** Se creó el esqueleto de Conecta BU: API en Express, login con Google, SPA en Vite/React y los cinco módulos de Bienestar visibles en la home (solo como catálogo).

**Qué se subió.**

- `backend/` con Express, TypeScript, Sequelize, conexión PostgreSQL, JWT y Google
- `frontend/` con Vite, React, Tailwind, pantalla de login y home
- Placeholders de Permanencia, Salud integral, Deporte y Cultura
- Identidad en schema `auth`

**Para continuar.** No reemplazar el login. Los módulos nuevos se enganchan al JWT y a `USUARIO` / `ADMINISTRADOR`.

---

## Avance 2 — Módulo DH y esquemas independientes

**Commit:** [`3d1282a`](https://github.com/csantyt/Conecta-BU/commit/3d1282a)  
**Mensaje:** *Agrega el módulo de Desarrollo humano, esquemas independientes y el catálogo de roles.*

**Qué se hizo.** Desarrollo humano dejó de ser un placeholder: schema propio, modelos y semilla de servicios. Cada módulo de Bienestar tiene schema PostgreSQL para no compartir tablas.

**Qué se subió.**

- Schemas `desarrollo_humano`, `permanencia_estudiantil`, `salud_integral`, `deporte`, `cultura`
- Modelos Servicio / Horario / Cita y `backend/database/init.sql`
- Roles de aplicación `USUARIO` y `ADMINISTRADOR` (el RF Estudiante = `USUARIO`)
- [docs/arquitectura-modular.md](arquitectura-modular.md)

**Para continuar.** Citas e inscripciones guardan `usuario_id` **sin FK** a `auth`. Replica esa regla en Deporte, Cultura, etc.

---

## Avance 3 — REST de citas y promoción de administradores

**Commit:** [`be60385`](https://github.com/csantyt/Conecta-BU/commit/be60385)  
**Mensaje:** *Agrega las reglas REST de citas de Desarrollo humano y la gestión de administradores desde la app.*

**Qué se hizo.** API de horarios y citas con reglas de negocio: cupo, una cita activa, transacciones y bloqueo de fila al agendar. Un administrador puede promover a otra persona desde la home (después de que esa persona haya iniciado sesión con Google).

**Qué se subió.**

- `citasHorariosService.ts`, validadores Zod, rutas `/horarios` y `/citas`
- `PATCH /auth/usuarios/:id/rol`
- Panel de administradores en la home

**Para continuar.** Respetar RN-004 (una cita `AGENDADA`). Usar transacción + lock si implementas cupos en otro módulo.

---

## Avance 4 — Eventos e identidad institucional

**Commit:** [`34dd123`](https://github.com/csantyt/Conecta-BU/commit/34dd123)  
**Mensaje:** *Agrega las reglas REST de eventos de Desarrollo humano y la identidad institucional Uniautónoma.*

**Qué se hizo.** Eventos y talleres con cupo, fecha límite de inscripción, inscripciones y asistencia. Marca de la Corporación Universitaria Autónoma del Cauca (nombre y logo).

**Qué se subió.**

- `eventosService.ts`, modelos Evento e Inscripcion
- Rutas `/eventos` (CRUD admin, inscribirse/cancelar usuario)
- Logo en `frontend/public/branding/` y componente de marca

**Para continuar.** Los inscritos se listan por `usuario_id`; el admin resuelve nombre/correo con `GET /auth/usuarios`.

---

## Avance 5 — UI completa, IA/n8n y catálogo sin duplicados

**Commit:** [`b936abd`](https://github.com/csantyt/Conecta-BU/commit/b936abd)  
**Mensaje:** *Unifica los servicios de Desarrollo humano por nombre y publica la interfaz de estudiante y administrador con orientación vía n8n.*

**Qué se hizo.** Interfaz de estudiante (tarjetas, calendario, horarios, mis citas, eventos) y de administrador (CRUD de horarios, citas del día con asistencia, eventos con inscritos nominados). Chat de orientación y recomendaciones vía n8n. Se unificaron servicios duplicados y se añadió índice único por nombre.

**Qué se subió.**

- `frontend/src/features/desarrollo-humano/` (calendario y paneles)
- `backend/src/modules/ia/` y webhooks documentados en `.env.example`
- `n8n/code-orientacion.js`, `n8n/code-recomendaciones.js`, `n8n/instalar-workflows.py`
- Semilla idempotente de servicios + `CREATE UNIQUE INDEX servicios_nombre_unico`

**Para continuar.** El chat no es terapia. Si añades IA a otro módulo, reutiliza `n8nClient.ts` y un prompt con límites claros. No insertes a mano servicios con el mismo nombre.

---

## Avance 6 — Esta documentación

**Commit:** [`83365e7`](https://github.com/csantyt/Conecta-BU/commit/83365e7)  
**Mensaje:** *Documenta las tecnologías, el mapa de módulos y el historial por commit para colaboradores.*

**Qué se hizo.** README del repositorio, bitácora y comentarios en GitHub para onboarding.

**Para continuar.** Empieza por el README, luego este archivo, luego el código del módulo que te toque. Si tu avance es grande, añade una sección aquí y un comentario en el commit.

---

## Avance 7 — Modelo relacional Deportes PISU

**Commit:** [`e622c11`](https://github.com/csantyt/Conecta-BU/commit/e622c11)  
**Mensaje:** *Agrega el modelo relacional de Deportes PISU en el esquema deporte de PostgreSQL.*

**Qué se hizo.** Se inicializó el modelo de datos del módulo Deportes PISU para inscribir estudiantes, asignar horarios a docentes, tomar asistencia y emitir alertas, sin mezclar tablas con Desarrollo humano ni con `auth`.

**Qué se subió.**

- `backend/database/deporte_pisu.sql` (DDL, FKs, índices, checks)
- Modelos Sequelize en `backend/src/modules/deporte/models/`
- `schema.prisma` de referencia (el runtime sigue en Sequelize)
- Aplicación del SQL al arrancar el backend

**Para qué.** Dejar la base lista para el REST de PISU (inscripciones, cupos, asistencia). El API `/api/v1/deporte` todavía responde 501.

**Para continuar.** Montar el REST de inscribir, tomar asistencia y publicar alertas sobre las rutas PISU.

---

## Avance 8 — API PISU por capas (JWT + RBAC)

**Commit:** [`06ffca0`](https://github.com/csantyt/Conecta-BU/commit/06ffca0)  
**Mensaje:** *Agrega las capas Express de PISU con autenticación JWT y rutas por rol.*

**Qué se hizo.** Se montó el servidor PISU en capas (Routes → Middlewares → Controllers → Services → Models). El JWT de Conecta BU sigue siendo el de Google; el middleware PISU lo verifica y carga el perfil en `deporte.usuarios`. El RBAC restringe **Administrador**, **Docente** y **Estudiante**.

**Qué se subió.**

- `backend/src/modules/deporte/middlewares/authMiddleware.ts` y `rbacMiddleware.ts`
- `routes/`, `controllers/`, `services/`
- Rutas en `app.ts`: `/api/v1/deportes`, `/docente`, `/estudiante`, `/admin`

**Para qué.** Dejar la API lista para el frontend de deportes, con 401 sin token y 403 si el rol no corresponde. Un admin de Conecta se provisiona como Administrador PISU; un usuario, como Estudiante. El docente se asigna después.

**Para continuar.** Implementar POST de inscripciones, asistencia y alertas sobre estos controladores.

---

## Avance 9 — Autoinscripción a deportes (RF-019) y módulo Deporte activo

**Commit:** [`b334991`](https://github.com/csantyt/Conecta-BU/commit/b334991)  
**Mensaje:** *Agrega la autoinscripción ACID a deportes y habilita el módulo Deporte.*

**Qué se hizo.** Autoinscripción de estudiantes con transacción ACID (lock de deporte y estudiante) y reglas RN-001 (cruce de horario), RN-002 (categoría) y RN-003 (cupo). Deporte queda como segundo módulo activo, debajo de Desarrollo humano.

**Qué se subió.**

- `inscripcionesService.ts` + `POST /api/v1/estudiante/inscripciones` (201 o 400/409)
- Catálogo con cupo disponible y pantalla `DeportePage`
- Semilla de Fútbol, Baloncesto y Voleibol

**Para qué.** Que el estudiante se inscriba sin sobrecupos ni cruces, y que el módulo se vea y se use en la home.

**Para continuar.** Publicar horarios de docente y toma de asistencia.

---

## Avance 10 — Asistencia docente y catálogo

**Commit:** [`042e910`](https://github.com/csantyt/Conecta-BU/commit/042e910)  
**Mensaje:** *Agrega la API de asistencia docente de PISU y la interfaz de catálogo y asistencia.*

**Qué se hizo.** El docente ve sus clases y la lista de inscritos, toma asistencia por fecha y la corrige dentro de las 24 horas siguientes (RF-016). Solo puede tocar clases asignadas a él (RN-004).

**Qué se subió.**

- `docenteService.ts` y rutas `/api/v1/docente/mis-clases`, `/clases/:horarioId/estudiantes`, `/asistencia`
- Pantallas `CatalogoDeportes.tsx` (filtros por nombre y día) y `TomarAsistencia.tsx`

---

## Avance 11 — Roles PISU, creación de deportes y pruebas de API

**Commit:** [`0b1c4a6`](https://github.com/csantyt/Conecta-BU/commit/0b1c4a6)  
**Mensaje:** *Agrega la asignación de roles PISU, la creación de deportes y pruebas de API con Jest.*

**Qué se hizo.** El administrador asigna rol PISU (Administrador, Docente, Estudiante) y categoría a cualquier cuenta y crea deportes. Se configuró Jest con pruebas de integración contra PostgreSQL.

**Qué se subió.**

- `PATCH /api/v1/admin/usuarios/:id`, `POST /api/v1/admin/deportes`, pantalla `PanelUsuariosPisu.tsx`
- `backend/tests/` con pruebas de 401/403 y de concurrencia de cupos (8 inscripciones simultáneas al último cupo)

---

## Avance 12 — Pruebas unitarias

**Commit:** [`18246b9`](https://github.com/csantyt/Conecta-BU/commit/18246b9)  
**Mensaje:** *Agrega pruebas unitarias del backend para autenticación, Desarrollo humano, Deporte e IA.*

**Qué se hizo.** Pruebas unitarias de roles, validadores Zod de Desarrollo humano y Deporte, cálculo de traslapes, dashboard y cliente de n8n.

**Para continuar.** `npm test` en `backend/` necesita PostgreSQL arriba y el `.env` con `DATABASE_URL` y `JWT_SECRET`.

---

## Avance 13 — Dashboard DH, administración PISU completa y login móvil

**Commit:** [`961144e`](https://github.com/csantyt/Conecta-BU/commit/961144e)  
**Mensaje:** *Agrega el dashboard de Desarrollo humano, la administración completa de PISU y el login para móvil.*

**Qué se hizo.** Panel de estadísticas para el administrador de Desarrollo humano (incluye consultas a la IA). Administración PISU completa: resumen, deportes, horarios con docente, eventos y alertas. Login con Google que funciona desde el teléfono por la red local.

**Qué se subió.**

- `dashboardService.ts`, modelo `ConsultaIa` y `GET /api/v1/desarrollo-humano/admin/dashboard`
- `PanelAdminPisu.tsx`, `EventosAlertasPisu.tsx` y rutas `/api/v1/admin/{resumen,horarios,eventos,alertas}`

---

## Avance 14 — Eventos con inscripción, alertas automáticas y "Mi actividad"

**Commit:** [`e7b7538`](https://github.com/csantyt/Conecta-BU/commit/e7b7538)  
**Mensaje:** *Agrega inscripción a eventos PISU, alertas automáticas por inasistencias y vista de actividad del estudiante.*

**Qué se hizo.** Se cerraron los huecos de Deporte y se corrigieron errores de compilación que impedían `npm run build`.

**Qué se subió.**

- **Inscripción a eventos deportivos:** tabla `deporte.inscripciones_eventos`, `eventosService.ts` con transacción y bloqueo (sin sobrecupo), rutas `POST|DELETE /api/v1/estudiante/eventos/:id/inscripcion` y `GET /api/v1/admin/eventos/:id/inscritos`. El administrador no puede bajar el cupo por debajo de los inscritos.
- **Alertas automáticas:** cada 3 inasistencias en un deporte (`UMBRAL_INASISTENCIAS_ALERTA`) se crea un aviso personal para el estudiante. Columnas nuevas `alertas.estudiante_id` y `alertas.clave` (única, evita duplicados). `alertasService.ts`.
- **Mi actividad (estudiante):** horario semanal y porcentaje de asistencia por deporte. `GET /api/v1/estudiante/asistencias` y pantalla `MiActividadPisu.tsx`.
- **Capas en Desarrollo humano:** el controlador ya no consulta modelos directamente; usa `listarServiciosActivos`, `listarHorariosFiltrados` y `listarCitasVisibles`.
- **Correcciones:** 14 errores de TypeScript en backend (el build fallaba) y un error en `TomarAsistencia.tsx` que rompía la lista cuando ya había asistencia registrada.
- Pruebas nuevas: `deporte.eventos.test.ts` y `deporte.alertas.test.ts`.

**Para continuar.** `deporte_pisu.sql` se ejecuta al arrancar partiéndolo por `;`: no escribas punto y coma dentro de comentarios ni bloques `DO $$`.

---

## Avance 15 — Identidad visual de la página web Uniautónoma

**Commit:** [`3afae2e`](https://github.com/csantyt/Conecta-BU/commit/3afae2e)  
**Mensaje:** *Aplica la identidad visual de la página web Uniautónoma a Conecta BU.*

**Qué se hizo.** La interfaz adopta la paleta y el estilo del sitio institucional: fondo azul noche con fragmentos geométricos, tipografía Montserrat en mayúsculas, acentos cian y naranja, y banda de tarjetas en degradado amarillo → naranja.

**Qué se subió.**

- `frontend/src/index.css`: colores de marca (`uni-noche`, `uni-marino`, `uni-cian`, `uni-amarillo`, `uni-naranja`, `uni-mandarina`) y utilidades `banda-uni` y `sombra-uni`. Las escalas `slate`, `sky` y `cyan` se re-mapean a la paleta, así los paneles existentes la heredan.
- `public/branding/fondo-geometrico.svg`: fondo de fragmentos triangulares.
- Cabecera con navegación en mayúsculas y flechas, inicio con título grande y módulos como banda de tarjetas con íconos, login rediseñado, encabezados de Deporte y Desarrollo humano, pestañas y botones principales en degradado y asistente en botón naranja.

**Para continuar.** Usa `banda-uni` para acciones principales y `bg-uni-cian` para etiquetas. Montserrat se carga desde Google Fonts; sin internet se usa la fuente del sistema.
