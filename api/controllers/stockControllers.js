// ===================== Importaciones =====================
const { Op, UniqueConstraintError } = require('sequelize');
const { db, Producto, Categoria, MovimientoStock, Usuario } = require('../models');
const { ok, lista, crearError, paginacion, esUuid } = require('../utils/respuesta');
const { bloquearProductos, registrarMovimiento } = require('../utils/stock');

// Signo de cada movimiento manual. El ajuste recibe el stock contado y calcula la diferencia.
const SIGNOS = { INGRESO: 1, EGRESO: -1, PERDIDA: -1, DANADO: -1 };

const estadoStock = (p) => (p.stock === 0 ? 'AGOTADO' : p.stock <= p.stock_minimo ? 'BAJO' : 'DISPONIBLE');
const inicioDeMes = () => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; };

// ===================== Consultas =====================

const getStock = async (req, res) => {
    const { page, limit, offset } = paginacion(req.query, 20);
    const where = { activo: true };

    if (req.query.search) {
        const q = { [Op.iLike]: `%${req.query.search}%` };
        where[Op.or] = [{ nombre: q }, { sku: q }];
    }
    if (req.query.estado === 'agotado') where.stock = 0;
    if (req.query.estado === 'bajo') {
        where.stock = { [Op.gt]: 0 };
        where[Op.and] = db.literal('"Producto"."stock" <= "Producto"."stock_minimo"');
    }

    const { rows, count } = await Producto.findAndCountAll({
        where, limit, offset, order: [['stock', 'ASC'], ['nombre', 'ASC']],
        include: [{ model: Categoria, as: 'categoria', attributes: ['nombre'] }]
    });

    const movimientos = await MovimientoStock.findAll({
        attributes: ['id_producto',
            [db.literal('COALESCE(SUM(cantidad) FILTER (WHERE cantidad > 0), 0)'), 'entradas'],
            [db.literal('COALESCE(SUM(-cantidad) FILTER (WHERE cantidad < 0), 0)'), 'salidas']],
        where: { id_producto: rows.map((p) => p.id_producto), fecha: { [Op.gte]: inicioDeMes() } },
        group: ['id_producto'],
        raw: true
    });
    const porProducto = new Map(movimientos.map((m) => [m.id_producto, m]));

    const data = rows.map((p) => ({
        id_producto: p.id_producto,
        nombre: p.nombre,
        sku: p.sku,
        imagen: p.imagen,
        categoria: p.categoria?.nombre,
        stock: p.stock,
        stock_minimo: p.stock_minimo,
        estado: estadoStock(p),
        entradas_mes: Number(porProducto.get(p.id_producto)?.entradas || 0),
        salidas_mes: Number(porProducto.get(p.id_producto)?.salidas || 0)
    }));

    return lista(res, data, page, limit, count);
};

// Tarjetas de la pantalla de stock.
const getStockSummary = async (req, res) => {
    const [[resumen]] = await db.query(`
        SELECT COALESCE(SUM(stock), 0)::int AS existencias,
               COUNT(*) FILTER (WHERE stock <= stock_minimo)::int AS criticos,
               COUNT(*) FILTER (WHERE stock = 0)::int AS agotados
        FROM producto WHERE activo = TRUE`);
    const [[mes]] = await db.query(`
        SELECT COALESCE(SUM(cantidad) FILTER (WHERE cantidad > 0), 0)::int AS entradas,
               COALESCE(SUM(-cantidad) FILTER (WHERE cantidad < 0), 0)::int AS salidas
        FROM movimiento_stock WHERE fecha >= :desde`, { replacements: { desde: inicioDeMes() } });
    return ok(res, { ...resumen, ...mes });
};

const getMovements = async (req, res) => {
    const { page, limit, offset } = paginacion(req.query, 20);
    const where = {};
    if (req.query.producto) where.id_producto = req.query.producto;
    if (req.query.tipo) where.tipo = req.query.tipo;

    const { rows, count } = await MovimientoStock.findAndCountAll({
        where, limit, offset, order: [['id_movimiento', 'DESC']],
        include: [
            { model: Producto, as: 'producto', attributes: ['nombre', 'sku'] },
            { model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido'] }
        ]
    });
    return lista(res, rows, page, limit, count);
};

// ===================== Movimientos manuales =====================

function validarReintento(existente, req, idProducto, tipo) {
    if (existente.id_usuario !== req.user.id || existente.id_producto !== idProducto || existente.tipo !== tipo) {
        throw crearError(409, 'CLAVE_REUTILIZADA', 'La clave de operación ya fue usada para otra solicitud');
    }
}

const registrarManual = (tipo) => async (req, res) => {
    const { id_producto, cantidad, observacion, clave_operacion } = req.body;
    const idProducto = Number(id_producto);
    const valor = Number(cantidad);

    if (!esUuid(clave_operacion)) throw crearError(400, 'CLAVE_INVALIDA', 'La clave de operación es obligatoria');
    if (!idProducto) throw crearError(400, 'DATOS_INCOMPLETOS', 'Indique el producto');
    if (tipo !== 'INGRESO' && !observacion?.trim()) throw crearError(400, 'DATOS_INCOMPLETOS', 'Indique el motivo del movimiento');
    if (!Number.isInteger(valor) || (tipo === 'AJUSTE' ? valor < 0 : valor <= 0)) {
        throw crearError(400, 'CANTIDAD_INVALIDA', tipo === 'AJUSTE' ? 'Indique el stock contado' : 'La cantidad debe ser un entero mayor a cero');
    }

    const procesar = async () => db.transaction(async (t) => {
        const productos = await bloquearProductos([idProducto], t);
        const producto = productos.get(idProducto);
        if (!producto) throw crearError(404, 'PRODUCTO_NO_ENCONTRADO', 'Producto no encontrado');

        // La clave se busca con el producto bloqueado: un reintento simultáneo espera al primero.
        const existente = await MovimientoStock.findOne({ where: { clave_operacion }, transaction: t });
        if (existente) {
            validarReintento(existente, req, idProducto, tipo);
            return { movimiento: existente, reintento: true };
        }

        const delta = tipo === 'AJUSTE' ? valor - producto.stock : SIGNOS[tipo] * valor;
        if (delta === 0) throw crearError(409, 'SIN_DIFERENCIA', 'El stock contado es igual al actual');

        const movimiento = await registrarMovimiento(producto, {
            id_usuario: req.user.id, tipo, cantidad: delta, observacion: observacion?.trim(), clave_operacion
        }, t);
        return { movimiento, reintento: false };
    });

    let resultado;
    try {
        resultado = await procesar();
    } catch (err) {
        if (!(err instanceof UniqueConstraintError)) throw err;
        const existente = await MovimientoStock.findOne({ where: { clave_operacion } });
        validarReintento(existente, req, idProducto, tipo);
        resultado = { movimiento: existente, reintento: true };
    }

    return ok(res, resultado.movimiento, resultado.reintento ? 200 : 201);
};

// ===================== Exportaciones =====================
module.exports = {
    getStock, getStockSummary, getMovements,
    registerEntry: registrarManual('INGRESO'),
    registerExit: registrarManual('EGRESO'),
    registerAdjustment: registrarManual('AJUSTE'),
    registerLoss: registrarManual('PERDIDA'),
    registerDamaged: registrarManual('DANADO')
};
