# Casos de prueba — TeaTime

> Los hallazgos de las pruebas beta (06/11/2026) están en el [registro de hallazgos](../Hito5/Registro_Hallazgos.md).

## Prueba automática

Se ejecuta con `npm test` en `api/`, con el servidor encendido, contra PostgreSQL real (`api/tests/flujo.test.js`).

| Área | Qué se comprueba |
|---|---|
| Autenticación y roles | Login inválido, acceso sin token, cliente fuera de Administración y POS, administrador fuera del POS, email duplicado |
| Catálogo | Búsqueda por marca, sabor y categoría; varios sabores por producto; precio con promoción; stock inicial como movimiento; editar no cambia el stock; precio cero rechazado |
| Stock | Ingreso, egreso excesivo rechazado, ajuste por conteo, reintento sin duplicar |
| Caja y POS | Venta sin caja rechazada, una sesión por caja y por vendedor, efectivo insuficiente, confirmación manual de QR y tarjeta, vuelto, precio histórico, tope de descuento, reintentos simultáneos, clave reutilizada, última unidad simultánea, anulación, ingresos y egresos, arqueo, sesión cerrada |
| Ecommerce | Stock máximo en carrito, favoritos, código sin guardarse, carrito vacío, pedido pendiente, reintento, el cliente no aprueba su pago, pedido sin pago no avanza, estados hasta la entrega, pedidos ajenos, cancelación y rechazo con reposición |
| Administración | Promociones y bloqueo de borrado si fueron usadas, categorías y sabores en uso, baja de usuarios, dashboard, ventas unificadas y reportes |
| Auditoría | Stock contra movimientos, reversas, totales y rol único |

**Último resultado registrado (05/11/2026): 46 correctas, 0 fallidas. Auditoría: todos los controles en 0.**

## Pruebas manuales en el navegador (05/11/2026)

| Caso | Resultado |
|---|---|
| Login de cliente y redirección | Correcto |
| Búsqueda por sabor ("vainilla") | Correcto |
| Agregar al carrito y confirmar pedido | Correcto; pedido pendiente de pago |
| Aviso de QR no configurado | Correcto |
| Vendedor sin caja redirigido a apertura | Correcto |
| Apertura de caja | Correcto |
| Ticket con promoción y total calculado | Correcto |
| Cobro en efectivo con vuelto y ticket | Correcto |
| Cierre de caja con diferencia | Correcto |
| Administrador redirigido fuera del POS | Correcto |
| Dashboard, pedido, stock, edición de producto, reportes, cajas, promociones, usuarios, ventas, sabores y categorías | Cargan sin errores |
| Vista móvil de inicio y productos | Sin desborde horizontal |
| Administrador confirma el pago y avanza el pedido hasta Entregado | Correcto |
| Alta de producto con stock inicial y sabor | Correcto |
| Venta con QR: el botón sigue deshabilitado hasta confirmar el pago | Correcto |
| Anulación de venta desde el ticket | Correcto |

## Pendiente de ejecutar

- Colección de Postman: fue generada desde las rutas, pero no se ejecutó en Postman.
- Formularios de promociones, usuarios, categorías, sabores, cajas y movimientos de stock desde la interfaz: las pantallas cargan y la lógica está probada por API; falta completarlos en el navegador.
- QR real de Mercado Pago: faltan los datos del comercio.
- **OK del cliente (entrega 5):** debe registrarlo TeaTime Store. No hay evidencia de ese OK.
