const { crearError } = require('./respuesta');

// Punto único de Mercado Pago.
// Modo actual (QR_MANUAL): se muestra el QR del comercio y el personal confirma el cobro.
// Para conectar la API oficial, agregar aquí la creación del pago y usar aprobarPago
// desde el webhook, guardando el id de Mercado Pago en referencia_externa.
const datosDeCobro = () => ({
    proveedor: 'MERCADO_PAGO',
    modo: process.env.MP_MODO || 'QR_MANUAL',
    qr_imagen: process.env.MP_QR_IMAGE_URL || null,
    requiere_confirmacion_manual: true
});

// Aprueba un pago pendiente. Mostrar el QR nunca aprueba un pago: alguien o algo debe confirmarlo.
async function aprobarPago(pago, { idUsuario, referencia }, t) {
    if (pago.estado !== 'PENDIENTE') {
        throw crearError(409, 'PAGO_NO_PENDIENTE', 'El pago ya fue procesado');
    }
    pago.estado = 'APROBADO';
    pago.id_usuario_confirma = idUsuario;
    pago.fecha_confirmacion = new Date();
    if (referencia) pago.referencia_externa = referencia;
    await pago.save({ transaction: t });
    return pago;
}

module.exports = { datosDeCobro, aprobarPago };
