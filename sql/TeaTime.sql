-- =====================================================
-- TEATIME STORE
-- ESTRUCTURA DE BASE DE DATOS
-- =====================================================


-- =====================================================
-- TABLA: categoria
-- =====================================================

CREATE TABLE categoria (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT
);


-- =====================================================
-- TABLA: promocion
-- =====================================================

CREATE TABLE promocion (
    id_promocion SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    porcentaje_descuento NUMERIC(5, 2) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL
);


-- =====================================================
-- TABLA: usuario
-- =====================================================

CREATE TABLE usuario (
    id_usuario SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    contrasena VARCHAR NOT NULL,
    telefono VARCHAR(30)
);


-- =====================================================
-- TABLAS DE TIPOS DE USUARIO
-- =====================================================

-- ADMINISTRADOR

CREATE TABLE administrador (
    id_usuario INT PRIMARY KEY,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);


-- CLIENTE

CREATE TABLE cliente (
    id_usuario INT PRIMARY KEY,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);


-- VENDEDOR

CREATE TABLE vendedor (
    id_usuario INT PRIMARY KEY,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);


-- =====================================================
-- TABLA: producto
-- =====================================================

CREATE TABLE producto (
    id_producto SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    id_categoria INT NOT NULL,

    FOREIGN KEY (id_categoria)
        REFERENCES categoria(id_categoria)
);


-- =====================================================
-- RELACIÓN: producto - promocion
-- =====================================================

CREATE TABLE producto_promocion (
    id_producto INT NOT NULL,
    id_promocion INT NOT NULL,

    PRIMARY KEY (id_producto, id_promocion),

    FOREIGN KEY (id_producto)
        REFERENCES producto(id_producto),

    FOREIGN KEY (id_promocion)
        REFERENCES promocion(id_promocion)
);


-- =====================================================
-- ECOMMERCE
-- =====================================================

-- CARRITO

CREATE TABLE carrito (
    id_carrito SERIAL PRIMARY KEY,
    fecha_creacion DATE NOT NULL DEFAULT CURRENT_DATE,
    id_cliente INT NOT NULL UNIQUE,

    FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_usuario)
);


-- DETALLE DEL CARRITO

CREATE TABLE detalle_carrito (
    id_carrito INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,

    PRIMARY KEY (id_carrito, id_producto),

    FOREIGN KEY (id_carrito)
        REFERENCES carrito(id_carrito),

    FOREIGN KEY (id_producto)
        REFERENCES producto(id_producto)
);


-- FAVORITOS

CREATE TABLE favorito (
    id_cliente INT NOT NULL,
    id_producto INT NOT NULL,
    fecha_agregado DATE NOT NULL DEFAULT CURRENT_DATE,

    PRIMARY KEY (id_cliente, id_producto),

    FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_usuario),

    FOREIGN KEY (id_producto)
        REFERENCES producto(id_producto)
);


-- COMPRA ONLINE

CREATE TABLE compra (
    id_compra SERIAL PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    estado VARCHAR(30) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    id_cliente INT NOT NULL,

    FOREIGN KEY (id_cliente)
        REFERENCES cliente(id_usuario)
);


-- DETALLE DE COMPRA

CREATE TABLE detalle_compra (
    id_compra INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL,

    PRIMARY KEY (id_compra, id_producto),

    FOREIGN KEY (id_compra)
        REFERENCES compra(id_compra),

    FOREIGN KEY (id_producto)
        REFERENCES producto(id_producto)
);


-- =====================================================
-- PUNTO DE VENTA (POS)
-- =====================================================

-- VENTA PRESENCIAL

CREATE TABLE venta (
    id_venta SERIAL PRIMARY KEY,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    estado VARCHAR(30) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    id_vendedor INT NOT NULL,

    FOREIGN KEY (id_vendedor)
        REFERENCES vendedor(id_usuario)
);


-- DETALLE DE VENTA

CREATE TABLE detalle_venta (
    id_venta INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL,

    PRIMARY KEY (id_venta, id_producto),

    FOREIGN KEY (id_venta)
        REFERENCES venta(id_venta),

    FOREIGN KEY (id_producto)
        REFERENCES producto(id_producto)
);


-- =====================================================
-- ADMINISTRACIÓN
-- =====================================================

-- REPORTE

CREATE TABLE reporte (
    id_reporte SERIAL PRIMARY KEY,
    tipo VARCHAR(100) NOT NULL,
    fecha_generacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    id_administrador INT NOT NULL,

    FOREIGN KEY (id_administrador)
        REFERENCES administrador(id_usuario)
);