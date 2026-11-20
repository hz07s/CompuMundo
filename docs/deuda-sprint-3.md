# Deuda técnica del Sprint 3 (insumo para el Planning 4)

Hallazgos de la revisión de cierre (rama `fix/cierre-sprint-3`) que **no** se corrigieron por ser menores o por tamaño. Estimación en puntos (escala del equipo).

| # | Hallazgo | Riesgo | Propuesta | Est. |
| --- | --- | --- | --- | --- |
| D-01 | No hay prueba de dos devoluciones simultáneas del mismo préstamo (HU-005). El código usa `pessimistic_write` dentro de la transacción. | Bajo: una regresión que quite el bloqueo pasaría inadvertida. | e2e que lance dos `PATCH /prestamos/:id/devolucion` en paralelo y espere un 200 y un 409. | 1 |
| D-02 | Si falla la descarga de Excel o PDF, el cuerpo del error llega como `Blob` y la pantalla muestra un mensaje genérico. | Bajo: el usuario no ve la causa real (p. ej., 401 tras expirar la sesión). | En `reportesApi`, leer `await blob.text()` y parsear el JSON del error antes de `normalizarError`. | 1 |
| D-03 | `URL.revokeObjectURL` se llama justo después de `click()`. | Bajo: algunos navegadores podrían cancelar la descarga. | Revocar en un `setTimeout(…, 0)` o al desmontar. | 0,5 |
| D-04 | La tabla del reporte no tiene `<caption>` ni `scope="col"`. | Bajo: accesibilidad con lector de pantalla. | Agregar `<caption>` y `scope` en los `<th>`. | 0,5 |
| D-05 | El orden de las filas con el mismo atraso no es estable entre pantalla y archivos generados en momentos distintos. | Bajo: dos exportaciones pueden diferir en el orden de los empates. | Desempatar por código del ejemplar en `ReportesService.morosidad()`. | 0,5 |
| D-06 | Los e2e comparten la BD de desarrollo: `reportes.e2e-spec.ts` filtra sus filas, pero un dato ajeno con DNI completo o atraso extraño puede romperlo. HU-006 #5 (vacío) y HU-005 #8 solo tienen prueba unitaria o de pantalla. | Medio: pruebas frágiles en CI o en máquinas con datos. | BD de pruebas separada (`DATABASE_URL_TEST`) con limpieza por suite; e2e del reporte vacío. | 2 |
| D-07 | El marcado masivo no registra `actualizadoPor` (excepción documentada en `docs/decisiones.md`). | Bajo: la auditoría no distingue cron, arranque o reporte. | Usuario técnico "SISTEMA" o columna de origen, si el PO lo pide. | 1 |
| D-08 | `@nestjs/schedule` está fijado en v6 (la v12 es solo ESM). | Bajo: queda sin actualizaciones de seguridad a futuro. | Evaluar Jest con ESM o migrar a Vitest en el backend. | 2 |
| D-09 | `test/reportes.e2e-spec.ts` no compila con `tsc --noEmit` (el `Buffer` de supertest frente al de `exceljs`); ts-jest lo ejecuta igual. | Bajo: ruido en el IDE. | Cast a `ArrayBuffer`, como en `exportadores.spec.ts`. | 0,5 |

## Estado al 20/11/2026 (rama `fix/deuda-sprint-3`)

| # | Estado | Cómo se resolvió |
| --- | --- | --- |
| D-01 | Resuelto | e2e `HU-005 #5 … (D-01)`: retiene la fila con `FOR UPDATE` para forzar la carrera; falla si se quita `pessimistic_write`. |
| D-02 | Resuelto | `reportesApi` parsea el cuerpo `Blob` del error y la pantalla muestra el mensaje del servidor. |
| D-03 | Resuelto | `revokeObjectURL` en un `setTimeout` después del `click()`. |
| D-04 | Resuelto | `<caption>` y `scope="col"` en la tabla del reporte. |
| D-05 | Resuelto | Desempate por código del ejemplar en `ReportesService.morosidad()`. |
| D-06 | Resuelto | Los e2e usan su propia BD (`DATABASE_URL_TEST` o `<bd>_test`, creada por `test/global-setup.ts`); e2e de HU-006 #5 en `reportes-vacio.e2e-spec.ts`. |
| D-07 | **Pendiente del PO** | `docs/decisiones.md` documenta la excepción a DoD-7; solo se implementa si el PO la pide en la Review 3. |
| D-08 | Resuelto | `@nestjs/schedule` v12 con transformación en Jest ([ADR-019](adr/ADR-019-nestjs-schedule-esm.md)). |
| D-09 | Resuelto | Cast a `ArrayBuffer`; el CI ahora corre `npm run typecheck`, que incluye `test/`. |
