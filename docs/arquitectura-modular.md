# Arquitectura modular de Conecta BU

Conecta BU se parte en **identidad** + **cinco módulos de Bienestar**. En esta fase solo hay lógica de negocio en Desarrollo humano y orientación. Los otros cuatro ya tienen hueco en backend, frontend y base de datos para entrar después **sin rediseñar** lo existente.

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
│           ├── desarrollo-humano/   # único módulo activo
│           ├── permanencia-estudiantil/
│           ├── salud-integral/
│           ├── deporte/
│           └── cultura/
└── frontend/
    └── src/
        ├── api/ / auth/ / pages/
        └── config/modulos.ts        # catálogo de los 5 módulos
```

Cada módulo de backend sigue el mismo patrón: `models`, `controllers`, `routes` (y `validators` / `seed` cuando haga falta). El API se monta en `/api/v1/{modulo}`.

## 2. Base de datos independiente por módulo

Un mismo PostgreSQL, **un schema por contexto**:

| Schema | Contenido |
|---|---|
| `auth` | `roles`, `usuarios` (login de toda la app) |
| `desarrollo_humano` | servicios, horarios, citas, eventos, inscripciones |
| `permanencia_estudiantil` | vacío |
| `salud_integral` | vacío |
| `deporte` | vacío |
| `cultura` | vacío |

Las citas e inscripciones guardan `usuario_id` **sin FK** hacia `auth`. Así un módulo no acopla su esquema al de otro. Deporte podrá tener sus propias tablas `eventos` o `citas` dentro de `deporte`.

Roles de aplicación: **USUARIO** y **ADMINISTRADOR**.

## 3. Cómo se integran los otros 4 módulos

1. Crear tablas solo dentro de su schema (copiar el patrón de `desarrollo_humano` si aplica).
2. Añadir `backend/src/modules/<modulo>/` con rutas propias.
3. Registrar `app.use("/api/v1/<modulo>", router)`.
4. En el frontend, pasar `activo: true` en `config/modulos.ts` y crear su pantalla.

No se toca el schema de Desarrollo humano ni se mezclan tablas de módulos distintos.
