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

**Commit:** [`4487fc6`](https://github.com/csantyt/Conecta-BU/commit/4487fc6)  
**Mensaje:** *Add Conecta BU backend, frontend auth, and Bienestar modules.*

**Qué se hizo.** Se creó el esqueleto de Conecta BU: API en Express, login con Google, SPA en Vite/React y los cinco módulos de Bienestar visibles en la home (solo como catálogo).

**Qué se subió.**

- `backend/` con Express, TypeScript, Sequelize, conexión PostgreSQL, JWT y Google
- `frontend/` con Vite, React, Tailwind, pantalla de login y home
- Placeholders de Permanencia, Salud integral, Deporte y Cultura
- Identidad en schema `auth`

**Para continuar.** No reemplazar el login. Los módulos nuevos se enganchan al JWT y a `USUARIO` / `ADMINISTRADOR`.

---

## Avance 2 — Módulo DH y esquemas independientes

**Commit:** [`dd3a0b2`](https://github.com/csantyt/Conecta-BU/commit/dd3a0b2)  
**Mensaje:** *Add Desarrollo humano module, independent schemas, and role catalog.*

**Qué se hizo.** Desarrollo humano dejó de ser un placeholder: schema propio, modelos y semilla de servicios. Cada módulo de Bienestar tiene schema PostgreSQL para no compartir tablas.

**Qué se subió.**

- Schemas `desarrollo_humano`, `permanencia_estudiantil`, `salud_integral`, `deporte`, `cultura`
- Modelos Servicio / Horario / Cita y `backend/database/init.sql`
- Roles de aplicación `USUARIO` y `ADMINISTRADOR` (el RF Estudiante = `USUARIO`)
- [docs/arquitectura-modular.md](arquitectura-modular.md)

**Para continuar.** Citas e inscripciones guardan `usuario_id` **sin FK** a `auth`. Replica esa regla en Deporte, Cultura, etc.

---

## Avance 3 — REST de citas y promoción de administradores

**Commit:** [`1ab1ef1`](https://github.com/csantyt/Conecta-BU/commit/1ab1ef1)  
**Mensaje:** *Add DH appointment REST rules and in-app admin role management.*

**Qué se hizo.** API de horarios y citas con reglas de negocio: cupo, una cita activa, transacciones y bloqueo de fila al agendar. Un administrador puede promover a otra persona desde la home (después de que esa persona haya iniciado sesión con Google).

**Qué se subió.**

- `citasHorariosService.ts`, validadores Zod, rutas `/horarios` y `/citas`
- `PATCH /auth/usuarios/:id/rol`
- Panel de administradores en la home

**Para continuar.** Respetar RN-004 (una cita `AGENDADA`). Usar transacción + lock si implementas cupos en otro módulo.

---

## Avance 4 — Eventos e identidad institucional

**Commit:** [`d2077fe`](https://github.com/csantyt/Conecta-BU/commit/d2077fe)  
**Mensaje:** *Add DH events REST rules and Uniautonoma branding.*

**Qué se hizo.** Eventos y talleres con cupo, fecha límite de inscripción, inscripciones y asistencia. Marca de la Corporación Universitaria Autónoma del Cauca (nombre y logo).

**Qué se subió.**

- `eventosService.ts`, modelos Evento e Inscripcion
- Rutas `/eventos` (CRUD admin, inscribirse/cancelar usuario)
- Logo en `frontend/public/branding/` y componente de marca

**Para continuar.** Los inscritos se listan por `usuario_id`; el admin resuelve nombre/correo con `GET /auth/usuarios`.

---

## Avance 5 — UI completa, IA/n8n y catálogo sin duplicados

**Commit:** [`0ae85f5`](https://github.com/csantyt/Conecta-BU/commit/0ae85f5)  
**Mensaje:** *Unify DH services by name and ship the student/admin UI with n8n orientation.*

**Qué se hizo.** Interfaz de estudiante (tarjetas, calendario, horarios, mis citas, eventos) y de administrador (CRUD de horarios, citas del día con asistencia, eventos con inscritos nominados). Chat de orientación y recomendaciones vía n8n. Se unificaron servicios duplicados y se añadió índice único por nombre.

**Qué se subió.**

- `frontend/src/features/desarrollo-humano/` (calendario y paneles)
- `backend/src/modules/ia/` y webhooks documentados en `.env.example`
- `n8n/code-orientacion.js`, `n8n/code-recomendaciones.js`, `n8n/instalar-workflows.py`
- Semilla idempotente de servicios + `CREATE UNIQUE INDEX servicios_nombre_unico`

**Para continuar.** El chat no es terapia. Si añades IA a otro módulo, reutiliza `n8nClient.ts` y un prompt con límites claros. No insertes a mano servicios con el mismo nombre.

---

## Avance 6 — Esta documentación

**Commit:** [`e50a609`](https://github.com/csantyt/Conecta-BU/commit/e50a609)  
**Mensaje:** *Document stack, module map, and per-commit history for collaborators.*

**Qué se hizo.** README del repositorio, bitácora y comentarios en GitHub para onboarding.

**Para continuar.** Empieza por el README, luego este archivo, luego el código del módulo que te toque. Si tu avance es grande, añade una sección aquí y un comentario en el commit.

---

## Avance 7 — Modelo relacional Deportes PISU

**Commit:** el de este avance en `main` (comentario en el commit de GitHub).  
**Mensaje:** *Add Deportes PISU relational schema in the deporte PostgreSQL schema.*

**Qué se hizo.** Se inicializó el modelo de datos del módulo Deportes PISU para inscribir estudiantes, asignar horarios a docentes, tomar asistencia y emitir alertas, sin mezclar tablas con Desarrollo humano ni con `auth`.

**Qué se subió.**

- `backend/database/deporte_pisu.sql` (DDL, FKs, índices, checks)
- Modelos Sequelize en `backend/src/modules/deporte/models/`
- `schema.prisma` de referencia (el runtime sigue en Sequelize)
- Aplicación del SQL al arrancar el backend

**Para qué.** Dejar la base lista para el REST de PISU (inscripciones, cupos, asistencia). El API `/api/v1/deporte` todavía responde 501.

**Para continuar.** Montar rutas y reglas de cupo sobre estas tablas. `auth_usuario_id` en `deporte.usuarios` es el puente al login Google, sin FK cruzada.
