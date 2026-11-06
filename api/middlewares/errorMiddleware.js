// Express 5 envía aquí los errores de los controladores async.
function notFound(req, res) {
    res.status(404).json({ success: false, error: { code: 'RUTA_NO_ENCONTRADA', message: 'La ruta solicitada no existe' } });
}

function errorMiddleware(err, req, res, next) {
    if (err.status) {
        return res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ success: false, error: { code: 'DUPLICADO', message: 'Ya existe un registro con esos datos' } });
    }
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ success: false, error: { code: 'DATOS_INVALIDOS', message: err.errors[0].message } });
    }
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(409).json({ success: false, error: { code: 'EN_USO', message: 'El registro está relacionado con otros datos' } });
    }
    if (err.name === 'SequelizeDatabaseError' && err.original?.code === '22P02') {
        return res.status(400).json({ success: false, error: { code: 'DATOS_INVALIDOS', message: 'Alguno de los datos enviados no tiene el formato correcto' } });
    }
    if (err.name === 'SequelizeDatabaseError' && err.original?.code === '23514') {
        return res.status(400).json({ success: false, error: { code: 'DATOS_INVALIDOS', message: 'Los datos no cumplen las reglas del sistema' } });
    }

    console.error(err);
    return res.status(500).json({ success: false, error: { code: 'ERROR_INTERNO', message: 'Error interno del servidor' } });
}

module.exports = { notFound, errorMiddleware };
