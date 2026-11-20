# ADR-019 · Actualizar `@nestjs/schedule` a la v12 (solo ESM) sin migrar el backend a ESM

**Estado:** Aceptado · **Fecha:** 20/11/2026 · **Origen:** deuda D-08 (`docs/deuda-sprint-3.md`)

## Contexto
El marcado diario de vencidos (ST-32, RN-06) usa `@nestjs/schedule`. Se fijó en la v6 porque la v12 se publica **solo como ESM** (`"type": "module"`) y el backend compila a CommonJS. La línea 6.x ya no recibe versiones nuevas (la última es 6.1.3), así que quedarse ahí deja el cron sin correcciones de seguridad.

Se probó la v12.0.4 (peer `@nestjs/common` ^11 || ^12, compatible con Nest 11):

- **Ejecución:** Node 24 (`.nvmrc`, también en Railway) carga módulos ESM con `require()`. El `dist/` en CommonJS arranca y el `SchedulerRegistry` registra el cron `5 0 * * *` (America/Lima) y el marcado al arrancar.
- **Jest:** falla con "contains ESM syntax" porque Jest no usa el `require()` nativo de Node.

## Decisión
- Actualizar a `@nestjs/schedule@^12`.
- En Jest (unitarias y e2e), dejar que ts-jest transforme solo ese paquete: `transformIgnorePatterns: ["/node_modules/(?!@nestjs/schedule/)"]` y `allowJs: true`.
- No migrar el backend a ESM ni cambiar Jest por Vitest: sería un cambio grande para un solo paquete.

## Alternativas descartadas
- **Quedarse en la v6:** sin parches futuros.
- **Migrar el backend a ESM:** toca la configuración de TypeORM, el CLI de migraciones y las rutas de importación.
- **Vitest en el backend:** reescribir 36 suites unitarias y 18 e2e.

## Consecuencias
- Se requiere Node ≥ 20.19 (la v12 lo declara en `engines`); el proyecto ya usa Node 24.
- Si otra dependencia pasa a ser solo ESM, se agrega a la misma excepción de `transformIgnorePatterns`, en `package.json` y en `test/jest-e2e.json`.
- Cuando el proyecto pase a Nest 12, se revisará si conviene migrar todo el backend a ESM.
- Verificación: build, cobertura (261 pruebas), e2e (170), arranque con el cron registrado, y `npm ci --dry-run` con npm 11.19.1 (CI) y 11.6.2 (local).
