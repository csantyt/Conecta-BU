# Módulo Deportes PISU — Rol DOCENTE

Documentación del rol docente: flujo de trabajo, endpoints, modelo de asistencia,
fórmula de aprobación y variables de entorno.

> Todas las rutas cuelgan de `/api/v1/docente` y llevan `Authorization: Bearer <JWT>`.
> El rol se resuelve por el correo institucional pre-registrado en `deporte.usuarios`
> y **solo** el rol `Docente` puede entrar (estudiante y administrador reciben 403).

---

## 1. Flujo del docente

1. **Inicio de sesión**: entra con Google institucional (`@uniautonoma.edu.co`).
   Si su correo ya está registrado como docente PISU, obtiene el rol Docente.
   El administrador es quien crea la cuenta docente (solo nombre y correo) y le
   **asigna los deportes**; el panel del docente se llena con esa asignación.
2. **Mis deportes** (`/docente/mis-deportes`): ve sus deportes, la semana y contadores.
3. **Clases de hoy** (`/docente/hoy`): clases del día con su estado (por comenzar,
   en curso, finalizada) y si la asistencia ya se registró.
4. **Llamar a lista** (`/docente/clases/:horarioId/lista?fecha=YYYY-MM-DD`):
   - Por defecto marca a **todos presentes** (lo más eficiente).
   - Puede marcar ausentes, usar "Todos presentes/ausentes" y guardar.
   - Solo se permite dentro de la **ventana horaria** (o con el modo de pruebas).
   - Tras guardar, la sesión queda bloqueada y editable **24 h**.
5. **Historial** (`/docente/historial`): sesiones registradas, detalle por
   estudiante y matriz estudiantes × fechas.
6. **Mis estudiantes** (`/docente/deportes/:deporteId/estudiantes`): inscritos
   activos con % de asistencia y estado.
7. **Reporte final** (`/docente/deportes/:deporteId/reporte`): aprobados,
   reprobados, promedio; descarga en Excel.

Un docente **desactivado** (`estado = false`) recibe 403 "La cuenta PISU se
encuentra inactiva." en cualquier ruta del módulo.

---

## 2. Endpoints

| Método | Ruta | Permiso | Ejemplo |
| --- | --- | --- | --- |
| GET | `/docente/perfil` | Docente | — |
| GET | `/docente/mis-deportes` | Docente | — |
| GET | `/docente/hoy` | Docente | — |
| GET | `/docente/mis-clases` | Docente | — |
| GET | `/docente/horarios` | Docente | — |
| GET | `/docente/historial?deporteId=<uuid>` | Docente | — |
| GET | `/docente/clases/:horarioId/estudiantes` | Docente (dueño) | — |
| GET | `/docente/clases/:horarioId/lista?fecha=2026-04-20` | Docente (dueño) | — |
| POST | `/docente/asistencia` | Docente (dueño) | ver abajo |
| PUT | `/docente/asistencia/:asistenciaId` | Docente (autor) | `{ "presente": false }` |
| GET | `/docente/deportes/:deporteId/estudiantes` | Docente (dueño) | — |
| GET | `/docente/deportes/:deporteId/reporte` | Docente (dueño) | — |
| GET | `/docente/deportes/:deporteId/reporte/excel` | Docente (dueño) | descarga `.xlsx` |

### Ejemplo: registrar asistencia (POST `/docente/asistencia`)

```json
{
  "horarioId": "6f1e...-uuid",
  "fecha": "2026-04-20",
  "estudiantes": [
    { "estudianteId": "11111111-1111-1111-1111-111111111111", "presente": true },
    { "estudianteId": "22222222-2222-2222-2222-222222222222", "presente": false }
  ]
}
```

Respuestas:

- `201` — `{ "message": "Asistencia registrada.", "asistencias": [...] }`
- `400` — datos inválidos o estudiante sin inscripción activa.
- `403` — la clase/deporte no pertenece al docente.
- `404` — la clase no existe.
- `409` — ya existe asistencia de esa fecha:
  ```json
  {
    "message": "La asistencia de esta clase y fecha ya fue registrada...",
    "codigo": "ASISTENCIA_DUPLICADA",
    "conflicto": { "tipo": "asistencia", "horarioId": "...", "fecha": "2026-04-20" },
    "alternativas": [{ "accion": "editar", "descripcion": "..." }]
  }
  ```
- `422` — fuera de la ventana horaria o fuera del plazo de edición de 24 h.

---

## 3. Modelo de asistencia

Tabla `deporte.asistencias`:

| Columna | Tipo | Nota |
| --- | --- | --- |
| `id` | UUID | PK |
| `horario_id` | UUID | FK a `deporte.horarios` |
| `estudiante_id` | UUID | FK a `deporte.usuarios` |
| `docente_id` | UUID | docente que registró |
| `fecha` | DATE | día de la clase (`YYYY-MM-DD`) |
| `presente` | BOOLEAN | true = asistió |
| `fecha_registro` | TIMESTAMP | cuándo se guardó |

Restricción: **una fila por (`horario_id`, `estudiante_id`, `fecha`)**. Por eso la
segunda toma de la misma fecha responde 409 y la corrección se hace con `PUT`.

**Ventana horaria**: de `inicio − ASISTENCIA_MINUTOS_ANTES` a
`fin + ASISTENCIA_MINUTOS_DESPUES`, el mismo día de la clase.
Ejemplo: clase lunes 16:00–18:00 con 15/120 → abre 15:45 y cierra 20:00.

**Edición**: hasta 24 h después del **fin de la clase**.

---

## 4. Fórmula de aprobación

```
porcentaje = clases asistidas / clases dictadas × 100
aprueba si porcentaje ≥ APROBACION_MIN_ASISTENCIA   (80 % por defecto)
faltas = clases dictadas − clases asistidas
```

`clases dictadas` = número de sesiones distintas (horario + fecha) con asistencia
registrada en el deporte.

Ejemplo numérico (mínimo 80 %):

| Clases dictadas | Faltas que reprueban | Faltas que aprueban |
| --- | --- | --- |
| 10 | 3 o más | 2 o menos |
| 12 | 3 o más | 2 o menos |

Un deporte **sin sesiones** muestra "Sin clases registradas" (no se puede aprobar
ni reprobar todavía).

### Estados por estudiante

- **Al día**: aprobando con margen de más de una falta.
- **En riesgo**: aprueba con el mínimo (o un margen de una falta).
- **Reprobaría**: por debajo del mínimo.
- **Sin clases registradas**: el deporte aún no tiene asistencias.

---

## 5. Excel del reporte (exceljs)

`GET /docente/deportes/:deporteId/reporte/excel` devuelve
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
El archivo se llama `reporte_<deporte>_<AAAA-MM-DD>.xlsx` (sin tildes ni espacios)
y trae tres hojas:

1. **Resumen**: deporte, docente, periodo, tipo (final/parcial), contadores y horarios.
2. **Estudiantes**: asistidas, faltas, %, resultado (verde aprueba / rojo reprueba),
   filtros y primera fila congelada.
3. **Asistencia por fecha**: matriz estudiante × fecha con `P`/`A`, más faltas y resultado.

Si la fecha actual es anterior a `SEMESTRE_FIN`, el encabezado dice **REPORTE PARCIAL**.

---

## 6. Variables de entorno

| Variable | Por defecto | Descripción |
| --- | --- | --- |
| `ASISTENCIA_MINUTOS_ANTES` | `15` | Minutos antes del inicio para abrir la ventana. |
| `ASISTENCIA_MINUTOS_DESPUES` | `120` | Minutos después del fin para cerrar la ventana. |
| `ASISTENCIA_IGNORAR_HORARIO` | `false` | `true` salta la ventana (modo pruebas; muestra aviso naranja). |
| `APROBACION_MIN_ASISTENCIA` | `80` | Porcentaje mínimo para aprobar. |
| `SEMESTRE_INICIO` / `SEMESTRE_FIN` | — | Definen el periodo y si el reporte es parcial o final. |

---

## 7. Cuentas de prueba (seed)

La semilla (`seed.ts`) crea la cuenta docente principal:

- **Kevin Ruiz** — `kevin.ruiz.m@uniautonoma.edu.co` (rol Docente)
  - Deporte **Fútbol**: clase **hoy** dentro de la ventana, 12 estudiantes de 3
    categorías y 8 sesiones pasadas (hay estudiantes que reprueban).
  - Deporte **Baloncesto**: 2 horarios en días distintos y 6 estudiantes.
- Otro docente con **Voleibol** (Kevin NO lo ve).
- **Atletismo** sin docente (se ve vacío en el panel).
- Un comunicado para **Docentes** y otro para **Todos**.

Al iniciar el backend, la consola imprime el listado de usuarios de prueba por rol.

---

## 8. Asignación de deportes (panel administrador)

El administrador es quien **crea los docentes** y les **asigna los deportes**. La
asignación es directa (tabla puente `deporte.deportes_docentes`) y hace que el
deporte aparezca en el panel del docente **aunque todavía no tenga horarios
publicados**.

| Método | Ruta | Permiso | Ejemplo |
| --- | --- | --- | --- |
| GET | `/admin/docentes` | Administrador | devuelve cada docente con `deportes[]` |
| POST | `/admin/docentes` | Administrador | `{ "nombre": "...", "correo": "docente@uniautonoma.edu.co" }` |
| PUT | `/admin/docentes/:docenteId/deportes` | Administrador | `{ "deporteIds": ["<uuid-deporte>"] }` |

Reglas:

- Solo se pueden asignar deportes a usuarios con rol **Docente** y activos
  (otro rol o inactivo → `400`).
- Deporte inexistente → `404`.
- La lista enviada **reemplaza** la asignación completa: si se omite un deporte,
  se desasigna. Ejemplo: tenía `[Fútbol, Baloncesto]` y se envía `[Baloncesto]`
  → queda solo `Baloncesto`.
- Un deporte asignado **sin horarios** se muestra con un aviso "sin horario"; la
  toma de asistencia sigue requiriendo un horario publicado (`/admin/horarios`).

El listado `GET /admin/docentes` incluye, por cada deporte, si el docente ya tiene
horario (`tiene_horario`): en la interfaz aparece como etiqueta azul (con horario)
o ámbar (asignado, sin horario).

---

## 9. Eventos creados por el docente (torneos, masterclass, etc.)

El docente puede crear eventos ligados a **sus** deportes. Los estudiantes se
inscriben a ellos desde su catálogo de eventos. El administrador conserva sus
propias rutas (`/admin/eventos`) y ve el evento con la columna "Creado por".

### 9.1 Endpoints (rol Docente)

Base: `/api/v1/deportes/docente/eventos` (protegido por `authMiddleware` + rol
Docente; otro rol → `403`).

| Método | Ruta | Qué hace |
| --- | --- | --- |
| GET | `/` | Lista los eventos creados por el docente o de sus deportes, con inscritos y cupos libres |
| POST | `/` | Crea un evento (valida deporte propio, fecha, horas, cupo y plazo) |
| PUT | `/:id` | Edita un evento propio (no baja el cupo bajo los inscritos; avisa cambios) |
| POST | `/:id/cancelar` | Cancela con motivo (con inscritos) o elimina (sin inscritos) |
| GET | `/:id/inscritos` | Lista los inscritos (búsqueda `?q=`); `?formato=csv` descarga el CSV |

### 9.2 Reglas de negocio

- **Deporte propio**: el `deporte_id` debe estar asignado al docente (por horario o
  por asignación directa). Ejemplo: Kevin intenta crear un evento del deporte de
  Sofía → `403`.
- **Fecha**: no puede ser pasada; `hora_fin` debe ser posterior a `hora_inicio`;
  `cupo_maximo` mayor que 0; `fecha_limite_inscripcion` anterior al inicio.
- **Categorías**: si se envían, deben ser un subconjunto de las del deporte
  (ejemplo: el deporte permite `[Pregrado, Postgrado]` y se envía `[Egresado]` →
  `400`).
- **Conflicto de lugar (409)**: mismo `lugar`, mismo día y franja solapada con otro
  evento **o** con una clase de deporte. Respuesta:

  ```json
  {
    "message": "El lugar 'Cancha principal' ya está ocupado por 'Fútbol 11' el lunes de 4:00 p. m. a 6:00 p. m.",
    "codigo": "CONFLICTO_CLASE",
    "conflicto": { "tipo": "clase", "nombre": "Fútbol 11", "lugar": "Cancha principal", "fecha": "2026-10-20", "horaInicio": "16:00", "horaFin": "18:00" },
    "alternativas": ["Cancha sintética", "Coliseo auxiliar"]
  }
  ```

  Al editar, un evento **no choca consigo mismo**. Además, si el docente ya tiene
  una clase en ese mismo bloque, se devuelve un **aviso** (no bloquea).
- **Cupo**: nunca por debajo de los inscritos (`409` `CUPO_MENOR_QUE_INSCRITOS`).
- **Cambio de fecha/hora/lugar** con inscritos: se genera automáticamente un
  comunicado (campana) a los inscritos y se devuelve un aviso.
- **Cancelación**: con inscritos → el evento queda `estado_evento = "cancelado"`
  con `motivo_cancelacion` y se comunica a los inscritos; sin inscritos → se
  elimina.
- **Comunicados**: al crear, se avisa a los estudiantes ya inscritos en el deporte
  ("Nuevo evento: <nombre> el <fecha>"). Se guardan como `Alerta` personales del
  estudiante con una `clave` única para no duplicar.

### 9.3 Inscripción del estudiante

El estudiante se inscribe al evento con `POST /api/v1/eventos/:id/participacion`
(o `/estudiante/eventos/:id/inscripcion`). Se valida, en una transacción con
`LOCK.UPDATE`:

- evento publicado (cancelado → `409`), plazo vigente (`PLAZO_VENCIDO`),
  categoría permitida (`CATEGORIA_NO_PERMITIDA`), cupo disponible;
- **sin cruce de horario** con las clases de sus otros deportes ni con otros
  eventos ya inscritos (`CRUCE_HORARIO`).

El botón se deshabilita cuando el evento está lleno. Los eventos cancelados
desaparecen del catálogo y aparecen en "Mis eventos" con la etiqueta "Cancelado"
y el motivo (`GET /estudiante/eventos/mios`).

### 9.4 Semilla de prueba (Kevin)

Al iniciar, la semilla crea (idempotente) para **Kevin Ruiz**:

- un torneo próximo con 3 inscritos (`Torneo relámpago de fútbol`);
- una masterclass con el cupo casi lleno (`Masterclass de baloncesto`, 4 de 5);
- un evento cancelado con motivo (`Amistoso de fútbol suspendido`);
- un evento de **otra** docente (`Clínica de voleibol`, de Sofía) que Kevin NO
  puede editar ni cancelar.

## 10. Acceso estudiantil con correo institucional (sección 10.1)

Cualquier usuario autenticado con una cuenta institucional `@uniautonoma.edu.co`
entra al portal de Bienestar Universitario como **Estudiante**, sin crear un
inicio de sesión paralelo ni tocar los permisos actuales.

### 10.1 Reglas del dominio

| Regla | Implementación |
| --- | --- |
| Dominio exacto | `normalizarCorreoInstitucional()` (`modules/auth/roles.ts`): exige exactamente un `@` y que el dominio sea **igual** al institucional |
| Sin espacios | se aplica `trim()` y se rechaza cualquier espacio interno |
| Sin distinguir mayúsculas | se compara todo en minúsculas |
| Otros dominios | `@gmail.com`, `@hotmail.com`, etc. → **403** |
| Dominio parecido | `estudiante@uniautonoma.edu.co.otrodominio.com` → **403** (no basta con contener el texto) |
| Validación en el cliente | `frontend/src/auth/googleToken.ts` usa la misma regla; la definitiva es la del servidor |
| Correo verificado | se exige `email_verified === true` del token de Google |

La comprobación se aplica en el middleware global (`src/middlewares/authMiddleware.ts`),
así que ningún endpoint del sistema acepta un token de otro dominio.

### 10.2 Perfil automático y único

`resolverPerfilPisu()` (`modules/deporte/middlewares/authMiddleware.ts`):

1. busca la ficha por `auth_usuario_id` (vínculo único, índice en base de datos);
2. si no existe, adopta una ficha del mismo correo que aún no esté vinculada;
3. si no existe ninguna, la crea con el nombre verificado por Google y
   `correo` normalizado. Varias peticiones simultáneas no duplican el perfil:
   el `UniqueConstraintError` se captura y se reutiliza la ficha ya creada.

**No se inventan datos personales**: la *categoría académica* nace vacía
(`categoria = NULL`). El estudiante la completa con
`PATCH /api/v1/estudiante/perfil` (`{ "categoria": "Pregrado" | "Postgrado" | "Egresado" }`);
hasta entonces puede navegar el catálogo pero no inscribirse.

### 10.3 Separación de roles

- Un usuario institucional sin rol elevado entra como **Estudiante** y recibe
  **403** en `/api/v1/admin/*` y `/api/v1/deportes/docente/*`.
- Los **administradores** y **docentes** conservan exactamente sus permisos.
- Los permisos elevados solo se otorgan por los mecanismos administrativos del
  sistema (panel de roles), nunca por el dominio del correo.
- Las consultas de horarios, inscripciones, perfil y asistencias se resuelven
  siempre con la sesión validada (`req.usuarioPisu`), nunca con un id enviado
  por el cliente.

### 10.4 Funcionalidad habilitada

Catálogo de deportes publicados, horarios y docente responsable, inscripción con
validación de cupo/categoría/cruce, "Mis deportes", "Mi horario", eventos
institucionales (inscripción y "Mis eventos"), comunicados, asistencias y
ausencias.

### 10.5 Pruebas

- Unitarias: `tests/unit/auth.roles.test.ts` (dominio exacto, espacios, mayúsculas, dominios parecidos, varios `@`).
- Integración: `tests/integration/deporte.accesoInstitucional.test.ts` cubre los 8 escenarios obligatorios de la sección 10.1.


