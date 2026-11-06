-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;

COMMENT ON SCHEMA public IS 'standard public schema';

-- DROP SEQUENCE public.carrito_id_carrito_seq;

CREATE SEQUENCE public.carrito_id_carrito_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.categoria_id_categoria_seq;

CREATE SEQUENCE public.categoria_id_categoria_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.compra_id_compra_seq;

CREATE SEQUENCE public.compra_id_compra_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.producto_id_producto_seq;

CREATE SEQUENCE public.producto_id_producto_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.promocion_id_promocion_seq;

CREATE SEQUENCE public.promocion_id_promocion_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.reporte_id_reporte_seq;

CREATE SEQUENCE public.reporte_id_reporte_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.usuario_id_usuario_seq;

CREATE SEQUENCE public.usuario_id_usuario_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.venta_id_venta_seq;

CREATE SEQUENCE public.venta_id_venta_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;-- public.categoria definition

-- Drop table

-- DROP TABLE public.categoria;

CREATE TABLE public.categoria (
	id_categoria serial4 NOT NULL,
	nombre varchar(100) NOT NULL,
	descripcion text NULL,
	CONSTRAINT categoria_id_categoria_not_null NOT NULL id_categoria,
	CONSTRAINT categoria_nombre_not_null NOT NULL nombre,
	CONSTRAINT categoria_pkey PRIMARY KEY (id_categoria)
);


-- public.promocion definition

-- Drop table

-- DROP TABLE public.promocion;

CREATE TABLE public.promocion (
	id_promocion serial4 NOT NULL,
	nombre varchar(100) NOT NULL,
	descripcion text NULL,
	porcentaje_descuento numeric(5, 2) NOT NULL,
	fecha_inicio date NOT NULL,
	fecha_fin date NOT NULL,
	CONSTRAINT promocion_fecha_fin_not_null NOT NULL fecha_fin,
	CONSTRAINT promocion_fecha_inicio_not_null NOT NULL fecha_inicio,
	CONSTRAINT promocion_id_promocion_not_null NOT NULL id_promocion,
	CONSTRAINT promocion_nombre_not_null NOT NULL nombre,
	CONSTRAINT promocion_pkey PRIMARY KEY (id_promocion),
	CONSTRAINT promocion_porcentaje_descuento_not_null NOT NULL porcentaje_descuento
);


-- public.usuario definition

-- Drop table

-- DROP TABLE public.usuario;

CREATE TABLE public.usuario (
	id_usuario serial4 NOT NULL,
	nombre varchar(100) NOT NULL,
	apellido varchar(100) NOT NULL,
	email varchar(150) NOT NULL,
	contrasena varchar NOT NULL,
	telefono varchar(30) NULL,
	CONSTRAINT usuario_apellido_not_null NOT NULL apellido,
	CONSTRAINT usuario_contrasena_not_null NOT NULL contrasena,
	CONSTRAINT usuario_email_key UNIQUE (email),
	CONSTRAINT usuario_email_not_null NOT NULL email,
	CONSTRAINT usuario_id_usuario_not_null NOT NULL id_usuario,
	CONSTRAINT usuario_nombre_not_null NOT NULL nombre,
	CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario)
);


-- public.administrador definition

-- Drop table

-- DROP TABLE public.administrador;

CREATE TABLE public.administrador (
	id_usuario int4 NOT NULL,
	CONSTRAINT administrador_id_usuario_not_null NOT NULL id_usuario,
	CONSTRAINT administrador_pkey PRIMARY KEY (id_usuario),
	CONSTRAINT administrador_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);


-- public.cliente definition

-- Drop table

-- DROP TABLE public.cliente;

CREATE TABLE public.cliente (
	id_usuario int4 NOT NULL,
	CONSTRAINT cliente_id_usuario_not_null NOT NULL id_usuario,
	CONSTRAINT cliente_pkey PRIMARY KEY (id_usuario),
	CONSTRAINT cliente_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);


-- public.compra definition

-- Drop table

-- DROP TABLE public.compra;

CREATE TABLE public.compra (
	id_compra serial4 NOT NULL,
	fecha date DEFAULT CURRENT_DATE NOT NULL,
	estado varchar(30) NOT NULL,
	total numeric(10, 2) NOT NULL,
	id_cliente int4 NOT NULL,
	CONSTRAINT compra_estado_not_null NOT NULL estado,
	CONSTRAINT compra_fecha_not_null NOT NULL fecha,
	CONSTRAINT compra_id_cliente_not_null NOT NULL id_cliente,
	CONSTRAINT compra_id_compra_not_null NOT NULL id_compra,
	CONSTRAINT compra_pkey PRIMARY KEY (id_compra),
	CONSTRAINT compra_total_not_null NOT NULL total,
	CONSTRAINT compra_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.cliente(id_usuario)
);


-- public.producto definition

-- Drop table

-- DROP TABLE public.producto;

CREATE TABLE public.producto (
	id_producto serial4 NOT NULL,
	nombre varchar(150) NOT NULL,
	descripcion text NULL,
	precio numeric(10, 2) NOT NULL,
	stock int4 DEFAULT 0 NOT NULL,
	id_categoria int4 NOT NULL,
	CONSTRAINT producto_id_categoria_not_null NOT NULL id_categoria,
	CONSTRAINT producto_id_producto_not_null NOT NULL id_producto,
	CONSTRAINT producto_nombre_not_null NOT NULL nombre,
	CONSTRAINT producto_pkey PRIMARY KEY (id_producto),
	CONSTRAINT producto_precio_not_null NOT NULL precio,
	CONSTRAINT producto_stock_not_null NOT NULL stock,
	CONSTRAINT producto_id_categoria_fkey FOREIGN KEY (id_categoria) REFERENCES public.categoria(id_categoria)
);


-- public.producto_promocion definition

-- Drop table

-- DROP TABLE public.producto_promocion;

CREATE TABLE public.producto_promocion (
	id_producto int4 NOT NULL,
	id_promocion int4 NOT NULL,
	CONSTRAINT producto_promocion_id_producto_not_null NOT NULL id_producto,
	CONSTRAINT producto_promocion_id_promocion_not_null NOT NULL id_promocion,
	CONSTRAINT producto_promocion_pkey PRIMARY KEY (id_producto, id_promocion),
	CONSTRAINT producto_promocion_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.producto(id_producto),
	CONSTRAINT producto_promocion_id_promocion_fkey FOREIGN KEY (id_promocion) REFERENCES public.promocion(id_promocion)
);


-- public.reporte definition

-- Drop table

-- DROP TABLE public.reporte;

CREATE TABLE public.reporte (
	id_reporte serial4 NOT NULL,
	tipo varchar(100) NOT NULL,
	fecha_generacion timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	id_administrador int4 NOT NULL,
	CONSTRAINT reporte_fecha_generacion_not_null NOT NULL fecha_generacion,
	CONSTRAINT reporte_id_administrador_not_null NOT NULL id_administrador,
	CONSTRAINT reporte_id_reporte_not_null NOT NULL id_reporte,
	CONSTRAINT reporte_pkey PRIMARY KEY (id_reporte),
	CONSTRAINT reporte_tipo_not_null NOT NULL tipo,
	CONSTRAINT reporte_id_administrador_fkey FOREIGN KEY (id_administrador) REFERENCES public.administrador(id_usuario)
);


-- public.vendedor definition

-- Drop table

-- DROP TABLE public.vendedor;

CREATE TABLE public.vendedor (
	id_usuario int4 NOT NULL,
	CONSTRAINT vendedor_id_usuario_not_null NOT NULL id_usuario,
	CONSTRAINT vendedor_pkey PRIMARY KEY (id_usuario),
	CONSTRAINT vendedor_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario)
);


-- public.venta definition

-- Drop table

-- DROP TABLE public.venta;

CREATE TABLE public.venta (
	id_venta serial4 NOT NULL,
	fecha date DEFAULT CURRENT_DATE NOT NULL,
	estado varchar(30) NOT NULL,
	total numeric(10, 2) NOT NULL,
	id_vendedor int4 NOT NULL,
	CONSTRAINT venta_estado_not_null NOT NULL estado,
	CONSTRAINT venta_fecha_not_null NOT NULL fecha,
	CONSTRAINT venta_id_vendedor_not_null NOT NULL id_vendedor,
	CONSTRAINT venta_id_venta_not_null NOT NULL id_venta,
	CONSTRAINT venta_pkey PRIMARY KEY (id_venta),
	CONSTRAINT venta_total_not_null NOT NULL total,
	CONSTRAINT venta_id_vendedor_fkey FOREIGN KEY (id_vendedor) REFERENCES public.vendedor(id_usuario)
);


-- public.carrito definition

-- Drop table

-- DROP TABLE public.carrito;

CREATE TABLE public.carrito (
	id_carrito serial4 NOT NULL,
	fecha_creacion date DEFAULT CURRENT_DATE NOT NULL,
	id_cliente int4 NOT NULL,
	CONSTRAINT carrito_fecha_creacion_not_null NOT NULL fecha_creacion,
	CONSTRAINT carrito_id_carrito_not_null NOT NULL id_carrito,
	CONSTRAINT carrito_id_cliente_key UNIQUE (id_cliente),
	CONSTRAINT carrito_id_cliente_not_null NOT NULL id_cliente,
	CONSTRAINT carrito_pkey PRIMARY KEY (id_carrito),
	CONSTRAINT carrito_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.cliente(id_usuario)
);


-- public.detalle_carrito definition

-- Drop table

-- DROP TABLE public.detalle_carrito;

CREATE TABLE public.detalle_carrito (
	id_carrito int4 NOT NULL,
	id_producto int4 NOT NULL,
	cantidad int4 NOT NULL,
	CONSTRAINT detalle_carrito_cantidad_not_null NOT NULL cantidad,
	CONSTRAINT detalle_carrito_id_carrito_not_null NOT NULL id_carrito,
	CONSTRAINT detalle_carrito_id_producto_not_null NOT NULL id_producto,
	CONSTRAINT detalle_carrito_pkey PRIMARY KEY (id_carrito, id_producto),
	CONSTRAINT detalle_carrito_id_carrito_fkey FOREIGN KEY (id_carrito) REFERENCES public.carrito(id_carrito),
	CONSTRAINT detalle_carrito_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.producto(id_producto)
);


-- public.detalle_compra definition

-- Drop table

-- DROP TABLE public.detalle_compra;

CREATE TABLE public.detalle_compra (
	id_compra int4 NOT NULL,
	id_producto int4 NOT NULL,
	cantidad int4 NOT NULL,
	precio_unitario numeric(10, 2) NOT NULL,
	CONSTRAINT detalle_compra_cantidad_not_null NOT NULL cantidad,
	CONSTRAINT detalle_compra_id_compra_not_null NOT NULL id_compra,
	CONSTRAINT detalle_compra_id_producto_not_null NOT NULL id_producto,
	CONSTRAINT detalle_compra_pkey PRIMARY KEY (id_compra, id_producto),
	CONSTRAINT detalle_compra_precio_unitario_not_null NOT NULL precio_unitario,
	CONSTRAINT detalle_compra_id_compra_fkey FOREIGN KEY (id_compra) REFERENCES public.compra(id_compra),
	CONSTRAINT detalle_compra_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.producto(id_producto)
);


-- public.detalle_venta definition

-- Drop table

-- DROP TABLE public.detalle_venta;

CREATE TABLE public.detalle_venta (
	id_venta int4 NOT NULL,
	id_producto int4 NOT NULL,
	cantidad int4 NOT NULL,
	precio_unitario numeric(10, 2) NOT NULL,
	CONSTRAINT detalle_venta_cantidad_not_null NOT NULL cantidad,
	CONSTRAINT detalle_venta_id_producto_not_null NOT NULL id_producto,
	CONSTRAINT detalle_venta_id_venta_not_null NOT NULL id_venta,
	CONSTRAINT detalle_venta_pkey PRIMARY KEY (id_venta, id_producto),
	CONSTRAINT detalle_venta_precio_unitario_not_null NOT NULL precio_unitario,
	CONSTRAINT detalle_venta_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.producto(id_producto),
	CONSTRAINT detalle_venta_id_venta_fkey FOREIGN KEY (id_venta) REFERENCES public.venta(id_venta)
);


-- public.favorito definition

-- Drop table

-- DROP TABLE public.favorito;

CREATE TABLE public.favorito (
	id_cliente int4 NOT NULL,
	id_producto int4 NOT NULL,
	fecha_agregado date DEFAULT CURRENT_DATE NOT NULL,
	CONSTRAINT favorito_fecha_agregado_not_null NOT NULL fecha_agregado,
	CONSTRAINT favorito_id_cliente_not_null NOT NULL id_cliente,
	CONSTRAINT favorito_id_producto_not_null NOT NULL id_producto,
	CONSTRAINT favorito_pkey PRIMARY KEY (id_cliente, id_producto),
	CONSTRAINT favorito_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.cliente(id_usuario),
	CONSTRAINT favorito_id_producto_fkey FOREIGN KEY (id_producto) REFERENCES public.producto(id_producto)
);