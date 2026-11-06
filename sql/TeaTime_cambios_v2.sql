-- =====================================================
-- TEATIME STORE
-- CAMBIOS SOBRE EL ESQUEMA DEL HITO 4 (16 tablas -> 23 tablas)
-- Se aplica una sola vez sobre sql/TeaTime.sql.
-- Justificación de cada cambio: docs/BD/Cambios_Esquema.md
-- =====================================================

-- =====================================================
-- USUARIOS Y CATÁLOGO
-- =====================================================

ALTER TABLE usuario
    ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE categoria
    ADD CONSTRAINT categoria_nombre_key UNIQUE (nombre);

ALTER TABLE producto
    ADD COLUMN sku VARCHAR(50) NOT NULL UNIQUE,
    ADD COLUMN marca VARCHAR(100),
    ADD COLUMN imagen VARCHAR(500),
    ADD COLUMN presentacion VARCHAR(50),
    ADD COLUMN peso VARCHAR(30),
    ADD COLUMN stock_minimo INT NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE,
    ADD CONSTRAINT producto_precio_check CHECK (precio > 0),
    ADD CONSTRAINT producto_stock_check CHECK (stock >= 0);

CREATE INDEX producto_id_categoria_idx ON producto (id_categoria);

-- Un producto puede ofrecer varias variedades (N:M). El stock sigue siendo por producto.
CREATE TABLE sabor (
    id_sabor SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE producto_sabor (
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    id_sabor INT NOT NULL REFERENCES sabor(id_sabor),
    PRIMARY KEY (id_producto, id_sabor)
);

CREATE INDEX producto_sabor_id_sabor_idx ON producto_sabor (id_sabor);

-- =====================================================
-- PROMOCIONES
-- Sin código: automática. Con código: se aplica al ingresarlo.
-- =====================================================

ALTER TABLE promocion
    ADD COLUMN codigo VARCHAR(30) UNIQUE CHECK (codigo = UPPER(codigo)),
    ADD CONSTRAINT promocion_porcentaje_check CHECK (porcentaje_descuento > 0 AND porcentaje_descuento <= 100),
    ADD CONSTRAINT promocion_fechas_check CHECK (fecha_fin >= fecha_inicio);

CREATE INDEX producto_promocion_id_promocion_idx ON producto_promocion (id_promocion);

-- =====================================================
-- ECOMMERCE
-- =====================================================

ALTER TABLE detalle_carrito
    ADD CONSTRAINT detalle_carrito_cantidad_check CHECK (cantidad > 0);

CREATE INDEX detalle_carrito_id_producto_idx ON detalle_carrito (id_producto);
CREATE INDEX favorito_id_producto_idx ON favorito (id_producto);

ALTER TABLE compra
    ALTER COLUMN fecha DROP DEFAULT,
    ALTER COLUMN fecha TYPE TIMESTAMPTZ USING fecha::timestamptz,
    ALTER COLUMN fecha SET DEFAULT now(),
    ADD COLUMN clave_operacion UUID NOT NULL UNIQUE,
    ADD CONSTRAINT compra_estado_check CHECK (estado IN
        ('PENDIENTE_PAGO', 'CONFIRMADO', 'EN_PREPARACION', 'LISTO_PARA_RETIRO', 'ENTREGADO', 'CANCELADO')),
    ADD CONSTRAINT compra_total_check CHECK (total >= 0);

CREATE INDEX compra_id_cliente_fecha_idx ON compra (id_cliente, fecha);
CREATE INDEX compra_fecha_idx ON compra (fecha);

ALTER TABLE detalle_compra
    ADD COLUMN precio_lista NUMERIC(10, 2) NOT NULL CHECK (precio_lista > 0),
    ADD COLUMN id_promocion INT,
    ADD CONSTRAINT detalle_compra_cantidad_check CHECK (cantidad > 0),
    ADD CONSTRAINT detalle_compra_precio_check CHECK (precio_unitario >= 0),
    ADD CONSTRAINT detalle_compra_promocion_fkey FOREIGN KEY (id_producto, id_promocion)
        REFERENCES producto_promocion (id_producto, id_promocion),
    ADD CONSTRAINT detalle_compra_promocion_check CHECK (
        (id_promocion IS NULL AND precio_unitario = precio_lista)
        OR (id_promocion IS NOT NULL AND precio_unitario < precio_lista));

CREATE INDEX detalle_compra_id_producto_idx ON detalle_compra (id_producto);

-- =====================================================
-- CAJA
-- =====================================================

CREATE TABLE caja (
    id_caja SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE sesion_caja (
    id_sesion SERIAL PRIMARY KEY,
    id_caja INT NOT NULL REFERENCES caja(id_caja),
    id_vendedor INT NOT NULL REFERENCES vendedor(id_usuario),
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'CERRADA')),
    fecha_apertura TIMESTAMPTZ NOT NULL DEFAULT now(),
    monto_inicial NUMERIC(10, 2) NOT NULL CHECK (monto_inicial >= 0),
    fecha_cierre TIMESTAMPTZ,
    monto_esperado NUMERIC(10, 2),
    monto_declarado NUMERIC(10, 2) CHECK (monto_declarado >= 0),
    diferencia NUMERIC(10, 2),
    observacion TEXT,
    CONSTRAINT sesion_caja_cierre_check CHECK (
        (estado = 'ABIERTA' AND fecha_cierre IS NULL AND monto_esperado IS NULL
            AND monto_declarado IS NULL AND diferencia IS NULL)
        OR (estado = 'CERRADA' AND fecha_cierre IS NOT NULL AND monto_esperado IS NOT NULL
            AND monto_declarado IS NOT NULL AND diferencia = monto_declarado - monto_esperado))
);

-- Una caja y un vendedor solo pueden tener una sesión abierta.
CREATE UNIQUE INDEX sesion_caja_abierta_caja_idx ON sesion_caja (id_caja) WHERE estado = 'ABIERTA';
CREATE UNIQUE INDEX sesion_caja_abierta_vendedor_idx ON sesion_caja (id_vendedor) WHERE estado = 'ABIERTA';
CREATE INDEX sesion_caja_fecha_idx ON sesion_caja (fecha_apertura);

-- =====================================================
-- PUNTO DE VENTA
-- =====================================================

ALTER TABLE venta
    ALTER COLUMN fecha DROP DEFAULT,
    ALTER COLUMN fecha TYPE TIMESTAMPTZ USING fecha::timestamptz,
    ALTER COLUMN fecha SET DEFAULT now(),
    ADD COLUMN clave_operacion UUID NOT NULL UNIQUE,
    ADD COLUMN id_sesion INT NOT NULL REFERENCES sesion_caja(id_sesion),
    ADD COLUMN descuento NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    ADD COLUMN nota TEXT,
    ADD CONSTRAINT venta_estado_check CHECK (estado IN ('COMPLETADA', 'ANULADA')),
    ADD CONSTRAINT venta_total_check CHECK (total >= 0);

CREATE INDEX venta_id_vendedor_fecha_idx ON venta (id_vendedor, fecha);
CREATE INDEX venta_fecha_idx ON venta (fecha);
CREATE INDEX venta_id_sesion_idx ON venta (id_sesion);

ALTER TABLE detalle_venta
    ADD COLUMN precio_lista NUMERIC(10, 2) NOT NULL CHECK (precio_lista > 0),
    ADD COLUMN id_promocion INT,
    ADD CONSTRAINT detalle_venta_cantidad_check CHECK (cantidad > 0),
    ADD CONSTRAINT detalle_venta_precio_check CHECK (precio_unitario >= 0),
    ADD CONSTRAINT detalle_venta_promocion_fkey FOREIGN KEY (id_producto, id_promocion)
        REFERENCES producto_promocion (id_producto, id_promocion),
    ADD CONSTRAINT detalle_venta_promocion_check CHECK (
        (id_promocion IS NULL AND precio_unitario = precio_lista)
        OR (id_promocion IS NOT NULL AND precio_unitario < precio_lista));

CREATE INDEX detalle_venta_id_producto_idx ON detalle_venta (id_producto);

-- Operaciones de dinero de una sesión. El efectivo esperado sale de esta tabla.
CREATE TABLE movimiento_caja (
    id_movimiento_caja SERIAL PRIMARY KEY,
    id_sesion INT NOT NULL REFERENCES sesion_caja(id_sesion),
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('INGRESO', 'EGRESO', 'VENTA_EFECTIVO', 'ANULACION_VENTA')),
    monto NUMERIC(10, 2) NOT NULL CHECK (monto > 0),
    descripcion TEXT,
    id_venta INT REFERENCES venta(id_venta),
    clave_operacion UUID UNIQUE,
    fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT movimiento_caja_origen_check CHECK (
        (tipo IN ('INGRESO', 'EGRESO') AND id_venta IS NULL AND clave_operacion IS NOT NULL
            AND descripcion IS NOT NULL)
        OR (tipo IN ('VENTA_EFECTIVO', 'ANULACION_VENTA') AND id_venta IS NOT NULL AND clave_operacion IS NULL))
);

CREATE UNIQUE INDEX movimiento_caja_venta_tipo_idx ON movimiento_caja (id_venta, tipo) WHERE id_venta IS NOT NULL;
CREATE INDEX movimiento_caja_id_sesion_idx ON movimiento_caja (id_sesion);

-- =====================================================
-- PAGOS (POS y Ecommerce)
-- referencia_externa queda lista para el id de pago de la API de Mercado Pago.
-- =====================================================

CREATE TABLE pago (
    id_pago SERIAL PRIMARY KEY,
    id_compra INT UNIQUE REFERENCES compra(id_compra),
    id_venta INT UNIQUE REFERENCES venta(id_venta),
    metodo VARCHAR(20) NOT NULL CHECK (metodo IN ('EFECTIVO', 'TARJETA', 'MERCADO_PAGO_QR')),
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'ANULADO')),
    monto NUMERIC(10, 2) NOT NULL CHECK (monto >= 0),
    monto_recibido NUMERIC(10, 2),
    referencia_externa VARCHAR(100) UNIQUE,
    id_usuario_confirma INT REFERENCES usuario(id_usuario),
    fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_confirmacion TIMESTAMPTZ,
    CONSTRAINT pago_operacion_check CHECK (num_nonnulls(id_compra, id_venta) = 1),
    CONSTRAINT pago_efectivo_check CHECK (
        (metodo = 'EFECTIVO' AND monto_recibido IS NOT NULL AND monto_recibido >= monto)
        OR (metodo <> 'EFECTIVO' AND monto_recibido IS NULL)),
    CONSTRAINT pago_aprobado_check CHECK (
        estado <> 'APROBADO' OR (id_usuario_confirma IS NOT NULL AND fecha_confirmacion IS NOT NULL))
);

-- =====================================================
-- MOVIMIENTOS DE STOCK
-- La suma de cantidad por producto debe ser igual a producto.stock.
-- =====================================================

CREATE TABLE movimiento_stock (
    id_movimiento SERIAL PRIMARY KEY,
    id_producto INT NOT NULL REFERENCES producto(id_producto),
    id_usuario INT NOT NULL REFERENCES usuario(id_usuario),
    tipo VARCHAR(20) NOT NULL,
    cantidad INT NOT NULL CHECK (cantidad <> 0),
    stock_resultante INT NOT NULL CHECK (stock_resultante >= 0),
    fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
    observacion TEXT,
    id_venta INT,
    id_compra INT,
    clave_operacion UUID UNIQUE,
    FOREIGN KEY (id_venta, id_producto) REFERENCES detalle_venta (id_venta, id_producto),
    FOREIGN KEY (id_compra, id_producto) REFERENCES detalle_compra (id_compra, id_producto),
    CONSTRAINT movimiento_stock_signo_check CHECK (
        (tipo IN ('STOCK_INICIAL', 'INGRESO', 'ANULACION_VENTA', 'ANULACION_COMPRA') AND cantidad > 0)
        OR (tipo IN ('EGRESO', 'PERDIDA', 'DANADO', 'VENTA_POS', 'COMPRA_ONLINE') AND cantidad < 0)
        OR (tipo = 'AJUSTE')),
    CONSTRAINT movimiento_stock_origen_check CHECK (
        (tipo = 'STOCK_INICIAL' AND id_venta IS NULL AND id_compra IS NULL AND clave_operacion IS NULL)
        OR (tipo IN ('INGRESO', 'EGRESO', 'AJUSTE', 'PERDIDA', 'DANADO')
            AND id_venta IS NULL AND id_compra IS NULL AND clave_operacion IS NOT NULL)
        OR (tipo IN ('VENTA_POS', 'ANULACION_VENTA')
            AND id_venta IS NOT NULL AND id_compra IS NULL AND clave_operacion IS NULL)
        OR (tipo IN ('COMPRA_ONLINE', 'ANULACION_COMPRA')
            AND id_compra IS NOT NULL AND id_venta IS NULL AND clave_operacion IS NULL)),
    CONSTRAINT movimiento_stock_observacion_check CHECK (
        tipo NOT IN ('EGRESO', 'AJUSTE', 'PERDIDA', 'DANADO') OR observacion IS NOT NULL)
);

CREATE UNIQUE INDEX movimiento_stock_inicial_idx ON movimiento_stock (id_producto) WHERE tipo = 'STOCK_INICIAL';
CREATE UNIQUE INDEX movimiento_stock_venta_idx ON movimiento_stock (id_venta, id_producto, tipo) WHERE id_venta IS NOT NULL;
CREATE UNIQUE INDEX movimiento_stock_compra_idx ON movimiento_stock (id_compra, id_producto, tipo) WHERE id_compra IS NOT NULL;
CREATE INDEX movimiento_stock_producto_fecha_idx ON movimiento_stock (id_producto, fecha);
CREATE INDEX movimiento_stock_fecha_idx ON movimiento_stock (fecha);
