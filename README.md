# Conecta BU

Plataforma web de **Bienestar Universitario** de la **Corporación Universitaria Autónoma del Cauca** (Uniautónoma).

Este repositorio es el punto de entrada para quien continúe el proyecto. Aquí está qué hay hoy, con qué se construyó y cómo sumar los módulos que faltan.

- Bitácora de cada avance: [docs/BITACORA.md](docs/BITACORA.md)
- Arquitectura de módulos y esquemas: [docs/arquitectura-modular.md](docs/arquitectura-modular.md)
- Prompt del asistente (RN-011): [docs/n8n-system-prompt-orientacion.md](docs/n8n-system-prompt-orientacion.md)

## Qué hay listo

Solo está habilitado **Desarrollo humano y orientación**. Los otros cuatro módulos ya aparecen en la home y tienen schema/API vacío para no rediseñar después.

| Módulo | Estado |
|---|---|
| Desarrollo humano y orientación | Activo (citas, horarios, eventos, IA) |
| Permanencia estudiantil | Visible, aún no implementado |
| Salud integral | Visible, aún no implementado |
| Deporte | Modelo PISU en PostgreSQL listo; API REST aún no |

| Cultura | Visible, aún no implementado |

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
backend/src/modules/deporte/            tablas PISU (usuarios, deportes, horarios, inscripciones, asistencias, eventos, alertas)
backend/src/modules/{permanencia,salud,cultura}/  placeholders
frontend/src/pages/                        login, home, módulo DH
frontend/src/features/desarrollo-humano/   calendario, paneles estudiante/admin
frontend/src/config/modulos.ts             catálogo de los cinco módulos
```

API activa (todas con JWT, salvo el login):

- `POST /api/v1/auth/login/google`
- `GET|PATCH /api/v1/auth/usuarios` (solo admin)
- `/api/v1/desarrollo-humano/servicios|horarios|citas|eventos`
- `POST /api/v1/ia/orientacion` y `POST /api/v1/ia/recomendaciones` (también `/api/ia/...`)

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
- Commits en inglés, documentación de producto en español.

Historial de lo subido a GitHub: [docs/BITACORA.md](docs/BITACORA.md).
