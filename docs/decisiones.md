# Decisiones y supuestos del Sprint 1

Supuestos adoptados mientras se cierran los pendientes. Cuando una decisión se confirme, actualizar la fila (y, si aplica, registrar un ADR en esta carpeta).

| Pendiente | Afecta a | Supuesto vigente | Estado |
| --- | --- | --- | --- |
| P-31 · alcance de T-001 | ST-02, ST-05, ST-10 | Backend y PostgreSQL en Railway; frontend en Vercel desde `main`; sin staging separado. | Por confirmar en la Planning (ST-05) |
| P-17 · tokens | ST-07, ST-10, ST-11 | Access token en memoria del cliente; refresh token en cookie httpOnly; en BD solo su hash, rotado en cada uso y revocado en logout. | Supuesto |
| P-21 · cuentas del personal | ST-06, HU-021 | Sin autorregistro. Un seed crea el Administrador inicial (`ADMIN_USERNAME`/`ADMIN_PASSWORD`) y este crea los Bibliotecarios desde *Usuarios* (HU-021). | Propuesto en [ADR-020](adr/ADR-020-hu-021-cuentas-personal.md), pendiente del PO |
| P-18 · campos de la obra | ST-12–14 | Título, categoría, autores, fecha de publicación y cantidad. Confirmar si se agregan volumen y año de edición (RF-12). | Confirmar con el bibliotecario |
| P-24 · código de ejemplar | ST-12 | `CEDIS-{AÑO}-{SECUENCIAL}`: año de alta y secuencial de 6 dígitos que se reinicia cada año (`CEDIS-2026-000001`). | Supuesto |
| ORM y pruebas | ST-01 | TypeORM con migraciones; Jest en backend, Vitest en frontend. | Adoptado en el repo |
| Permisos del Administrador sobre el catálogo | ST-08, ST-13 | El alta de obras es solo del Bibliotecario; el Administrador gestiona usuarios y roles. | Supuesto |

## ST-05 · Acuerdo de alcance de T-001

Registrar aquí lo que se decida en la Sprint Planning:

- [ ] ¿T-001 incluye desplegar el frontend en Vercel?
- [ ] ¿Habrá staging separado o solo producción?
- [ ] ¿El despliegue desde `main` es automático o manual?
- [ ] ¿El dominio .pe entra en este sprint?

## Decisiones del Sprint 3

Supuestos adoptados para no bloquear HU-005 y HU-006 (replanificación por la semana de exámenes, ver [ADR-018](adr/ADR-018-recorte-sprint-3.md)).

| ID | Pendiente | Supuesto adoptado | Estado |
| --- | --- | --- | --- |
| RN-06 | Hora del marcado diario de vencidos | 00:05, zona `America/Lima`, con `@nestjs/schedule`. Es idempotente. `POST /prestamos/vencidos/marcar` (solo Administrador) lo ejecuta a mano para pruebas y demos. | Supuesto, confirmar en la Review 3 |
| RN-06b | Servidor dormido (Railway) a esa hora | El reporte de morosidad ejecuta el marcado antes de consultar, así nunca muestra datos desactualizados. | Supuesto, confirmar en la Review 3 |
| P-18 | Columnas del reporte de morosidad | Código del ejemplar · Título de la obra · Lector (nombres y apellidos) · DNI enmascarado `****1234` · Fecha de préstamo · Fecha de devolución pactada · Días de atraso (días calendario desde la fecha pactada hasta hoy, en Lima) · Registrado por. Orden: más días de atraso primero. | Supuesto, confirmar en la Review 3 |
| HU-005 | Ubicar el préstamo en la devolución | Por el código del ejemplar: `GET /prestamos/activo?codigoEjemplar=` y luego `PATCH /prestamos/:id/devolucion`. | Supuesto, confirmar en la Review 3 |
| HU-005 | Historial de "estuvo vencido" (RN-02) | Sin columna nueva: un préstamo devuelto con atraso es aquel con `fecha_devuelto > fecha_devolucion`, el mismo criterio de `morosidad.service.ts`. | Supuesto, confirmar en la Review 3 |
| HU-006 | Roles con acceso al reporte | Bibliotecario y Administrador. El DNI va siempre enmascarado, en pantalla y en los archivos exportados (DoD-8). | Supuesto, confirmar en la Review 3 |

### Notas técnicas

1. **Versión de `@nestjs/schedule`.** Actualizada a `^12` (solo ESM) sin migrar el backend: Node 24 la carga con `require()` y Jest la transforma con `transformIgnorePatterns`. Ver [ADR-019](adr/ADR-019-nestjs-schedule-esm.md).
2. **`actualizadoPor` en el marcado masivo de vencidos.** El `UPDATE` de `VencidosService.marcar()` no rellena `actualizadoPor` porque lo ejecuta el sistema (cron o proceso previo al reporte), no una persona. Esta es la justificación de DoD-7: la auditoría de usuario solo aplica a acciones de un usuario; la devolución, que sí la hace un Bibliotecario, sí registra `actualizadoPor`.
