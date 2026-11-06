// ===================== Importaciones =====================
const { UniqueConstraintError } = require('sequelize');
const { db, Venta, DetalleVenta, Pago, SesionCaja, Caja, MovimientoCaja, Producto, Usuario, Promocion } = require('../models');
const { ok, lista, crearError, paginacion, esUuid } = require('../utils/respuesta');
const { bloquearProductos, registrarMovimiento } = require('../utils/stock');
const { promocionesPorProducto, calcularPrecio, redondear } = require('../utils/precios');
const { datosDeCobro } = require('../utils/mercadoPago');

// "Descuentos permitidos": promociones más un descuento manual con este tope.
const DESCUENTO_MANUAL_MAX = 10;
const METODOS = ['EFECTIVO', 'TARJETA', 'MERCADO_PAGO_QR'];

const incluirDetalle = [
    { model: DetalleVenta, as: 'detalles', include: [
        { model: Producto, as: 'producto', attributes: ['nombre', 'sku', 'presentacion', 'peso'] },
        { model: Promocion, as: 'promocion', attributes: ['nombre'] }
    ] },
    { model: Pago, as: 'pago' },
    { model: Usuario, as: 'vendedor', attributes: ['nombre', 'apellido'] },
    { model: SesionCaja, as: 'sesion', attributes: ['id_sesion', 'estado'], include: [{ model: Caja, as: 'caja', attributes: ['nombre'] }] }
];

const buscarVenta = (id) => Venta.findByPk(id, { include: incluirDetalle });

const formatearTicket = (venta) => {
    const data = venta.toJSON();
    const subtotal = redondear(data.detalles.reduce((s, d) => s + Number(d.precio_lista) * d.cantidad, 0));
    const recibido = data.pago?.monto_recibido;
    return {
        ...data,
        subtotal,
        descuento_total: redondear(subtotal - Number(data.total)),
        vuelto: recibido != null ? redondear(Number(recibido) - Number(data.total)) : null
    };
};

// Un reintento debe traer exactamente la misma venta que ya se registró.
async function validarReintento(existente, req, items, t) {
    const detalles = await DetalleVenta.findAll({ where: { id_venta: existente.id_venta }, transaction: t });
    const pago = await Pago.findOne({ where: { id_venta: existente.id_venta }, transaction: t });

    const guardado = detalles.map((d) => `${d.id_producto}:${d.cantidad}`).sort().join();
    const enviado = items.map((i) => `${i.id_producto}:${i.cantidad}`).sort().join();

    if (existente.id_vendedor !== req.user.id || guardado !== enviado || pago?.metodo !== req.body.metodo) {
        throw crearError(409, 'CLAVE_REUTILIZADA', 'La clave de operación ya fue usada para otra venta');
    }
}

// ===================== Controladores =====================

// Calcula el ticket con las mismas reglas que la venta, sin guardar nada.
const quoteSale = async (req, res) => {
    const items = (req.body.items || []).map((i) => ({ id_producto: Number(i.id_producto), cantidad: Number(i.cantidad) }));
    const porcentajeManual = Number(req.body.descuento_porcentaje) || 0;
    if (porcentajeManual < 0 || porcentajeManual > DESCUENTO_MANUAL_MAX) throw crearError(422, 'DESCUENTO_NO_PERMITIDO', `El descuento manual máximo es ${DESCUENTO_MANUAL_MAX}%`);
    if (!items.length) return ok(res, { lineas: [], subtotal: 0, descuento_promociones: 0, descuento_manual: 0, total: 0 });

    const ids = items.map((i) => i.id_producto);
    const productos = await Producto.findAll({ where: { id_producto: ids } });
    const promociones = await promocionesPorProducto(ids, req.body.codigo);

    const lineas = items.map((item) => {
        const producto = productos.find((p) => p.id_producto === item.id_producto);
        if (!producto) throw crearError(404, 'PRODUCTO_NO_ENCONTRADO', 'Un producto del ticket no existe');
        const precio = calcularPrecio(producto.precio, promociones.get(item.id_producto));
        return { ...item, nombre: producto.nombre, stock: producto.stock, ...precio, importe: redondear(precio.precio_unitario * item.cantidad) };
    });

    const subtotal = redondear(lineas.reduce((s, l) => s + l.precio_lista * l.cantidad, 0));
    const conPromos = redondear(lineas.reduce((s, l) => s + l.importe, 0));
    const descuentoManual = redondear(conPromos * porcentajeManual / 100);

    return ok(res, {
        lineas,
        subtotal,
        descuento_promociones: redondear(subtotal - conPromos),
        descuento_manual: descuentoManual,
        total: redondear(conPromos - descuentoManual)
    });
};

const getPaymentInfo = async (req, res) => ok(res, datosDeCobro());

// Venta, cobro, stock y caja se guardan juntos o no se guarda nada.
const createSale = async (req, res) => {
    const { clave_operacion, codigo, metodo, monto_recibido, confirmado_manual, referencia, nota, total_esperado } = req.body;
    const items = (req.body.items || []).map((i) => ({ id_producto: Number(i.id_producto), cantidad: Number(i.cantidad) }));
    const porcentajeManual = Number(req.body.descuento_porcentaje) || 0;

    if (!esUuid(clave_operacion)) throw crearError(400, 'CLAVE_INVALIDA', 'La clave de operación es obligatoria');
    if (!items.length) throw crearError(400, 'TICKET_VACIO', 'El ticket no tiene productos');
    if (items.some((i) => !i.id_producto || !Number.isInteger(i.cantidad) || i.cantidad <= 0)) throw crearError(400, 'CANTIDAD_INVALIDA', 'Revise las cantidades del ticket');
    if (new Set(items.map((i) => i.id_producto)).size !== items.length) throw crearError(400, 'PRODUCTO_REPETIDO', 'Un producto no puede repetirse en el ticket');
    if (!METODOS.includes(metodo)) throw crearError(400, 'METODO_INVALIDO', 'Seleccione un método de pago válido');
    if (porcentajeManual < 0 || porcentajeManual > DESCUENTO_MANUAL_MAX) throw crearError(422, 'DESCUENTO_NO_PERMITIDO', `El descuento manual máximo es ${DESCUENTO_MANUAL_MAX}%`);

    // Tarjeta y QR se cobran fuera del sistema: el vendedor debe confirmar que el cobro se acreditó.
    if (metodo !== 'EFECTIVO' && confirmado_manual !== true) {
        throw crearError(422, 'PAGO_SIN_CONFIRMAR', 'Confirme que el pago fue recibido antes de registrar la venta');
    }

    const procesar = () => db.transaction(async (t) => {
        const sesion = await SesionCaja.findOne({ where: { id_vendedor: req.user.id, estado: 'ABIERTA' }, lock: t.LOCK.UPDATE, transaction: t });

        const productos = await bloquearProductos(items.map((i) => i.id_producto), t);

        // Con los productos bloqueados, un reintento simultáneo ya ve la venta del primer intento.
        const existente = await Venta.findOne({ where: { clave_operacion }, transaction: t });
        if (existente) {
            await validarReintento(existente, req, items, t);
            return { idVenta: existente.id_venta, reintento: true };
        }

        if (!sesion) throw crearError(409, 'CAJA_CERRADA', 'Debe abrir una caja antes de vender');

        const promociones = await promocionesPorProducto(items.map((i) => i.id_producto), codigo, t);

        const lineas = items.map((item) => {
            const producto = productos.get(item.id_producto);
            if (!producto || !producto.activo) throw crearError(404, 'PRODUCTO_NO_ENCONTRADO', `El producto ${item.id_producto} no está disponible`);
            return { ...item, producto, ...calcularPrecio(producto.precio, promociones.get(item.id_producto)) };
        });

        const subtotalConPromos = redondear(lineas.reduce((s, l) => s + l.precio_unitario * l.cantidad, 0));
        const descuento = redondear(subtotalConPromos * porcentajeManual / 100);
        const total = redondear(subtotalConPromos - descuento);

        if (total_esperado !== undefined && Number(total_esperado) !== total) {
            throw crearError(409, 'TOTAL_CAMBIO', `El total cambió a $${total}. Revise el ticket`);
        }
        if (metodo === 'EFECTIVO' && !(Number(monto_recibido) >= total)) {
            throw crearError(422, 'EFECTIVO_INSUFICIENTE', 'El dinero recibido debe ser mayor o igual al total');
        }

        const venta = await Venta.create({
            estado: 'COMPLETADA', total, id_vendedor: req.user.id, id_sesion: sesion.id_sesion,
            clave_operacion, descuento, nota: nota || null
        }, { transaction: t });

        for (const linea of lineas) {
            await DetalleVenta.create({
                id_venta: venta.id_venta, id_producto: linea.id_producto, cantidad: linea.cantidad,
                precio_lista: linea.precio_lista, precio_unitario: linea.precio_unitario, id_promocion: linea.id_promocion
            }, { transaction: t });
            await registrarMovimiento(linea.producto, {
                id_usuario: req.user.id, tipo: 'VENTA_POS', cantidad: -linea.cantidad, id_venta: venta.id_venta
            }, t);
        }

        await Pago.create({
            id_venta: venta.id_venta, metodo, estado: 'APROBADO', monto: total,
            monto_recibido: metodo === 'EFECTIVO' ? monto_recibido : null,
            referencia_externa: referencia || null,
            id_usuario_confirma: req.user.id, fecha_confirmacion: new Date()
        }, { transaction: t });

        if (metodo === 'EFECTIVO' && total > 0) {
            await MovimientoCaja.create({
                id_sesion: sesion.id_sesion, id_usuario: req.user.id, tipo: 'VENTA_EFECTIVO',
                monto: total, id_venta: venta.id_venta, descripcion: `Venta #${venta.id_venta}`
            }, { transaction: t });
        }

        return { idVenta: venta.id_venta, reintento: false };
    });

    let resultado;
    try {
        resultado = await procesar();
    } catch (err) {
        if (!(err instanceof UniqueConstraintError) || !err.fields?.clave_operacion) throw err;
        const existente = await Venta.findOne({ where: { clave_operacion } });
        await validarReintento(existente, req, items);
        resultado = { idVenta: existente.id_venta, reintento: true };
    }

    return ok(res, formatearTicket(await buscarVenta(resultado.idVenta)), resultado.reintento ? 200 : 201);
};

const getSales = async (req, res) => {
    const { page, limit, offset } = paginacion(req.query, 20);
    const where = {};
    if (req.user.rol === 'vendedor') where.id_vendedor = req.user.id;
    if (req.query.sesion) where.id_sesion = req.query.sesion;
    if (req.query.estado) where.estado = req.query.estado;

    const { rows, count } = await Venta.findAndCountAll({
        where, limit, offset, order: [['id_venta', 'DESC']], distinct: true,
        include: [
            { model: Pago, as: 'pago', attributes: ['metodo', 'estado'] },
            { model: Usuario, as: 'vendedor', attributes: ['nombre', 'apellido'] },
            { model: SesionCaja, as: 'sesion', attributes: ['id_sesion'], include: [{ model: Caja, as: 'caja', attributes: ['nombre'] }] }
        ]
    });
    return lista(res, rows, page, limit, count);
};

const getTicket = async (req, res) => {
    const venta = await buscarVenta(req.params.id);
    if (!venta) throw crearError(404, 'VENTA_NO_ENCONTRADA', 'Venta no encontrada');
    if (req.user.rol === 'vendedor' && venta.id_vendedor !== req.user.id) throw crearError(403, 'ACCESO_DENEGADO', 'La venta pertenece a otro vendedor');
    return ok(res, formatearTicket(venta));
};

// Solo se anula dentro de la sesión abierta: una sesión cerrada ya tiene su arqueo hecho.
const cancelSale = async (req, res) => {
    await db.transaction(async (t) => {
        const venta = await Venta.findByPk(req.params.id, { lock: t.LOCK.UPDATE, transaction: t });
        if (!venta) throw crearError(404, 'VENTA_NO_ENCONTRADA', 'Venta no encontrada');
        if (venta.id_vendedor !== req.user.id) throw crearError(403, 'ACCESO_DENEGADO', 'La venta pertenece a otro vendedor');

        // Doble anulación: la segunda no hace nada y devuelve la venta ya anulada.
        if (venta.estado === 'ANULADA') return;

        const sesion = await SesionCaja.findByPk(venta.id_sesion, { lock: t.LOCK.UPDATE, transaction: t });
        if (sesion.estado !== 'ABIERTA') throw crearError(409, 'SESION_CERRADA', 'No se puede anular una venta de una sesión de caja cerrada');

        const detalles = await DetalleVenta.findAll({ where: { id_venta: venta.id_venta }, transaction: t });
        const productos = await bloquearProductos(detalles.map((d) => d.id_producto), t);

        for (const detalle of detalles) {
            await registrarMovimiento(productos.get(detalle.id_producto), {
                id_usuario: req.user.id, tipo: 'ANULACION_VENTA', cantidad: detalle.cantidad,
                id_venta: venta.id_venta, observacion: req.body?.motivo
            }, t);
        }

        const pago = await Pago.findOne({ where: { id_venta: venta.id_venta }, transaction: t });
        const eraEfectivo = pago.metodo === 'EFECTIVO';
        pago.estado = 'ANULADO';
        await pago.save({ transaction: t });

        if (eraEfectivo && Number(venta.total) > 0) {
            await MovimientoCaja.create({
                id_sesion: sesion.id_sesion, id_usuario: req.user.id, tipo: 'ANULACION_VENTA',
                monto: venta.total, id_venta: venta.id_venta, descripcion: `Anulación de venta #${venta.id_venta}`
            }, { transaction: t });
        }

        venta.estado = 'ANULADA';
        await venta.save({ transaction: t });
    });

    return ok(res, formatearTicket(await buscarVenta(req.params.id)));
};

// ===================== Exportaciones =====================
module.exports = { quoteSale, getPaymentInfo, createSale, getSales, getTicket, cancelSale };
