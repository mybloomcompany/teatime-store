// ===================== Importaciones =====================
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { db } = require('./models');
const routes = require('./routes');
const { notFound, errorMiddleware } = require('./middlewares/errorMiddleware');

// ===================== Configuración del servidor =====================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
}));

// ===================== Rutas =====================
app.use('/api/v1', routes);

app.use(notFound);
app.use(errorMiddleware);

// ===================== Inicialización =====================
// No se usa db.sync(): el esquema se administra con los archivos de sql/.
app.listen(PORT, async () => {
    try {
        await db.authenticate();
        console.log(`Servidor corriendo en el puerto ${PORT}. Base de datos conectada.`);
    } catch (err) {
        console.error('Error al conectar con la base de datos:', err.message);
    }
});
