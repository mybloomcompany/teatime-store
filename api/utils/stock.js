const { Producto, MovimientoStock } = require('../models');
const { crearError } = require('./respuesta');

// Bloquea los productos en orden de id para que dos operaciones no se bloqueen entre sí.
// Mientras dure la transacción, nadie más puede cambiar el stock de estos productos.
async function bloquearProductos(ids, t) {
    const productos = await Producto.findAll({
        where: { id_producto: ids },
        order: [['id_producto', 'ASC']],
        lock: t.LOCK.UPDATE,
        transaction: t
    });
    return new Map(productos.map((p) => [p.id_producto, p]));
}

// ÚNICO lugar del sistema que cambia producto.stock.
// Guarda el saldo y su movimiento en la misma transacción.
async function registrarMovimiento(producto, datos, t) {
    const stockResultante = producto.stock + datos.cantidad;

    if (stockResultante < 0) {
        throw crearError(409, 'STOCK_INSUFICIENTE', `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}`);
    }

    producto.stock = stockResultante;
    await producto.save({ transaction: t });

    return MovimientoStock.create({
        id_producto: producto.id_producto,
        id_usuario: datos.id_usuario,
        tipo: datos.tipo,
        cantidad: datos.cantidad,
        stock_resultante: stockResultante,
        observacion: datos.observacion || null,
        id_venta: datos.id_venta || null,
        id_compra: datos.id_compra || null,
        clave_operacion: datos.clave_operacion || null
    }, { transaction: t });
}

module.exports = { bloquearProductos, registrarMovimiento };
