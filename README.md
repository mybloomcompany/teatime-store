# TeaTime

Sistema web de **ecommerce y gestión administrativa** desarrollado por **MYBLOOM** para **TeaTime Store**.

El proyecto tiene como objetivo digitalizar el proceso de venta y mejorar la gestión interna del negocio, centralizando la información de productos, ventas, stock y promociones en una única plataforma.

## 📌 Proyecto

TeaTime Store es una tienda física especializada en té, accesorios y productos relacionados.

Actualmente, parte de la gestión del negocio se realiza mediante procesos manuales y planillas de Excel, lo que puede generar errores, información desactualizada y dificultades para controlar la mercadería disponible.

TeaTime busca brindar una solución digital que permita optimizar estos procesos y mejorar la experiencia de compra de los clientes.

## 🛒 Ecommerce

El módulo de ecommerce estará destinado a los clientes y permitirá:

- Visualizar el catálogo de productos.
- Buscar productos por diferentes criterios.
- Consultar características, precios y disponibilidad.
- Visualizar promociones.
- Agregar productos al carrito.
- Modificar cantidades y eliminar productos.
- Aplicar códigos de descuento.
- Registrarse e iniciar sesión.
- Guardar productos favoritos.
- Realizar compras online.
- Consultar el historial de compras.

## 🏢 Gestión administrativa

El módulo administrativo estará destinado a la gestión interna de TeaTime Store.

Permitirá:

- Administrar productos y categorías.
- Controlar el stock.
- Registrar entradas y salidas de mercadería.
- Registrar y consultar ventas.
- Gestionar pedidos.
- Administrar promociones y descuentos.
- Controlar ingresos y egresos.
- Generar reportes de ventas y productos.

## 👥 Roles

El sistema contará con tres roles principales:

### Administrador

Responsable de la gestión general del sistema, productos, categorías, stock, promociones y reportes.

### Vendedor

Responsable del registro de ventas, consulta de stock, atención de pedidos y actualización de información básica.

### Cliente

Podrá consultar productos y promociones, realizar compras online, utilizar el carrito, guardar favoritos y consultar su historial de compras.

## 🛠️ Tecnologías

| Tecnología | Uso |
|---|---|
| React | Desarrollo de la interfaz |
| JavaScript | Lenguaje principal |
| Node.js | Desarrollo del servidor |
| Sequelize | Base de datos |
| Figma | Diseño y prototipado |
| Git | Control de versiones |
| GitHub | Gestión del repositorio |

## 📁 Estructura del proyecto

La estructura del proyecto se irá construyendo progresivamente durante el desarrollo.

```text
teatime-store/
│
├── .github/       # Configuración y automatizaciones de GitHub
├── api/           # Backend y API
├── client/        # Aplicación frontend
├── docs/          # Documentación técnica del proyecto
│
├── .gitignore
└── README.md
```

## 🌿 Flujo de trabajo

El repositorio utiliza un flujo basado en ramas para mantener controladas las modificaciones del proyecto.

```text
feature-*
    │
    ▼
  develop
    │
    ▼
   main
```

Las funcionalidades se desarrollan en ramas independientes y se integran mediante Pull Requests.

Las ramas `develop` y `main` estarán protegidas para evitar modificaciones directas y requerirán las revisiones correspondientes antes de aceptar cambios.

## 🎨 Diseño

El diseño y prototipado de TeaTime se realizará utilizando Figma.

El ecommerce y el módulo administrativo compartirán una identidad visual y un sistema de componentes común para mantener la coherencia de la plataforma.

## 👨‍💻 Desarrollo

**MYBLOOM**

Proyecto Profesional — Desarrollo de Sistemas — 6º10.
