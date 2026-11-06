# Registro de hallazgos — Hito 5

Hallazgos de las pruebas beta realizadas el 06/11/2026 sobre una base de pruebas separada.

**Ninguno fue corregido todavía.** Las correcciones son propuestas. Cuando se apliquen, hay que volver a probar lo afectado.

## Resumen

| Severidad | Cantidad | Hallazgos |
|---|---:|---|
| Crítico | 0 | — |
| Alto | 1 | H-01 |
| Medio | 9 | H-02 a H-10 |
| Bajo | 13 | H-11 a H-23 |
| Mejora pendiente | 6 | M-01 a M-06 |

Criterio: **Crítico** pierde o corrompe datos, o expone información. **Alto** impide completar un flujo principal. **Medio** deja una función incorrecta o incompleta, con alternativa. **Bajo** afecta validaciones o mensajes, sin impedir el uso. **Mejora** no incumple un requisito.

---

## Alto

### H-01. Un código promocional guardado bloquea carrito y checkout

- **CU:** CU-08.
- **Qué se detectó:** al quitar el único producto alcanzado por el código aplicado, carrito y checkout quedan sin resumen ni botones. El código sigue guardado en `sessionStorage`.
- **Cómo reproducirlo:** agregar un producto alcanzado por INVIERNO15 y otro que no lo esté → aplicar el código → quitar el producto alcanzado → abrir `/cart` y `/checkout`.
- **Impacto:** el cliente no puede comprar ni quitar el código desde la pantalla.
- **¿Impide continuar?** Sí, ese flujo. La salida es cerrar sesión o abrir una nueva sesión del navegador.
- **¿Corregir antes de producción?** Sí.
- **Corrección propuesta:** en `Carrito` y en el checkout ([Compra.jsx](../../client/src/components/Ecommerce/Compra.jsx)), si `GET /cart` falla por el código guardado, borrarlo de `sessionStorage`, volver a consultar sin código y mostrar el mensaje. Hoy, con ese error, la pantalla solo muestra el mensaje y no ofrece ninguna acción.
- **Evidencia:** [checkout](evidencias/H-01_checkout_bloqueado.jpg), [carrito](evidencias/H-01_carrito_bloqueado.jpg).

---

## Medio

### H-02. QR de Mercado Pago sin configurar

- **CU:** CU-08 y CU-10.
- **Qué se detectó:** `MP_QR_IMAGE_URL` está vacía; el sistema lo avisa, pero no hay QR para pagar. No es un error de código: faltan los datos del comercio.
- **Cómo reproducirlo:** confirmar una compra online, o elegir QR en el POS.
- **Impacto:** el pago por QR no se puede hacer de punta a punta.
- **¿Impide continuar?** No para las pruebas; sí para cobrar de verdad con QR.
- **¿Corregir antes de producción?** Sí.
- **Corrección propuesta:** obtener la imagen del QR del comercio y configurarla. La integración real con Mercado Pago queda fuera de esta etapa.
- **Evidencia:** [pedido](evidencias/H-02_pedido_sin_qr.jpg), [POS](evidencias/H-02_pos_sin_qr.jpg).

### H-03. El cierre de caja no muestra el arqueo

- **CU:** sin CU propio (caja).
- **Qué se detectó:** tras confirmar el cierre, el POS va a `/pos/open`. El arqueo sí se ve desde Sesiones.
- **Cómo reproducirlo:** cerrar caja y confirmar.
- **Impacto:** el vendedor no ve el resultado del cierre. Los datos se guardan bien.
- **¿Impide continuar?** No.
- **¿Corregir antes de producción?** Sí.
- **Corrección propuesta:** en [POS/Paginas.jsx:250](../../client/src/components/POS/Paginas.jsx:250) navegar al arqueo antes de `recargarSesion()`. Causa probable, no confirmada con depuración: al quedar la sesión en `null`, el efecto de [PosLayout.jsx:33](../../client/src/components/POS/PosLayout.jsx:33) redirige a la apertura, porque `/pos/cash` no está entre las rutas permitidas sin caja.
- **Evidencia:** [captura](evidencias/H-03_cierre_sin_arqueo.jpg).

### H-04. El filtro Activos muestra productos inactivos

- **CU:** CU-12.
- **Qué se detectó:** con `status=activo`, la API también devuelve productos inactivos.
- **Cómo reproducirlo:** en `/admin/products`, desactivar un producto y filtrar por Activos.
- **Impacto:** información incorrecta para el administrador.
- **¿Impide continuar?** No.
- **¿Corregir antes de producción?** Sí.
- **Corrección propuesta:** en [productControllers.js:57](../../api/controllers/productControllers.js:57) aplicar `activo = true` también cuando `status === 'activo'`.
- **Evidencia:** [captura](evidencias/H-04_filtro_activos.jpg).

### H-05. Código inválido en el POS descartado sin aviso

- **CU:** CU-10.
- **Qué se detectó:** el código se borra y no aparece ningún mensaje.
- **Cómo reproducirlo:** en el POS, cargar un código inexistente en el formulario de descuento y aplicar.
- **Impacto:** el vendedor puede creer que el descuento se aplicó.
- **¿Impide continuar?** No.
- **¿Corregir antes de producción?** Sí.
- **Corrección propuesta:** en [Venta.jsx:40](../../client/src/components/POS/Venta.jsx:40), el `catch` limpia el código y eso dispara otra consulta correcta, cuyo `setError('')` borra el mensaje. Conservar el error en ese caso, por ejemplo guardándolo aparte.

### H-06. Catálogo sin tarjetas ni mensaje si fallan los favoritos

- **CU:** CU-04.
- **Qué se detectó:** si `GET /favorites` falla, el catálogo dice "11 productos encontrados" y no muestra nada.
- **Cómo reproducirlo:** con un cliente, forzar un error en `/favorites` y abrir `/products`.
- **Impacto:** un error secundario deja al cliente sin catálogo.
- **¿Impide continuar?** Sí mientras dure ese error.
- **¿Corregir antes de producción?** Sí.
- **Corrección propuesta:** en [useFavoritos.js:12](../../client/src/components/Ecommerce/useFavoritos.js:12) agregar `.catch(() => setIds(new Set()))`.
- **Evidencia:** [captura](evidencias/H-06_catalogo_sin_tarjetas.jpg).

### H-07. Error 500 con fechas o tipos de dato inválidos

- **CU:** CU-01 y CU-15.
- **Qué se detectó:** en lugar de un error 400 con mensaje, la API responde 500.
- **Cómo reproducirlo:** `GET /reports/...?from=no-es-fecha`, o `POST /auth/register` con `nombre: 123`.
- **Impacto:** mensajes poco útiles y errores internos evitables. No hay datos dañados. El formulario web no envía esos valores.
- **¿Impide continuar?** No.
- **¿Corregir antes de producción?** Sí.
- **Corrección propuesta:** validar el formato en `rango()` de [reportControllers.js:27](../../api/controllers/reportControllers.js:27) y los tipos en `register` de [authControllers.js:27](../../api/controllers/authControllers.js:27).

### H-08. Alcance del historial de ventas sin definir

- **CU:** CU-17.
- **Qué se detectó:** cada vendedor ve solo sus ventas. El TP no define si debe ver todas.
- **Impacto:** puede no coincidir con lo que espera el negocio.
- **¿Impide continuar?** No.
- **¿Corregir antes de producción?** Solo si el cliente decide otra cosa.
- **Corrección propuesta:** decidirlo con el cliente.

### H-09. Un pedido pendiente retiene stock sin vencimiento

- **CU:** CU-08.
- **Qué se detectó:** el stock de un pedido sin pagar queda retenido hasta que alguien lo cancela.
- **Cómo reproducirlo:** crear un pedido y no pagarlo.
- **Impacto:** unidades bloqueadas si el cliente no vuelve.
- **¿Impide continuar?** No.
- **¿Corregir antes de producción?** Conviene, previa decisión del plazo.
- **Corrección propuesta:** definir el plazo con el cliente y agregar un vencimiento. Mientras tanto, el personal puede cancelar el pedido.

### H-10. Un cliente puede ocupar un número de operación ajeno

- **CU:** CU-08.
- **Qué se detectó:** `referencia_externa` es única y guarda lo que escribe el cliente. Un número repetido devuelve "Ya existe un registro con esos datos".
- **Cómo reproducirlo:** informar en un pedido un número de operación ya usado por otro.
- **Impacto:** un cliente legítimo podría no poder informar su pago. El mensaje no explica el motivo.
- **¿Impide continuar?** No; el personal puede confirmar el pago.
- **¿Corregir antes de producción?** Conviene.
- **Corrección propuesta:** separar lo informado por el cliente del identificador verificado, sin unicidad en el primero. Implica cambio de esquema: requiere decisión.

---

## Bajo

No impiden continuar. Conviene corregirlos antes de producción, sin que sean bloqueantes.

| ID | CU | Qué se detectó y cómo reproducirlo | Impacto | Corrección propuesta |
|---|---|---|---|---|
| H-11 | CU-07 | `POST /cart/items` con cantidad 0 o -1 sobre un producto ya presente devuelve 201 | Se puede bajar la cantidad por API; la web no lo permite | En [cartControllers.js:60](../../api/controllers/cartControllers.js:60) validar `cantidad` antes de sumarla |
| H-12 | CU-02 | Tras cerrar sesión, el token sigue válido hasta 8 h | Riesgo si alguien copia el token | Aceptable para la beta; evaluar lista de revocación o duración menor |
| H-13 | CU-16 | `PATCH /users/:id` con nombre vacío devuelve 200. La web lo frena | Usuario sin nombre, solo por API | Validar en [userControllers.js:89](../../api/controllers/userControllers.js:89) |
| H-14 | CU-12, CU-13 | SKU o categoría duplicados: "Ya existe un registro con esos datos". Categoría inexistente: 409 "relacionado con otros datos" | No se sabe qué campo corregir | Indicar el campo según la restricción en `errorMiddleware`; devolver 400 si la categoría no existe |
| H-15 | CU-03 | Teléfono `abc` aceptado. El TP no define formato | Dato de contacto inservible | Validar con un patrón simple, en registro y perfil |
| H-16 | Todos | A 375 px, `/profile` y `/admin/registers` desbordan ([perfil](evidencias/H-16_movil_perfil.jpg), [cajas](evidencias/H-16_movil_cajas.jpg)) | Hay que desplazar de costado y una columna queda comprimida | El `style` en línea de [Paginas.jsx:136](../../client/src/components/Ecommerce/Paginas.jsx:136) y [Operaciones.jsx:302](../../client/src/components/Admin/Operaciones.jsx:302) anula la regla responsive: usar una clase |
| H-17 | CU-12 | Producto sin imagen muestra `/favicon.svg`, el logo de Vite ([captura](evidencias/H-17_producto_sin_imagen.jpg)) | Aspecto poco profesional | Reemplazar por una imagen neutra de la marca |
| H-18 | CU-10 | Tras un corte de la API, el reintento registra una sola venta, pero sigue "Caja cerrada" hasta recargar ([captura](evidencias/H-18_pos_tras_corte.jpg)) | Confusión; los datos son correctos | Llamar a `recargarSesion` tras una operación correcta |
| H-19 | CU-02 | Token vencido o alterado: vuelve a `/login` sin explicar | Confusión | Mostrar "Tu sesión venció" |
| H-20 | CU-01, CU-06 | Falta el mensaje de éxito en el registro (CU-01 paso 8) y al agregar favorito (CU-06 paso 4); un favorito repetido no informa (CU-06 2.a) ([registro](evidencias/H-20_registro_sin_mensaje.jpg), [favorito](evidencias/H-20_favorito_sin_mensaje.jpg)) | No se cumple el texto del CU | Agregar los mensajes |
| H-21 | — | El servidor arranca sin base disponible, y con el puerto ocupado imprime "Servidor corriendo" y no termina | Diagnóstico engañoso | En [app.js:29](../../api/app.js:29), revisar el error que recibe `listen` y terminar el proceso si falla |
| H-22 | CU-15 | Cada consulta de reporte agrega una fila en la tabla `reporte` | Crecimiento sin uso | Decidir si la tabla se usa; si no, dejar de escribir |
| H-23 | CU-14 | Código inexistente con carrito vacío: 200 sin validar | Sin efecto real, pues no hay nada que comprar | Validar el código aunque el carrito esté vacío |

---

## Mejoras pendientes

No incumplen requisitos.

| ID | CU | Propuesta |
|---|---|---|
| M-01 | CU-10 | Pedir confirmación al vaciar un ticket del POS |
| M-02 | CU-15 | "Entradas del mes" incluye stock inicial y anulaciones: aclararlo o separarlo |
| M-03 | CU-08 | El pedido dice "Escaneá el QR" aunque no haya QR: adaptar el texto |
| M-04 | CU-15 | CU-15 pide seleccionar el tipo de reporte y la pantalla los muestra juntos ([captura](evidencias/M-04_reportes.jpg)): agregar selector o ajustar el CU |
| M-05 | — | Diferencias con Figma: verde `#2C402F` en lugar de `#3E5645`; el dashboard no tiene buscador, íconos en tarjetas ni variación mensual; la promoción no tiene "Guardar borrador" ni tipo de descuento. Definir cuáles se aceptan |
| M-06 | CU-12, CU-16 | Los CU hablan de eliminar; el sistema bloquea o da de baja lógica para conservar el historial: ajustar la redacción del TP |
