# Manual técnico — TeaTime

## Tecnologías

React 19, Vite, React Router y Axios en el frontend. Node.js, Express 5, Sequelize 6, JWT y bcryptjs en el backend. PostgreSQL como base de datos.

## Instalación

Requisitos: Node.js y PostgreSQL con una base llamada `teatime`.

1. Crear el esquema, en este orden:

```bash
psql -U postgres -d teatime -f sql/TeaTime.sql
```

```bash
psql -U postgres -d teatime -f sql/TeaTime_cambios_v2.sql
```

2. Configurar la API: copiar `api/.env.example` como `api/.env` y completar los valores. `SEED_PASSWORD` define la contraseña de las cuentas de prueba.

Los comandos siguientes funcionan en Windows PowerShell y en Git Bash. Se ejecutan de a uno, empezando desde la carpeta `teatime-store`.

3. En una terminal, instalar la API, cargar los datos de prueba e iniciarla en `http://localhost:3000`:

```bash
cd api
```

```bash
npm install
```

```bash
npm run seed
```

```bash
npm start
```

4. En otra terminal, instalar e iniciar el frontend en `http://localhost:5173`:

```bash
cd client
```

```bash
npm install
```

```bash
npm run dev
```

Los emails de las cuentas de prueba están en `api/config/seeder.js`. Son solo para desarrollo.

## Estructura

```text
api/
├── app.js            Servidor Express
├── config/           Conexión, JWT y datos de prueba
├── models/           Modelos Sequelize y relaciones (index.js)
├── controllers/      Lógica de cada recurso
├── routes/index.js   Todas las rutas y sus permisos
├── middlewares/      Autenticación, roles y errores
├── utils/            Stock, precios, respuestas y Mercado Pago
└── tests/            Prueba de integración
client/src/
├── api/axios.js      URL base y token
├── context/          Sesión del usuario
├── utils/            Formatos e idempotencia
└── components/       General, Ecommerce, POS y Admin
```

## Configuración y secretos

- `api/config/` contiene código y se versiona. Lee los valores de `process.env`.
- `api/.env` contiene los secretos y **nunca** se versiona.
- `api/.env.example` es la plantilla y sí se versiona.

## API

- Prefijo: `/api/v1`.
- Autenticación: encabezado `Authorization` con el token, con o sin `Bearer`.
- Respuesta correcta: `{ "success": true, "data": ... }`.
- Error: `{ "success": false, "error": { "code": "...", "message": "..." } }`.

La lista completa y sus permisos está en `api/routes/index.js`. Hay una colección en `docs/Postman/TeaTime.postman_collection.json`.

## Mercado Pago

Modo actual, `MP_MODO=QR_MANUAL`:

- `MP_QR_IMAGE_URL` indica la imagen del QR del comercio. Mientras esté vacía, el sistema avisa que no está configurado.
- Mostrar el QR nunca aprueba un pago. Lo aprueba el personal: el vendedor en el POS y el administrador en los pedidos.

Para conectar la API oficial, los cambios van en `api/utils/mercadoPago.js`:

1. Crear el pago en Mercado Pago al generar el pedido y guardar su id en `pago.referencia_externa`.
2. Agregar un webhook que busque el pago por esa referencia y llame a `aprobarPago`.

No hay credenciales de Mercado Pago en el proyecto.

## Pruebas

Con la API encendida y los datos de prueba cargados:

```bash
cd api
```

```bash
npm test
```

La prueba crea datos en la base. Para la demostración, conviene volver a cargar una base limpia.
