# Prueba de humo del Sprint 3 (HU-005 y HU-006) en producción

**Para la Review 3 (sáb 21/11).** Frontend: `<URL del frontend en producción>` · API: `<URL de la API>/api/docs`.
Datos previos: un usuario Bibliotecario, un Administrador, un lector registrado (anotar su DNI completo: `________`) y una obra con al menos 2 ejemplares disponibles.

| # | Paso | Resultado esperado | Resultado real |
| --- | --- | --- | --- |
| 1 | Entrar como **Administrador** y abrir **Morosidad** antes de crear datos. Si ya hay vencidos de otras pruebas, anotarlos. | Se ve "Cargando reporte…" y luego la tabla, o el mensaje **"No hay préstamos vencidos"** (HU-006 #5). | |
| 2 | Si no había vencidos: **Exportar Excel** y **Exportar PDF** con el reporte vacío. | Se descargan `morosidad-AAAA-MM-DD.xlsx` y `.pdf` con la fecha de hoy en Lima; ambos dicen "No hay préstamos vencidos". | |
| 3 | Cerrar sesión y entrar como **Bibliotecario**. En **Préstamos**, registrar un préstamo del ejemplar A al lector. | Préstamo creado con la fecha de devolución a 3 días hábiles. El menú muestra **Devolución** y **Morosidad**. | |
| 4 | Ir a **Devolución**, escribir o escanear el código del ejemplar A y pulsar **Buscar préstamo**. | Se muestran la obra, el lector con el DNI **`****` + 4 últimos dígitos** y las fechas; no aparece "Vencido". | |
| 5 | Pulsar **Confirmar devolución**. | Mensaje "Devolución registrada … el DD/MM/AAAA." y el campo de código vuelve a quedar en foco (HU-005 #1). | |
| 6 | Buscar otra vez el código del ejemplar A. | "No hay un préstamo activo para ese ejemplar" (404, HU-005 #6). En el catálogo, el ejemplar A figura como disponible. | |
| 7 | Registrar un préstamo del ejemplar B al mismo lector. | Se permite: el lector ya no tenía un préstamo activo (RN-08). | |
| 8 | Para simular el atraso, cambiar en la BD la fecha pactada del préstamo B a hace 3 días (y la de préstamo, para que sea coherente): `UPDATE prestamos SET fecha_prestamo = CURRENT_DATE - 6, fecha_devolucion = CURRENT_DATE - 3 WHERE ejemplar_id = (SELECT id FROM ejemplares WHERE codigo = '<código B>') AND estado = 'VIGENTE';` | 1 fila actualizada. | |
| 9 | Como **Administrador**, en Swagger (`/api/docs`) ejecutar `POST /prestamos/vencidos/marcar`. | `200 { "marcados": 1 }` o más (RN-06). Una segunda ejecución devuelve `{ "marcados": 0 }` (idempotente). | |
| 10 | Con el token del **Bibliotecario**, ejecutar el mismo `POST`. | `403` (HU-005 #7). | |
| 11 | Como **Bibliotecario**, abrir **Morosidad**. | La tabla muestra el préstamo B con 3 días de atraso, el DNI enmascarado y "Registrado por" con el usuario Bibliotecario (HU-006 #1, #4). | |
| 12 | **Exportar Excel** y abrir el archivo. | Las mismas columnas, filas, fechas DD/MM/AAAA y hora de generación que la pantalla; el DNI enmascarado (HU-006 #2, #4). | |
| 13 | **Exportar PDF** y abrir el archivo. | El mismo contenido que la pantalla, en A4 horizontal; el DNI enmascarado (HU-006 #3, #4). | |
| 14 | Buscar en el Excel y en el PDF el DNI completo anotado (Ctrl+F). | No se encuentra en ninguno de los dos. | |
| 15 | En **Devolución**, buscar el ejemplar B. | Aparece resaltado **"Vencido"**. | |
| 16 | **Confirmar devolución** del ejemplar B. | "Devolución registrada … , con atraso." (HU-005 #3). | |
| 17 | Volver a **Morosidad**. | El préstamo B ya no aparece; si no hay otros, se ve "No hay préstamos vencidos". | |
| 18 | En Swagger, llamar a `GET /reportes/morosidad` sin token. | `401` (HU-006 #6). | |
| 19 | En Railway, revisar los logs del despliegue. | Aparece "Marcado al arrancar de vencidos: n préstamo(s)" y ningún DNI completo. | |
