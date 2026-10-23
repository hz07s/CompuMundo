# CompuMundo CEDIS · MVP

Sistema de biblioteca del CEDIS. Monorepo con:

| Carpeta | Stack | Despliegue |
| --- | --- | --- |
| [`backend/`](backend) | NestJS 11 · TypeScript estricto · TypeORM · PostgreSQL 16 · Jest | Railway |
| [`frontend/`](frontend) | React 19 · Vite · React Router · Vitest | Vercel |

Sprint 1 «Plataforma, autenticación y catálogo»: T-001 + HU-001 + HU-002. Los supuestos adoptados están en [`docs/decisiones.md`](docs/decisiones.md).

## Requisitos

- Node.js 24 con npm 11 (ver `.nvmrc`). Con Node 22 / npm 10 `npm ci` falla porque los lockfiles están generados con npm 11.
- Docker Desktop (para PostgreSQL local) o un PostgreSQL 16 propio

## Arranque rápido

```bash
# 1. Base de datos local (queda en el puerto 5433)
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env        # ajustar si hace falta
npm install
npm run migration:run
npm run seed                # crea el Administrador inicial (ADMIN_USERNAME / ADMIN_PASSWORD)
npm run start:dev           # http://localhost:3000

# 3. Frontend (otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Comprobaciones:

- `GET http://localhost:3000/health` → 200 con `database: up`
- Swagger UI: http://localhost:3000/api/docs · especificación JSON: http://localhost:3000/api/docs-json
- El frontend muestra «API: conectada».

## Comandos

### Backend (`cd backend`)

| Comando | Qué hace |
| --- | --- |
| `npm run start:dev` | API con recarga en caliente |
| `npm run build` | Compila a `dist/` |
| `npm run lint` / `npm run lint:ci` | ESLint (con `--fix` / sin warnings permitidos, como en CI) |
| `npm run format` / `npm run format:check` | Prettier |
| `npm test` | Pruebas unitarias |
| `npm run test:cov` | Unitarias con cobertura; falla bajo 70 % global u 85 % en `src/auth` |
| `npm run test:e2e` | Pruebas e2e (necesitan PostgreSQL arriba) |
| `npm run migration:generate -- src/database/migrations/NombreCambio` | Genera una migración a partir de las entidades |
| `npm run migration:create -- src/database/migrations/NombreCambio` | Crea una migración vacía |
| `npm run migration:run` / `npm run migration:revert` | Aplica / revierte la última migración |
| `npm run seed` | Crea el Administrador inicial si no existe (idempotente) |

### Frontend (`cd frontend`)

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo de Vite |
| `npm run build` | Typecheck + build de producción |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

## Estructura del backend

```
backend/src/
├── auth/          HU-001 · login, JWT, refresh, guards RBAC
├── catalogo/      HU-002 · obras, ejemplares, generador de códigos
├── lectores/      HU-003
├── prestamos/     HU-004 / HU-005
├── reportes/
├── usuarios/      entidad Usuario, roles y seed del Administrador (ST-06)
├── common/        filtro global de errores, ValidationPipe, DTOs base (paginación)
├── config/        validación de variables de entorno (Joi)
├── database/      configuración TypeORM, DataSource del CLI y migraciones
├── health/        GET /health (ping a PostgreSQL)
├── app.module.ts
├── setup-app.ts   CORS + Swagger (compartido con las pruebas e2e)
└── main.ts
```

Convenciones del backend:

- Cada dominio es un módulo Nest con su carpeta: `entities/`, `dto/`, `*.service.ts`, `*.controller.ts` y sus `*.spec.ts` al lado.
- El esquema solo cambia con **migraciones** (`synchronize` está desactivado). Toda migración debe tener un `down` que la revierta.
- Los errores siguen siempre la forma `{ statusCode, error, message, errors?, path, timestamp }`. Los errores de validación devuelven `errors` agrupados por campo, p. ej. `{ "cantidad": ["cantidad must be a positive number"] }`.
- Las bajas son lógicas (columna `activo`, RNF-07).

### Convención de Swagger

Todo endpoint nuevo lleva:

- `@ApiTags('<módulo>')` en el controller (y su `addTag` en `setup-app.ts`),
- `@ApiOperation({ summary })` con una descripción corta,
- `@ApiResponse` / `@ApiOkResponse`… para cada código que puede devolver (200/201, 400, 401, 403, 404),
- `@ApiBearerAuth()` si requiere sesión.

Los DTOs usan `@ApiProperty` para que el esquema aparezca en `/api/docs`.

## Flujo de trabajo

### Ramas

- `main` está protegida: solo entra código por PR con **1 aprobación** y **CI en verde**. No se hace push directo.
- Una rama por tarjeta, creada desde `main`:
  - `feat/ST-07-login-jwt`
  - `fix/ST-13-validacion-cantidad`
  - `chore/ST-03-ci`, `docs/…`, `test/…`

### Commits

[Conventional Commits](https://www.conventionalcommits.org/es/) en español, con la tarjeta entre paréntesis:

```
feat(auth): endpoint POST /auth/login con JWT (ST-07)
fix(catalogo): rechazar cantidad no entera (ST-13)
test(auth): escenario HU-001 n.° 3 rol incorrecto 403 (ST-11)
chore(ci): umbral de cobertura en auth (ST-03)
```

Tipos: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`.

### Pull requests

- Se abren contra `main` usando la plantilla (`.github/pull_request_template.md`), que incluye el checklist del Definition of Done.
- El revisor es el indicado en la ST.
- Los nombres de las pruebas incluyen el identificador del escenario (p. ej. `HU-001 #2 credenciales incorrectas → 401`).

## Integración continua

`.github/workflows/ci.yml` corre en cada PR y en cada push a `main`:

- **Backend**: `npm ci` con caché → build → Prettier → ESLint → pruebas unitarias con cobertura → migraciones → e2e contra un PostgreSQL de servicio. El reporte de cobertura queda como artefacto `coverage-backend` y como resumen del job.
- **Frontend**: `npm ci` → Prettier → ESLint → Vitest → build.

Umbrales de cobertura: 70 % global (Jest) y 85 % en `src/auth` (`backend/scripts/check-coverage.mjs`). Para endurecer otra carpeta, agregarla en `THRESHOLDS` de ese script.

### Proteger `main` (una sola vez, tras crear el repo en GitHub)

En GitHub: *Settings → Branches → Add rule* para `main` con «Require a pull request» (1 aprobación), «Require status checks» (los dos jobs de CI) e «Include administrators». O con el CLI de GitHub:

```bash
./scripts/proteger-main.sh <owner>/<repo>
```

## Despliegue

### Backend en Railway (ST-02)

1. Crear un proyecto en Railway, agregar **PostgreSQL** y un servicio desde este repositorio de GitHub con **Root Directory** = `backend`.
2. En el servicio del backend, cargar las variables (pestaña *Variables*):

   | Variable | Valor |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referencia al servicio de BD) |
   | `JWT_SECRET` | cadena aleatoria de 32+ caracteres (`openssl rand -base64 48`) |
   | `JWT_ACCESS_EXPIRES_IN` | `8h` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `NODE_ENV` | `production` |
   | `CORS_ORIGIN` | URL del frontend en Vercel, p. ej. `https://compumundo-cedis.vercel.app` |
   | `ADMIN_USERNAME` / `ADMIN_PASSWORD` | credenciales del Administrador inicial (seed) |

3. `backend/railway.json` ya define: build `npm ci && npm run build`, **migraciones y seed antes de cada despliegue** (`preDeployCommand`), arranque `npm run start:prod` y healthcheck en `/health`.
4. Activar el despliegue automático desde `main` (*Settings → Source*). Con «Wait for CI» activado, Railway solo despliega si el CI pasó.

**Redeploy:** en Railway, *Deployments → ⋯ → Redeploy* sobre el despliegue actual.
**Rollback:** *Deployments → ⋯ → Rollback* sobre el último despliegue sano. Si el despliegue fallido aplicó una migración, revertirla antes con `railway run npm run migration:revert` (o desde una terminal con la `DATABASE_URL` de producción).

### Frontend en Vercel

1. Importar el repositorio en Vercel con **Root Directory** = `frontend` (Vercel detecta Vite).
2. Variable de entorno `VITE_API_URL` = URL pública del backend en Railway.
3. `frontend/vercel.json` reescribe todas las rutas a `index.html` para que funcione React Router.

## Matriz de permisos (ST-08)

Toda ruta exige access token salvo las marcadas con `@Public()`. Sin token o con token vencido → **401**; con un rol no permitido → **403**.

| Módulo / endpoints | Público | Administrador | Bibliotecario |
| --- | --- | --- | --- |
| `GET /health`, `/api/docs` | ✔ | ✔ | ✔ |
| Auth: `POST /auth/login`, `/auth/refresh`, `/auth/logout` | ✔ | ✔ | ✔ |
| Auth: `GET /auth/me` | ✘ | ✔ | ✔ |
| Usuarios y roles: `GET /usuarios` | ✘ | ✔ | ✘ |
| Catálogo: alta y consulta de obras y ejemplares (`/obras`) | ✘ | ✘ | ✔ |
| Lectores | ✘ | _por definir_ | _por definir_ |
| Préstamos | ✘ | _por definir_ | _por definir_ |
| Reportes | ✘ | _por definir_ | _por definir_ |

El catálogo es solo del Bibliotecario según el supuesto de [`docs/decisiones.md`](docs/decisiones.md).

Cómo restringir una ruta:

```ts
@Roles(Rol.BIBLIOTECARIO)     // en el controller o en un método; el del método tiene prioridad
@Controller('obras')
export class ObrasController {}

@Public()                     // ruta sin access token
@Post('login')
login() {}
```
