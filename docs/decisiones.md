# Decisiones y supuestos del Sprint 1

Supuestos adoptados mientras se cierran los pendientes. Cuando una decisión se confirme, actualizar la fila (y, si aplica, registrar un ADR en esta carpeta).

| Pendiente | Afecta a | Supuesto vigente | Estado |
| --- | --- | --- | --- |
| P-31 · alcance de T-001 | ST-02, ST-05, ST-10 | Backend y PostgreSQL en Railway; frontend en Vercel desde `main`; sin staging separado. | Por confirmar en la Planning (ST-05) |
| P-17 · tokens | ST-07, ST-10, ST-11 | Access token en memoria del cliente; refresh token en cookie httpOnly; en BD solo su hash, rotado en cada uso y revocado en logout. | Supuesto |
| P-21 · cuentas del personal | ST-06 | Sin autorregistro. Un seed crea el Administrador inicial (`ADMIN_USERNAME`/`ADMIN_PASSWORD`) y este crea los Bibliotecarios. | Supuesto |
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
