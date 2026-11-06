# Cambios sobre el esquema del Hito 4

El Hito 4 presentó 16 tablas (`sql/TeaTime.sql`). El sistema usa **23 tablas**: esas 16, modificadas, más 7 nuevas. Los cambios están en `sql/TeaTime_cambios_v2.sql` y se aplicaron a la base `teatime`, que estaba vacía.

> **Estado:** estos cambios no tienen aprobación registrada de la cátedra. Deben informarse y registrarse como control de cambios, como pide el acta (Bloques 5 y 11).

No se eliminó ninguna tabla ni columna del Hito 4.

## Tablas nuevas

| Tabla | Para qué | Origen del requisito |
|---|---|---|
| `movimiento_stock` | Historial de ingresos, egresos, ajustes, ventas y anulaciones | Acta B4 y B5; Hito 4 §4.5; TEATIME.pdf §10.15 |
| `sabor`, `producto_sabor` | Un producto puede ofrecer varias variedades (N:M) | Acta B4; decisión del equipo |
| `caja`, `sesion_caja`, `movimiento_caja` | Apertura, operaciones, cierre, arqueo e historial | Hito 4 §3.1; TEATIME.pdf §8; decisión del equipo |
| `pago` | Pago de compras y ventas, preparado para Mercado Pago | Hito 4 §3.5; TEATIME.pdf §8; decisión del equipo |

## Tablas modificadas

| Tabla | Cambio | Motivo |
|---|---|---|
| `usuario` | `activo` | Baja lógica: no se pierde historial |
| `categoria` | `UNIQUE (nombre)` | Evita categorías duplicadas |
| `producto` | `sku`, `marca`, `imagen`, `presentacion`, `peso`, `stock_minimo`, `activo` | Hito 3 (imagen); Hito 4 §4.4; Acta B4 (marcas) |
| `producto` | `CHECK` de precio mayor a 0 y stock no negativo | Acta B6 |
| `promocion` | `codigo` opcional y `CHECK` de porcentaje y fechas | Hito 4 §4.4. Sin código = automática |
| `detalle_carrito` | `CHECK (cantidad > 0)` | Acta B6 |
| `compra` | `fecha` con hora, `clave_operacion`, estados válidos | Evita duplicados ante reintentos |
| `venta` | `fecha` con hora, `clave_operacion`, `id_sesion`, `descuento`, `nota`, estados válidos | Toda venta POS pertenece a una sesión de caja |
| `detalle_compra`, `detalle_venta` | `precio_lista`, `id_promocion`, FK a `producto_promocion` | Conserva precio original, precio final y promoción aplicada |

## Decisiones de diseño

- **`compra` y `venta` siguen separadas**, como en el Hito 4. Administración las consulta juntas con una consulta unificada (`GET /sales`). `TEATIME.pdf` proponía una sola tabla `sales`.
- **Sabores:** son una característica del producto. El stock sigue siendo por producto porque el diseño de Figma no tiene selector de variedad al comprar. Si se quisiera stock por variedad, habría que agregar variantes.
- **Solo retiro en el local:** no hay columnas de envío ni dirección.
- **Pago:** una fila por operación, por eso no hay pago combinado.
- **Roles:** tres tablas excluyentes, como en el Hito 4. La API garantiza que cada usuario tenga un solo rol.

## Reglas de consistencia

- `producto.stock` solo cambia desde `api/utils/stock.js`, junto con su movimiento y en la misma transacción.
- Los productos se bloquean con `SELECT ... FOR UPDATE`, en orden de id. Dos ventas simultáneas no pueden vender la misma unidad.
- `clave_operacion` (única) evita duplicar ventas, compras y movimientos manuales ante reintentos.
- Las anulaciones crean movimientos inversos: no se borra ni se modifica nada.
- `GET /api/v1/reports/audit` compara saldos, movimientos, reversas y totales. Todos los controles deben dar 0.
