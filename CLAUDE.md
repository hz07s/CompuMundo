# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proyecto

CompuMundo CEDIS: sistema de biblioteca (MVP). Monorepo sin workspaces: `backend/` (NestJS 11 + TypeORM + PostgreSQL 16, Jest) y `frontend/` (React 19 + Vite + React Router, Vitest). Código, comentarios, commits y nombres de pruebas en **español**. Los identificadores de requisitos (HU-xxx, ST-xx, RN-xx, RF-xx, RNF-xx, ADR-xxx, P-xx) aparecen en comentarios y nombres de pruebas; consérvalos y úsalos al agregar código. Supuestos de negocio vigentes: `docs/decisiones.md`.

Requiere Node 24 / npm 11 (`.nvmrc`); con npm 10 `npm ci` falla por los lockfiles.

## Comandos

Base de datos local: `docker compose up -d` (PostgreSQL en el puerto **5433**, usuario/clave/BD `compumundo`).

Backend (`cd backend`):

```bash
npm run start:dev                 # API en :3000 (Swagger en /api/docs, health en /health)
npm run build
npm run lint:ci                   # ESLint sin warnings, como en CI (`lint` aplica --fix)
npm run format:check              # Prettier
npm test                          # unitarias (src/**/*.spec.ts)
npx jest src/prestamos/morosidad.service.spec.ts      # un archivo
npx jest -t "HU-001 #2"                                # por nombre de prueba
npm run test:cov                  # cobertura: falla bajo 70 % global u 85 % en src/auth
npm run test:e2e                  # e2e (test/*.e2e-spec.ts), necesita PostgreSQL arriba
npx jest --config ./test/jest-e2e.json --runInBand test/prestamos.e2e-spec.ts   # un e2e
npm run migration:generate -- src/database/migrations/NombreCambio
npm run migration:run / migration:revert
npm run seed                      # Administrador inicial (idempotente)
```

Frontend (`cd frontend`):

```bash
npm run dev                       # :5173
npm run build                     # tsc -b + vite build
npm run lint                      # --max-warnings=0
npm run format:check
npm test                          # vitest run
npx vitest run src/pages/LoginPage.test.tsx           # un archivo
```

CI (`.github/workflows/ci.yml`) corre: backend build → Prettier → ESLint → cobertura → migraciones → e2e; frontend Prettier → ESLint → Vitest → build. Antes de dar algo por terminado, ejecutar los equivalentes locales.

### Trampa del `.env`

`backend/src/config/env.validation.ts` valida el entorno con Joi al arrancar (también en el seed y en e2e, que cargan `.env` vía `dotenv/config`). Las variables opcionales como `GOOGLE_CLIENT_ID` / `ADMIN_GOOGLE_EMAIL` fallan si están definidas **vacías** (`VAR=`): hay que omitirlas o comentarlas.

## Arquitectura del backend

- **Un módulo Nest por dominio** (`auth`, `usuarios`, `catalogo`, `lectores`, `prestamos`, `reportes`, `health`), cada uno con `entities/`, `dto/`, `*.service.ts`, `*.controller.ts` y los `*.spec.ts` al lado.
- **Guards globales** registrados como `APP_GUARD` en `auth.module.ts`, en orden: `JwtAuthGuard` (401) y luego `RolesGuard` (403). Toda ruta exige token salvo `@Public()`; los roles se restringen con `@Roles(Rol.X)` en controller o método (el del método gana). Roles: `ADMINISTRADOR`, `BIBLIOTECARIO`. La matriz de permisos está en el README.
- **Piezas transversales** en `common/` (módulo `@Global`): `HttpExceptionFilter` como `APP_FILTER` y el `ValidationPipe` como `APP_PIPE`, así aplican también en e2e. Todos los errores tienen la forma `{ statusCode, error, message, errors?, path, timestamp }`; los de validación agrupan `errors` por campo. El pipe rechaza propiedades no declaradas en el DTO (un campo extra da 400).
- `setup-app.ts` configura CORS y Swagger; lo usan `main.ts` y las pruebas e2e. Un módulo con controller nuevo necesita su `addTag` ahí.
- **Auth** (P-17): access token JWT (8 h) devuelto en el cuerpo; refresh token en cookie httpOnly, guardado en BD solo como hash, rotado en cada uso y revocado en logout. HU-022 añade login con Google (`google-auth.service.ts`), que solo entra a usuarios ya registrados.
- **Auditoría**: las entidades de negocio extienden `EntidadAuditada` (`common/entities/auditoria.entity.ts`) con `creadoPor` / `actualizadoPor`. Las bajas son lógicas (columna `activo`).
- **Esquema solo por migraciones** (`synchronize: false`); toda migración necesita un `down`. El DataSource del CLI es `src/database/data-source.ts`.
- **Reglas de dominio relevantes**:
  - Código de ejemplar `CEDIS-{AÑO}-{SECUENCIAL6}` reiniciado por año (`catalogo/codigo-ejemplar.service.ts`).
  - Validación de DNI detrás de la interfaz `IDniValidator` inyectada con el token `DNI_VALIDATOR` (`lectores/validacion/`); la implementación actual es `FormatoDniValidator` y está pensada para reemplazarse (p. ej. RENIEC) sin tocar `LectoresService`. Hay una prueba de arquitectura que lo vigila. El DNI se enmascara según rol y contexto (`common/utils/dni.ts`).
  - Préstamos: fecha de devolución = 3 días hábiles (lun–vie sin feriados de Perú vía `date-holidays`, fechas `AAAA-MM-DD` de Lima) en `dias-habiles.service.ts`; un solo préstamo activo por lector (índice único en BD + `reglas-prestamo.service.ts`); morosidad con advertencia, bloqueo y desbloqueo por el Administrador (`morosidad.service.ts`, `desbloqueos.controller.ts`).
- **Swagger**: todo endpoint nuevo lleva `@ApiTags`, `@ApiOperation`, `@ApiResponse` por cada código posible y `@ApiBearerAuth()` si requiere sesión; los DTOs usan `@ApiProperty`.

### Pruebas e2e

`test/utils/create-test-app.ts` levanta el `AppModule` completo contra la BD de `DATABASE_URL`, aplica migraciones y acepta un callback para sobrescribir proveedores (p. ej. `DNI_VALIDATOR`). `test/utils/usuarios-de-prueba.ts` crea usuarios por rol y obtiene sus tokens. Las pruebas comparten la BD de desarrollo y limpian sus propios datos; corren con `--runInBand`.

## Arquitectura del frontend

- Organización por feature en `src/features/<dominio>/` (`*Api.ts`, `types.ts`, formularios, validadores) y páginas en `src/pages/`; rutas en `src/router.tsx`.
- `src/services/api.ts`: instancia axios con `withCredentials`, que agrega `Authorization` y ante un 401 llama una vez a `renovarSesion()` y reintenta.
- La sesión vive **solo en memoria** (`features/auth/sesionStore.ts`); al recargar se recupera con el refresh token (`RestaurarSesion.tsx`). No usar localStorage para tokens.
- `features/auth/rutas.ts` es la única fuente de rutas, de los roles permitidos por ruta (`ROLES_POR_RUTA`, que usa `ProtectedRoute`) y de la página de inicio de cada rol.
- Pruebas con Testing Library + jsdom; `src/test/renderConRutas.tsx` monta componentes dentro del router.

## Flujo de trabajo

- `main` protegida: solo por PR con 1 aprobación y CI en verde. Una rama por tarjeta desde `main`: `feat/ST-07-login-jwt`, `fix/…`, `chore/…`, `test/…`, `docs/…`.
- Conventional Commits en español con la tarjeta al final: `feat(auth): endpoint POST /auth/login con JWT (ST-07)`. Tipos: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, `ci`.
- Los PR usan `.github/pull_request_template.md` (checklist del DoD).
- Los nombres de las pruebas incluyen el escenario: `HU-001 #2 credenciales incorrectas → 401`.
