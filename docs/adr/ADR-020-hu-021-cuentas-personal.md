# ADR-020 · HU-021 Cuentas del personal, propuesta para el Sprint 4

**Estado:** Propuesto (requiere aprobación del PO) · **Fecha:** 20/11/2026

## Contexto
El supuesto P-21 (`docs/decisiones.md`) dice que el seed crea el Administrador inicial y que **este crea los Bibliotecarios**, pero ninguna historia lo implementaba (RF-19 y HU-021 seguían como candidatas). Para preparar la prueba de humo del Sprint 3 hubo que insertar un Bibliotecario con SQL en producción: sin esta función, el sistema no se puede operar sin acceso a la BD.

Según ADR-015, el trabajo no planificado se presenta al PO antes de integrarse.

## Decisión
- HU-021 se implementa en un PR propio (`feat/HU-021-cuentas-personal`) que **no se fusiona** hasta que el PO lo apruebe y le asigne puntos y sprint. Estimación sugerida: 3 pts.
- Alcance mínimo:
  - `POST /usuarios` (alta con contraseña inicial y correo opcional para Google);
  - `PATCH /usuarios/:id` (rol, deshabilitar o reactivar, nueva contraseña);
  - la pantalla *Usuarios* del Administrador.
- Deshabilitar una cuenta, cambiarle el rol o la contraseña revoca sus refresh tokens.
- `JwtAuthGuard` consulta la cuenta en cada petición: una cuenta deshabilitada recibe 401 al instante, y el rol que vale es el de la BD, no el que quedó en el access token.
- El Administrador no puede deshabilitarse ni quitarse el rol a sí mismo, ni cambiar su propia contraseña desde la pantalla. Además, nunca se puede deshabilitar ni degradar al último Administrador activo: la verificación bloquea las filas (`pessimistic_write`) para que dos bajas cruzadas no pasen a la vez.
- El correo se guarda en minúsculas, igual que lo entrega Google (HU-022).
- Auditoría (DoD-7): columnas `creado_por` y `actualizado_por` en `usuarios`.

## Consecuencias
- Cada petición autenticada hace una consulta más a la BD, por clave primaria; con el volumen del CEDIS el costo es despreciable. A cambio, el corte de acceso es inmediato.
- Si el PO no la aprueba, el PR se cierra sin fusionar y el Bibliotecario se sigue creando con `crear-bibliotecario.cjs`.
