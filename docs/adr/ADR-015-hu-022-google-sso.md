# ADR-015 · HU-022 Login con Google entró sin planificar

**Estado:** Aceptado · **Fecha:** 19/11/2026

## Contexto
HU-022 (login con Google, PR #64) se integró el 07/11 sin estar planificada en el Sprint 2 ni pasar por el PO. Más tarde apareció la rama `JuandiDev`, que la reimplementaba en paralelo.

## Decisión
- Se estima de forma retroactiva en **3 pts** y se acepta como alcance adicional del Sprint 2.
- La rama `JuandiDev` no se integra: duplica HU-022 y elimina pruebas.
- Todo trabajo no planificado se presenta al PO antes de empezar y tiene issue asignada.

## Consecuencias
- La velocidad del Sprint 2 se corrige con los 3 pts retroactivos.
- Se evita trabajo duplicado y se conserva la trazabilidad HU → PR.
- Pasar cada cambio por el PO añade una pequeña demora, aceptable frente al riesgo de rehacer trabajo.
