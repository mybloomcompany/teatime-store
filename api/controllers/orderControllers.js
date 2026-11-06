// ===================== Importaciones =====================
const { Op, UniqueConstraintError } = require('sequelize');
const { db, Compra, DetalleCompra, Pago, Carrito, DetalleCarrito, Producto, Usuario, Promocion } = require('../models');
const { ok, lista, crearError, paginacion, esUuid } = require('../utils/respuesta');
const { bloquearProductos, registrarMovimiento } = require('../utils/stock');
const { promocionesPorProducto, calcularPrecio, redondear } = require('../utils/precios');
const { datosDeCobro, aprobarPago } = require('../utils/mercadoPago');

// Solo retiro en el local. El pago aprobado es lo único que confirma el pedido.
const TRANSICIONES = {
    CONFIRMADO: ['EN_PREPARACION'],
    EN_PREPARACION: ['LISTO_PARA_RETIRO'],
    LISTO_PARA_RETIRO: ['ENTREGADO']
};

const incluirDetalle = [
    { model: DetalleCompra, as: 'detalles', include: [
        { model: Producto, as: 'producto', attributes: ['nombre', 'imagen', 'sku', 'presentacion', 'peso'] },
        { model: Promocion, as: 'promocion', attributes: ['nombre'] }
    ] },
    { model: Pago, as: 'pago' },
    { model: Usuario, as: 'cliente', attributes: ['id_usuario', 'nombre', 'apellido', 'email', 'telefono'] }
];

const formatear = (compra) => {
    const data = compra.toJSON();
    const subtotal = redondear(data.detalles.reduce((s, d) => s + Number(d.precio_lista) * d.cantidad, 0));
    return {
        ...data,
        subtotal,
        descuento: redondear(subtotal - Number(data.total)),
        entrega: 'RETIRO_EN_LOCAL',
        cobro: data.pago?.estado === 'PENDIENTE' ? datosDeCobro() : null
    };
};

const buscarCompra = (id) => Compra.findByPk(id, { include: incluirDetalle });

function validarReintento(existente, req) {
    if (existente.id_cliente !== req.user.id
        || (req.body.total_esperado !== undefined && Number(req.body.total_esperado) !== Number(existente.total))) {
        throw crearError(409, 'CLAVE_REUTILIZADA', 'La clave de operación ya fue usada para otra compra');
    }
}

// Devuelve el stock y cierra el pago. Se usa al cancelar y al rechazar un pago.
async function cancelarCompra(compra, idUsuario, estadoPago, t) {
    if (compra.estado === 'CANCELADO') return;
    if (compra.estado === 'ENTREGADO') throw crearError(409, 'PEDIDO_ENTREGADO', 'Un pedido entregado no se puede cancelar');

    const detalles = await DetalleCompra.findAll({ where: { id_compra: compra.id_compra }, transaction: t });
    const productos = await bloquearProductos(detalles.map((d) => d.id_producto), t);

    for (const detalle of detalles) {
        await registrarMovimiento(productos.get(detalle.id_producto), {
            id_usuario: idUsuario, tipo: 'ANULACION_COMPRA', cantidad: detalle.cantidad, id_compra: compra.id_compra
        }, t);
    }

    await Pago.update({ estado: estadoPago }, { where: { id_compra: compra.id_compra }, transaction: t });
    compra.estado = 'CANCELADO';
    await compra.save({ transaction: t });
}

// ===================== Cliente =====================

// Crea el pedido, descuenta stock y deja el pago pendiente. Mostrar el QR no aprueba nada.
const createOrder = async (req, res) => {
    const { clave_operacion, codigo, total_esperado } = req.body;
    if (!esUuid(clave_operacion)) throw crearError(400, 'CLAVE_INVALIDA', 'La clave de operación es obligatoria');

    const procesar = () => db.transaction(async (t) => {
        // Bloquear el carrito hace esperar a un reintento simultáneo.
        const carrito = await Carrito.findOne({ where: { id_cliente: req.user.id }, lock: t.LOCK.UPDATE, transaction: t });

        const existente = await Compra.findOne({ where: { clave_operacion }, transaction: t });
        if (existente) {
            validarReintento(existente, req);
            return { idCompra: existente.id_compra, reintento: true };
        }

        const detalles = carrito ? await DetalleCarrito.findAll({ where: { id_carrito: carrito.id_carrito }, transaction: t }) : [];
        if (!detalles.length) throw crearError(422, 'CARRITO_VACIO', 'El carrito debe contener al menos un producto');

        const ids = detalles.map((d) => d.id_producto);
        const productos = await bloquearProductos(ids, t);
        const promociones = await promocionesPorProducto(ids, codigo, t);

        const lineas = detalles.map((d) => {
            const producto = productos.get(d.id_producto);
            if (!producto || !producto.activo) throw crearError(409, 'PRODUCTO_NO_DISPONIBLE', 'Un producto del carrito ya no está disponible');
            return { cantidad: d.cantidad, producto, ...calcularPrecio(producto.precio, promociones.get(d.id_producto)) };
        });

        const total = redondear(lineas.reduce((s, l) => s + l.precio_unitario * l.cantidad, 0));
        if (total_esperado !== undefined && Number(total_esperado) !== total) {
            throw crearError(409, 'TOTAL_CAMBIO', `El total del pedido cambió a $${total}. Revise el carrito`);
        }

        const compra = await Compra.create({ estado: 'PENDIENTE_PAGO', total, id_cliente: req.user.id, clave_operacion }, { transaction: t });

        for (const linea of lineas) {
            await DetalleCompra.create({
                id_compra: compra.id_compra, id_producto: linea.producto.id_producto, cantidad: linea.cantidad,
                precio_lista: linea.precio_lista, precio_unitario: linea.precio_unitario, id_promocion: linea.id_promocion
            }, { transaction: t });
            await registrarMovimiento(linea.producto, {
                id_usuario: req.user.id, tipo: 'COMPRA_ONLINE', cantidad: -linea.cantidad, id_compra: compra.id_compra
            }, t);
        }

        await Pago.create({ id_compra: compra.id_compra, metodo: 'MERCADO_PAGO_QR', estado: 'PENDIENTE', monto: total }, { transaction: t });
        await DetalleCarrito.destroy({ where: { id_carrito: carrito.id_carrito }, transaction: t });

        return { idCompra: compra.id_compra, reintento: false };
    });

    let resultado;
    try {
        resultado = await procesar();
    } catch (err) {
        if (!(err instanceof UniqueConstraintError) || !err.fields?.clave_operacion) throw err;
        const existente = await Compra.findOne({ where: { clave_operacion } });
        validarReintento(existente, req);
        resultado = { idCompra: existente.id_compra, reintento: true };
    }

    return ok(res, formatear(await buscarCompra(resultado.idCompra)), resultado.reintento ? 200 : 201);
};

const getMyOrders = async (req, res) => {
    const { page, limit, offset } = paginacion(req.query, 20);
    const { rows, count } = await Compra.findAndCountAll({
        where: { id_cliente: req.user.id }, limit, offset, order: [['id_compra', 'DESC']], distinct: true,
        include: [{ model: Pago, as: 'pago', attributes: ['estado', 'metodo'] }]
    });
    return lista(res, rows, page, limit, count);
};

const getMyOrder = async (req, res) => {
    const compra = await buscarCompra(req.params.id);
    // El mismo error si no existe o es ajena: no revela pedidos de otros clientes.
    if (!compra || compra.id_cliente !== req.user.id) throw crearError(404, 'PEDIDO_NO_ENCONTRADO', 'Pedido no encontrado');
    return ok(res, formatear(compra));
};

// El cliente avisa que pagó e informa el número de operación. No aprueba el pago.
const notifyPayment = async (req, res) => {
    const referencia = req.body.referencia?.trim();
    if (!referencia) throw crearError(400, 'DATOS_INCOMPLETOS', 'Indique el número de operación');

    const compra = await Compra.findByPk(req.params.id);
    if (!compra || compra.id_cliente !== req.user.id) throw crearError(404, 'PEDIDO_NO_ENCONTRADO', 'Pedido no encontrado');

    const pago = await Pago.findOne({ where: { id_compra: compra.id_compra } });
    if (pago.estado !== 'PENDIENTE') throw crearError(409, 'PAGO_NO_PENDIENTE', 'El pago ya fue procesado');

    pago.referencia_externa = referencia;
    await pago.save();
    return ok(res, formatear(await buscarCompra(compra.id_compra)));
};

const cancelMyOrder = async (req, res) => {
    await db.transaction(async (t) => {
        const compra = await Compra.findByPk(req.params.id, { lock: t.LOCK.UPDATE, transaction: t });
        if (!compra || compra.id_cliente !== req.user.id) throw crearError(404, 'PEDIDO_NO_ENCONTRADO', 'Pedido no encontrado');
        if (!['PENDIENTE_PAGO', 'CANCELADO'].includes(compra.estado)) {
            throw crearError(409, 'NO_CANCELABLE', 'El pedido ya fue confirmado. Comuníquese con la tienda');
        }
        await cancelarCompra(compra, req.user.id, 'ANULADO', t);
    });
    return ok(res, formatear(await buscarCompra(req.params.id)));
};

// ===================== Administración =====================

const getOrders = async (req, res) => {
    const { page, limit, offset } = paginacion(req.query, 20);
    const where = {};
    if (req.query.estado) where.estado = req.query.estado;

    const include = [
        { model: Pago, as: 'pago', attributes: ['estado', 'metodo', 'referencia_externa'] },
        { model: Usuario, as: 'cliente', attributes: ['nombre', 'apellido', 'email'] }
    ];
    if (req.query.search) {
        const q = { [Op.iLike]: `%${req.query.search}%` };
        include[1].where = { [Op.or]: [{ nombre: q }, { apellido: q }, { email: q }] };
    }

    const { rows, count } = await Compra.findAndCountAll({ where, include, limit, offset, order: [['id_compra', 'DESC']], distinct: true });
    return lista(res, rows, page, limit, count);
};

const getOrder = async (req, res) => {
    const compra = await buscarCompra(req.params.id);
    if (!compra) throw crearError(404, 'PEDIDO_NO_ENCONTRADO', 'Pedido no encontrado');
    return ok(res, formatear(compra));
};

const updateOrderStatus = async (req, res) => {
    const { estado } = req.body;

    await db.transaction(async (t) => {
        const compra = await Compra.findByPk(req.params.id, { lock: t.LOCK.UPDATE, transaction: t });
        if (!compra) throw crearError(404, 'PEDIDO_NO_ENCONTRADO', 'Pedido no encontrado');

        if (estado === 'CANCELADO') return cancelarCompra(compra, req.user.id, 'ANULADO', t);
        if (compra.estado === estado) return;
        if (!TRANSICIONES[compra.estado]?.includes(estado)) {
            throw crearError(409, 'TRANSICION_INVALIDA', `No se puede pasar de ${compra.estado} a ${estado}`);
        }
        compra.estado = estado;
        await compra.save({ transaction: t });
    });

    return ok(res, formatear(await buscarCompra(req.params.id)));
};

// Confirmación manual del personal autorizado. Reutilizable por un futuro webhook de Mercado Pago.
const confirmPayment = async (req, res) => {
    await db.transaction(async (t) => {
        const compra = await Compra.findByPk(req.params.id, { lock: t.LOCK.UPDATE, transaction: t });
        if (!compra) throw crearError(404, 'PEDIDO_NO_ENCONTRADO', 'Pedido no encontrado');

        const pago = await Pago.findOne({ where: { id_compra: compra.id_compra }, lock: t.LOCK.UPDATE, transaction: t });
        if (pago.estado === 'APROBADO') return; // reintento de una confirmación ya hecha
        if (compra.estado !== 'PENDIENTE_PAGO') throw crearError(409, 'PAGO_NO_PENDIENTE', 'El pedido no está pendiente de pago');

        await aprobarPago(pago, { idUsuario: req.user.id, referencia: req.body?.referencia?.trim() }, t);
        compra.estado = 'CONFIRMADO';
        await compra.save({ transaction: t });
    });
    return ok(res, formatear(await buscarCompra(req.params.id)));
};

const rejectPayment = async (req, res) => {
    await db.transaction(async (t) => {
        const compra = await Compra.findByPk(req.params.id, { lock: t.LOCK.UPDATE, transaction: t });
        if (!compra) throw crearError(404, 'PEDIDO_NO_ENCONTRADO', 'Pedido no encontrado');
        if (compra.estado === 'CANCELADO') return;
        if (compra.estado !== 'PENDIENTE_PAGO') throw crearError(409, 'PAGO_NO_PENDIENTE', 'El pedido no está pendiente de pago');
        await cancelarCompra(compra, req.user.id, 'RECHAZADO', t);
    });
    return ok(res, formatear(await buscarCompra(req.params.id)));
};

// ===================== Exportaciones =====================
module.exports = {
    createOrder, getMyOrders, getMyOrder, notifyPayment, cancelMyOrder,
    getOrders, getOrder, updateOrderStatus, confirmPayment, rejectPayment
};
