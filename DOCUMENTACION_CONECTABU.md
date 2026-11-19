# DOCUMENTACIÓN — CONECTA BU

## 1. Descripción general

**Conecta BU** es una plataforma de Bienestar Universitario para la Universidad Autónoma (Uniautónoma). El sistema permite gestionar deportes PISU, asistencia de clases, eventos, inscripciones de estudiantes, y roles de acceso (Estudiante, Docente, Administrador).

- **Backend:** Node.js + Express + Sequelize (conectado a Supabase PostgreSQL)
- **Frontend:** React + Vite
- **Base de datos:** Supabase (PostgreSQL gestionado)
- **Autenticación:** Google OAuth institucional (`@uniautonoma.edu.co`) + JWT propio

---

## 2. Estructura del repositorio

```
Conecta-BU/
├── backend/                 # API REST (Express + Sequelize)
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   │   ├── database.ts      # Conexión Sequelize a Supabase
│   │   │   └── schemas.ts       # Esquemas de PostgreSQL
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.ts   # Valida JWT y correo institucional
│   │   │   └── asyncHandler.ts
│   │   ├── modules/
│   │   │   ├── auth/              # Login Google, roles, usuarios auth
│   │   │   ├── deporte/           # Módulo Deportes PISU
│   │   │   │   ├── controllers/
│   │   │   │   │   ├── docenteController.ts
│   │   │   │   │   ├── estudianteController.ts
│   │   │   │   │   ├── adminController.ts
│   │   │   │   │   └── deportesController.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── docenteService.ts
│   │   │   │   │   ├── estudianteService.ts
│   │   │   │   │   ├── adminService.ts
│   │   │   │   │   └── eventosDocenteService.ts
│   │   │   │   ├── routes/
│   │   │   │   │   ├── docenteRoutes.ts
│   │   │   │   │   ├── estudianteRoutes.ts
│   │   │   │   │   ├── adminRoutes.ts
│   │   │   │   │   └── deportesRoutes.ts
│   │   │   │   ├── models/
│   │   │   │   │   ├── UsuarioPisu.ts
│   │   │   │   │   ├── Deporte.ts
│   │   │   │   │   ├── HorarioDeporte.ts
│   │   │   │   │   ├── Asistencia.ts
│   │   │   │   │   ├── InscripcionDeporte.ts
│   │   │   │   │   ├── DeporteDocente.ts
│   │   │   │   │   ├── EventoDeporte.ts
│   │   │   │   │   ├── Alerta.ts
│   │   │   │   │   └── InscripcionEvento.ts
│   │   │   │   ├── seed.ts          # Datos de prueba
│   │   │   │   ├── constantes.ts
│   │   │   │   ├── validators.ts
│   │   │   │   └── utils/
│   │   │   ├── desarrollo-humano/
│   │   │   ├── salud-integral/
│   │   │   ├── permanencia-estudiantil/
│   │   │   ├── cultura/
│   │   │   └── ia/                  # Integración con n8n (IA)
│   │   └── ...
│   ├── database/
│   │   ├── init.sql                 # Esquema inicial
│   │   └── deporte_pisu.sql         # Tablas del módulo deporte
│   ├── .env                         # Variables de entorno (NO subir a GitHub)
│   ├── package.json
│   ├── tsconfig.json
│   └── dist/                        # Build compilado
│
├── frontend/                    # Aplicación React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DeportePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   └── HomePage.tsx
│   │   ├── features/deporte/
│   │   │   ├── DeporteShell.tsx
│   │   │   ├── DocenteMisDeportes.tsx
│   │   │   ├── DocenteClasesHoy.tsx
│   │   │   ├── DocenteEstudiantes.tsx
│   │   │   ├── DocenteHistorial.tsx
│   │   │   ├── DocenteLlamarLista.tsx
│   │   │   ├── DocenteReporte.tsx
│   │   │   ├── DocenteComunicados.tsx
│   │   │   ├── DocenteEventos.tsx
│   │   │   ├── EstudianteMisDeportes.tsx
│   │   │   ├── EstudianteCompaneros.tsx
│   │   │   ├── MiActividadPisu.tsx
│   │   │   ├── CatalogoDeportes.tsx
│   │   │   └── ui/
│   │   ├── api/deporte.ts           # Cliente HTTP del módulo deporte
│   │   ├── types/deporte.ts         # Tipos TypeScript
│   │   ├── auth/
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
│
├── n8n/                           # Workflows de IA y automatización
├── docs/
├── .gitignore
└── README.md
```

---

## 3. Migración a Supabase (Opción A)

Se mantuvo **Sequelize** como ORM y solo se cambió la conexión a Supabase.

### Cambios realizados

**`backend/src/config/database.ts`**
- Se agregó `dialectOptions.ssl` que se activa cuando `NODE_ENV=production` o `SUPABASE_SSL=true` (requerido por Supabase).

**`backend/.env`**
- Se reemplazó `DATABASE_URL` por la cadena de conexión de Supabase (Pooler, modo session).
- Se agregó `SUPABASE_SSL=true`.

### Pasos para configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com).
2. En **Settings → API**, copiar `Project URL` y `anon public key` / `service_role secret`.
3. En **Settings → Database**, copiar la conexión del **Pooler** (modo session):
   ```
   postgresql://postgres.<proyecto>:<password>@aws-1-us-east-1.pooler.supabase.com:5432/postgres
   ```
4. En **SQL Editor**, ejecutar (en orden):
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   CREATE SCHEMA IF NOT EXISTS deporte;
   CREATE SCHEMA IF NOT EXISTS desarrollo_humano;
   CREATE SCHEMA IF NOT EXISTS cultura;
   CREATE SCHEMA IF NOT EXISTS permanencia_estudiantil;
   CREATE SCHEMA IF NOT EXISTS salud_integral;
   ```
   Luego ejecutar el contenido de `backend/database/deporte_pisu.sql` (elegir "Run without RLS").
5. Actualizar `backend/.env` con la `DATABASE_URL` de Supabase.
6. Rebuild y ejecutar:
   ```bash
   npm run build
   npm start
   ```

---

## 4. Variables de entorno (`.env`)

```env
PORT=3000
DATABASE_URL=postgresql://postgres.<proyecto>:<password>@aws-1-us-east-1.pooler.supabase.com:5432/postgres
JWT_SECRET=cambia_este_secreto
GOOGLE_CLIENT_ID=1067068111817-i4sth6o0gille2pp69kd71op0iu1e2ok.apps.googleusercontent.com
SUPABASE_SSL=true

N8N_WEBHOOK_ORIENTACION=http://localhost:5678/webhook/conecta-bu-orientacion
N8N_WEBHOOK_RECOMENDACIONES=http://localhost:5678/webhook/conecta-bu-recomendaciones
N8N_TIMEOUT_MS=20000
```

> ⚠️ El archivo `.env` **NO debe subirse a GitHub** porque contiene la contraseña de la base de datos.

---

## 5. Módulo Docente — Nuevas funcionalidades

Se enriqueció el módulo docente con más información y estructura similar al módulo estudiante.

### Nuevos campos en `MiDeporteDocente`

| Campo | Descripción |
|-------|-------------|
| `total_sesiones_registradas` | Total de sesiones distintas con asistencia registrada |
| `total_asistencias_registradas` | Total de marcas de asistencia (presentes + ausentes) |
| `total_faltas` | Total de ausencias registradas |
| `ultima_actividad` | Fecha de la última sesión con asistencia |

### Nuevo endpoint

```
GET /api/v1/docente/deportes/:deporteId/inscritos
```

Devuelve la lista de inscritos activos de un deporte con su resumen de asistencia:
- `estudiante_id`, `nombre`, `documento`, `correo`, `categoria`
- `fecha_inscripcion`
- `presentes`, `ausentes`, `total`, `porcentaje`
- `estado` (Al día / En riesgo / Reprobaría)

### Pantallas del docente

1. **Mis deportes** — Contadores globales: deportes asignados, estudiantes inscritos, clases hoy, asistencia promedio, sesiones registradas, marcas de asistencia, faltas registradas.
2. **Clases de hoy** — Lista de clases del día con estado (Por comenzar / En curso / Finalizada) y acceso a tomar asistencia.
3. **Llamar a lista** — Registro de asistencia por clase con ventana horaria.
4. **Mis estudiantes** — Tabla de inscritos por deporte con filtro por categoría y búsqueda.
5. **Historial de asistencia** — Sesiones registradas con detalle y matriz estudiantes × fechas.
6. **Reporte final** — Aprobados, reprobados, promedio, descarga Excel.
7. **Mis eventos** — Creación y gestión de eventos deportivos.
8. **Comunicados** — Alertas para docentes.

---

## 6. Endpoints principales

### Autenticación
- `POST /api/v1/auth/login` — Login con Google
- `GET /api/v1/auth/perfil` — Perfil del usuario autenticado

### Docente (`/api/v1/docente`)
- `GET /perfil` — Perfil del docente
- `GET /mis-deportes` — Deportes asignados con métricas
- `GET /hoy` — Clases programadas para hoy
- `GET /mis-clases` — Lista de clases del docente
- `GET /horarios` — Horarios del docente
- `GET /clases/:horarioId/estudiantes` — Estudiantes de una clase
- `GET /clases/:horarioId/lista?fecha=YYYY-MM-DD` — Sesión de lista para tomar asistencia
- `POST /asistencia` — Registrar asistencia de una sesión
- `PUT /asistencia/:asistenciaId` — Editar asistencia individual
- `GET /deportes/:deporteId/estudiantes` — Estudiantes inscritos en un deporte
- `GET /deportes/:deporteId/inscritos` — Inscritos con resumen de asistencia (NUEVO)
- `GET /deportes/:deporteId/reporte` — Reporte final del deporte
- `GET /deportes/:deporteId/reporte/excel` — Descargar reporte en Excel
- `GET /historial?deporteId=<uuid>` — Historial de asistencias
- `GET /comunicados` — Comunicados para docentes

### Estudiante (`/api/v1/estudiante`)
- `GET /mis-deportes` — Deportes en los que está inscrito
- `GET /mi-horario` — Horario del estudiante
- `GET /asistencias` — Mis asistencias y resumen
- `GET /eventos/mios` — Eventos en los que está inscrito
- `POST /eventos/:id/inscripcion` — Inscribirse a un evento

### Administrador (`/api/v1/admin`)
- `GET /panel` — Dashboard administrativo
- `GET /docentes` — Gestión de docentes
- `PUT /docentes/:id/deportes` — Asignar deportes a un docente
- `GET /estudiantes` — Gestión de estudiantes
- `GET /deportes` — Gestión de deportes
- `GET /horarios` — Gestión de horarios
- `GET /eventos` — Gestión de eventos

### Salud
- `GET /health` — Estado del servidor (`{"status":"ok"}`)

---

## 7. Cuentas de prueba (seed)

Al iniciar el backend, se crean automáticamente usuarios de prueba:

### Docente principal
- **Kevin Ruiz M** — `kevin.ruiz.m@uniautonoma.edu.co`
  - Deportes: Fútbol, Baloncesto
  - Rol: Docente

### Otro docente
- **Sofía Herrera** — `sofia.herrera@uniautonoma.edu.co`
  - Deporte: Voleibol

### Administrador
- **Usuario Demo** — `demo@uniautonoma.edu.co`
  - Rol: Administrador

### Estudiantes
Varios estudiantes PISU con correos `estudiante.pisu.XX@uniautonoma.edu.co` y `estudianteXX@uniautonoma.edu.co`.

> Todos los usuarios tienen contraseñas de prueba, pero el acceso real se hace con Google OAuth institucional (`@uniautonoma.edu.co`).

---

## 8. Cómo ejecutar el proyecto

### Backend

```powershell
# Ir a la carpeta del backend
cd C:\Users\kevin\OneDrive\Desktop\Conecta-BU\backend

# Instalar dependencias (una sola vez)
npm install

# Compilar TypeScript
npm run build

# Iniciar servidor (puerto 3000)
npm start

# O modo desarrollo con watch
npm run dev
```

### Frontend

```powershell
# Ir a la carpeta del frontend
cd C:\Users\kevin\OneDrive\Desktop\Conecta-BU\frontend

# Instalar dependencias (una sola vez)
npm install

# Iniciar servidor de desarrollo (puerto 5173)
npm run dev
```

### Verificar que todo funciona

1. Abrir el navegador en: `http://localhost:3000/health`
   - Debe responder: `{"status":"ok"}`

2. Abrir el frontend en: `http://localhost:5173`

---

## 9. Rutas del frontend (hash-based)

La navegación usa hash en la URL:

| Rol | Ruta | Vista |
|-----|------|-------|
| Docente | `#/deportes/docente/mis-deportes` | Mis deportes |
| Docente | `#/deportes/docente/hoy` | Clases de hoy |
| Docente | `#/deportes/docente/lista/:horarioId/:fecha` | Llamar a lista |
| Docente | `#/deportes/docente/historial` | Historial de asistencia |
| Docente | `#/deportes/docente/estudiantes` | Mis estudiantes |
| Docente | `#/deportes/docente/reporte` | Reporte final |
| Docente | `#/deportes/docente/eventos` | Mis eventos |
| Docente | `#/deportes/docente/comunicados` | Comunicados |
| Estudiante | `#/deportes/estudiante/catalogo` | Catálogo de deportes |
| Estudiante | `#/deportes/estudiante/mis-deportes` | Mis deportes |
| Estudiante | `#/deportes/estudiante/horario` | Mi horario |
| Estudiante | `#/deportes/estudiante/eventos` | Eventos |

---

## 10. Recomendaciones para subir a GitHub

1. **No subir `.env`** (contiene credenciales reales).
2. Agregar al `.gitignore`:
   ```
   .env
   .env.local
   node_modules/
   dist/
   build/
   *.log
   ```
3. Subir solo código fuente:
   ```powershell
   git add backend/src/ frontend/src/ backend/database/ backend/package.json frontend/package.json
   git commit -m "feat: conectar backend a Supabase y enriquecer módulo docente"
   git push origin main
   ```

---

## 11. Soporte

- **Backend:** `backend/src/server.ts` es el punto de entrada.
- **Frontend:** `frontend/src/main.tsx` es el punto de entrada.
- **Base de datos:** Supabase project `cdrkhqlcpobhqhgukzhy` (us-west / us-east-1 pooler).
- **Documentación del rol docente:** `backend/src/modules/deporte/docs/DOCENTE.md`

---

**Fecha de generación:** 18 de noviembre de 2026  
**Estado:** Todo funcional y conectado a Supabase