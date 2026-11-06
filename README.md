# TeaTime

Sistema web de **ecommerce, punto de venta y gestión administrativa** desarrollado por **MYBLOOM** para **TeaTime Store**.

El proyecto tiene como objetivo digitalizar y centralizar distintos procesos del negocio, incluyendo la venta online, las ventas presenciales y la gestión interna de productos, stock, promociones y operaciones comerciales.

## 📌 Proyecto

TeaTime Store es una tienda física especializada en té, accesorios y productos relacionados.

Actualmente, parte de la gestión del negocio se realiza mediante procesos manuales y planillas de Excel, lo que puede generar errores, información desactualizada y dificultades para controlar la mercadería y las operaciones del negocio.

TeaTime busca brindar una solución digital integrada que permita optimizar estos procesos y mejorar tanto la experiencia de compra de los clientes como la gestión interna del negocio.

## 🛒 Ecommerce

El módulo de ecommerce estará destinado a los clientes y permitirá:

- Visualizar el catálogo de productos.
- Buscar y explorar productos por diferentes criterios y categorías.
- Consultar características, precios y disponibilidad.
- Visualizar promociones y aplicar códigos de descuento.
- Agregar productos al carrito.
- Modificar cantidades y eliminar productos.
- Registrarse e iniciar sesión.
- Guardar productos favoritos.
- Realizar compras online con retiro en el local.
- Pagar con QR de Mercado Pago, con confirmación manual del personal.
- Consultar el historial, el detalle y el estado de sus compras.

## 🧾 Punto de Venta

El módulo de Punto de Venta (POS) estará destinado al registro y gestión de las ventas presenciales realizadas en TeaTime Store.

Permitirá:

- Abrir y cerrar caja, con arqueo e historial de sesiones.
- Registrar ingresos y egresos de dinero.
- Consultar y buscar productos.
- Registrar productos en una venta y gestionar sus cantidades.
- Aplicar promociones y descuentos permitidos.
- Cobrar en efectivo, con tarjeta o con QR de Mercado Pago.
- Registrar y anular ventas, con actualización automática del stock.
- Generar tickets y consultar las ventas realizadas.

## 🏢 Administración

El módulo administrativo estará destinado a la gestión interna de TeaTime Store.

Permitirá gestionar y consultar información relacionada con:

- Productos, categorías y sabores.
- Stock, con registro de ingresos y egresos de mercadería e historial de movimientos.
- Pedidos y ventas de ambos canales.
- Promociones y descuentos.
- Cajas y sesiones.
- Usuarios del sistema.
- Dashboard y reportes de ventas, productos, stock y caja.

## 👥 Roles

El sistema contará con tres roles principales:

### Administrador

Responsable de la gestión general del sistema y de las funcionalidades administrativas.

### Vendedor

Responsable del Punto de Venta, la caja y el registro de ingresos y egresos de stock. Es el único rol que opera el POS.

### Cliente

Podrá consultar productos y promociones, realizar compras online, utilizar el carrito, guardar favoritos y consultar su historial de compras.

## 🛠️ Tecnologías

| **Tecnología** | **Uso** |
| --- | --- |
| React | Desarrollo de la interfaz |
| JavaScript | Lenguaje principal |
| Node.js | Entorno del servidor |
| Express | Desarrollo de la API |
| Sequelize | ORM para el acceso a datos |
| PostgreSQL | Motor de base de datos |
| DBeaver | Administración y consulta de la base de datos |
| Postman | Prueba de endpoints de la API |
| Figma | Diseño y prototipado |
| Git | Control de versiones |
| GitHub | Gestión del repositorio |

## ▶️ Cómo ejecutar

La instalación completa está en el [manual técnico](docs/Manual_Tecnico.md). También hay un [manual de usuario](docs/Manual_Usuario.md), los [cambios sobre el esquema del Hito 4](docs/BD/Cambios_Esquema.md), los [casos de prueba](docs/Pruebas/Casos_de_Prueba.md) y una [colección de Postman](docs/Postman/TeaTime.postman_collection.json).

## 📁 Estructura del proyecto

```text
teatime-store/
│
├── .github/       # Configuración y automatizaciones de GitHub
├── api/           # Backend y API
├── client/        # Aplicación frontend
├── docs/          # Documentación técnica del proyecto
├── sql/           # Scripts y estructura de la base de datos
│
├── .gitignore
└── README.md
```

## 🌿 Flujo de trabajo

El repositorio utiliza un flujo basado en ramas para mantener controladas las modificaciones del proyecto.

```text
feature/*
    │
    ▼
  develop
    │
    ▼
   main
```

Las funcionalidades se desarrollan en ramas independientes y se integran mediante Pull Requests.

Las ramas `develop` y `main` estarán protegidas para evitar modificaciones directas.

Los cambios deberán integrarse mediante Pull Requests y pasar por las revisiones correspondientes antes de ser aceptados.

## 🎨 Diseño

El diseño y prototipado de TeaTime se realiza utilizando Figma.

Los módulos de Ecommerce, Punto de Venta y Administración comparten la identidad visual del proyecto y utilizarán componentes y criterios de diseño coherentes entre sí.

## 👨‍💻 Desarrollo

**MYBLOOM**

Proyecto Profesional — Desarrollo de Sistemas — 6º10.