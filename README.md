# Conecta BU

Plataforma web de **Bienestar Universitario** de la **Corporación Universitaria Autónoma del Cauca** (Uniautónoma).

Este repositorio es el punto de entrada para quien continúe el proyecto. Aquí está qué hay hoy, con qué se construyó y cómo sumar los módulos que faltan.

- Bitácora de cada avance: [docs/BITACORA.md](docs/BITACORA.md)
- Arquitectura de módulos y esquemas: [docs/arquitectura-modular.md](docs/arquitectura-modular.md)
- Prompt del asistente (RN-011): [docs/n8n-system-prompt-orientacion.md](docs/n8n-system-prompt-orientacion.md)

## Qué hay listo

Están habilitados **Desarrollo humano y orientación** y **Deporte (PISU)**. Los otros tres módulos ya aparecen en la home y tienen schema/API vacío para no rediseñar después.

| Módulo | Estado |
|---|---|
| Desarrollo humano y orientación | Activo (citas, horarios, eventos, dashboard, IA) |
| Deporte | Activo (inscripción RF-019, asistencia docente, eventos con cupo, alertas automáticas, administración) |
| Permanencia estudiantil | Visible, aún no implementado |
| Salud integral | Visible, aún no implementado |
| Cultura | Visible, aún no implementado |

**Arquitectura:** monolito modular (un schema PostgreSQL y una carpeta por módulo) con capas dentro de cada módulo: rutas → middlewares → controladores → servicios → modelos.

**Roles:** `USUARIO` (el RF “Estudiante” se mapea aquí) y `ADMINISTRADOR`. El primer administrador se promueve desde la home, después de iniciar sesión con Google institucional (`uniautonoma.edu.co`).

## Tecnologías y herramientas

| Capa | Qué usamos | Para qué |
|---|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, Axios | SPA, estilos y llamadas al API |
| Auth en cliente | Google Identity Services (OIDC `id_token`), JWT en `localStorage` | Login institucional |
| Backend | Node.js, Express 5, TypeScript (`tsx` en desarrollo) | API REST `/api/v1` |
| Validación | Zod | Cuerpos y query params |
| Persistencia | PostgreSQL + Sequelize 6 | Un **schema por módulo** |
| Identidad | `google-auth-library` + JWT 8 h | Verificar Google y sesión |
| Automatización / IA | n8n (webhooks locales `:5678`) | Chat de orientación y recomendaciones de eventos |
| Control de versiones | Git + GitHub (`csantyt/Conecta-BU`) | Historial y colaboración |

El chat **no diagnostica** (regla RN-011). Si n8n no está arriba, el backend responde con texto local seguro.

## Cómo correrlo en local

Requisitos: Node.js 20+, PostgreSQL, cuenta Google OAuth (client ID) restringida al dominio institucional. Opcional: n8n en `http://localhost:5678`.

```bash
# 1) Base de datos
# Crear la BD conecta_bu y, si quieres, ejecutar backend/database/init.sql
# El servidor también crea esquemas y siembra servicios al arrancar.

# 2) Backend
cd backend
cp .env.example .env   # completar DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_ID
npm install
npm run dev            # http://localhost:3000

# 3) Frontend
cd frontend
cp .env.example .env
npm install
npm run dev            # http://localhost:5173  (proxy /api → :3000)
```

Variables importantes:

- Backend: `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_HOSTED_DOMAIN`, `N8N_WEBHOOK_ORIENTACION`, `N8N_WEBHOOK_RECOMENDACIONES`
- Frontend: `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_HOSTED_DOMAIN`

**No subas archivos `.env`.** Solo existen `.env.example`.

### n8n (opcional)

1. Instala y arranca n8n (puerto 5678).
2. Los flujos esperados son `conecta-bu-orientacion` y `conecta-bu-recomendaciones` (código en `n8n/`).
3. El prompt del modelo está en `docs/n8n-system-prompt-orientacion.md`.

## Mapa del código

```
backend/src/modules/auth/                 login Google, usuarios, roles
backend/src/modules/desarrollo-humano/    citas, horarios, eventos
backend/src/modules/ia/                   puente a n8n
backend/src/modules/deporte/              PISU por capas (usuarios, deportes, horarios, inscripciones, asistencias, eventos, alertas)
backend/src/modules/{permanencia,salud,cultura}/  placeholders
frontend/src/pages/                        login, home, módulo DH, módulo Deporte
frontend/src/features/desarrollo-humano/   calendario, paneles estudiante/admin
frontend/src/features/deporte/             catálogo, mi actividad, asistencia, usuarios, administración
frontend/src/config/modulos.ts             catálogo de los cinco módulos
```

API activa (todas con JWT, salvo el login):

- `POST /api/v1/auth/login/google`
- `GET|PATCH /api/v1/auth/usuarios` (solo admin)
- `/api/v1/desarrollo-humano/servicios|horarios|citas|eventos`
- `POST /api/v1/ia/orientacion` y `POST /api/v1/ia/recomendaciones` (también `/api/ia/...`)
- PISU (JWT + roles Administrador/Docente/Estudiante):
  - `/api/v1/deportes` — catálogo, eventos y alertas (los tres roles)
  - `/api/v1/estudiante` — inscripciones, horarios, asistencias, inscripción a eventos
  - `/api/v1/docente` — clases, lista de inscritos, toma y edición de asistencia
  - `/api/v1/admin` — resumen, usuarios, deportes, horarios, eventos (con inscritos) y alertas

Pruebas: `cd backend && npm test` (necesita PostgreSQL y el `.env`).

## Cómo continuar un módulo nuevo

1. Tablas **solo** en el schema de ese módulo (`deporte`, `cultura`, etc.). No uses FK hacia `auth`; guarda `usuario_id` UUID.
2. Crea `backend/src/modules/<modulo>/` con `models`, `routes`, `controllers`, `validators`.
3. Monta el router en `backend/src/app.ts`: `app.use("/api/v1/<modulo>", router)`.
4. En `frontend/src/config/modulos.ts` pon `activo: true` y añade la pantalla.

No mezcles tablas de Desarrollo humano con otro módulo. Copia el patrón de `desarrollo-humano` si el dominio es similar (cupos, horarios, asistencia).

## Convenciones

- Español en la interfaz y en mensajes de error de negocio.
- RF “Estudiante” = rol `USUARIO`.
- Una sola cita `AGENDADA` por persona (RN-004).
- El asistente no da diagnóstico clínico (RN-011).
- Commits y documentación de producto en español.

Historial de lo subido a GitHub: [docs/BITACORA.md](docs/BITACORA.md).
