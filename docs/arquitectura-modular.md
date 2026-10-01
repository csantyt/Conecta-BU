# Arquitectura modular de Conecta BU

Conecta BU es un **monolito modular**: una sola API y una sola SPA, partidas en **identidad** + **cinco módulos de Bienestar**. Dentro de cada módulo el código va **por capas** (rutas → middlewares → controladores → servicios → modelos).

Hay lógica de negocio en **Desarrollo humano y orientación** y en **Deporte (PISU)**. Permanencia estudiantil, Salud integral y Cultura ya tienen hueco en backend, frontend y base de datos para entrar después **sin rediseñar** lo existente.

## 1. Estructura de carpetas

```
conecta-bu/
├── backend/
│   ├── database/init.sql
│   └── src/
│       ├── config/          # conexión y nombres de esquemas
│       ├── middlewares/     # JWT y roles
│       └── modules/
│           ├── auth/
│           ├── desarrollo-humano/   # activo: citas, horarios, eventos
│           ├── deporte/             # activo: PISU (inscripciones, asistencia, eventos, alertas)
│           ├── ia/                  # puente a n8n (orientación y recomendaciones)
│           ├── permanencia-estudiantil/   # pendiente
│           ├── salud-integral/            # pendiente
│           └── cultura/                   # pendiente
├── frontend/
│   └── src/
│       ├── api/ / auth/ / pages/ / components/
│       ├── features/desarrollo-humano/
│       ├── features/deporte/
│       └── config/modulos.ts        # catálogo de los 5 módulos
├── n8n/                             # código de los webhooks de orientación
└── docs/                            # arquitectura, bitácora, prompt RN-011
```

Cada módulo de backend sigue el mismo patrón: `routes`, `controllers`, `services`, `models` (y `middlewares` / `validators` / `seed` cuando haga falta). Los controladores validan con Zod y llaman a servicios; solo los servicios tocan los modelos. El API se monta en `/api/v1/{modulo}`; Deporte se divide por rol en `/api/v1/deportes`, `/docente`, `/estudiante` y `/admin`. El chat de orientación vive en `/api/v1/ia` (también `/api/ia`) y no pertenece a un schema propio: llama a n8n.

Bitácora de commits y guía de onboarding: [BITACORA.md](BITACORA.md) y el [README](../README.md) de la raíz.

## 2. Base de datos independiente por módulo

Un mismo PostgreSQL, **un schema por contexto**:

| Schema | Contenido |
|---|---|
| `auth` | `roles`, `usuarios` (login de toda la app) |
| `desarrollo_humano` | servicios, horarios, citas, eventos, inscripciones, consultas_ia |
| `deporte` | usuarios, deportes, horarios, inscripciones, asistencias, eventos, inscripciones_eventos, alertas |
| `permanencia_estudiantil` | vacío |
| `salud_integral` | vacío |
| `cultura` | vacío |

Las citas e inscripciones guardan `usuario_id` **sin FK** hacia `auth`. Así un módulo no acopla su esquema al de otro. Deporte tiene su propia tabla `usuarios` con `auth_usuario_id` como puente opcional al login.

Roles de aplicación: **USUARIO** y **ADMINISTRADOR**. Deporte añade sus roles internos **Administrador**, **Docente** y **Estudiante** (RBAC en `deporte/middlewares/rbacMiddleware.ts`).

## 3. Cómo se integran los 3 módulos pendientes

1. Crear tablas solo dentro de su schema (copiar el patrón de `deporte`, que es el más completo por capas).
2. Añadir `backend/src/modules/<modulo>/` con rutas propias.
3. Registrar `app.use("/api/v1/<modulo>", router)`.
4. En el frontend, pasar `activo: true` en `config/modulos.ts` y crear su pantalla.

No se toca el schema de Desarrollo humano ni se mezclan tablas de módulos distintos.
