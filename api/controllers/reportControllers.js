// ===================== Importaciones =====================
const { db, Reporte } = require('../models');
const { ok, lista, paginacion } = require('../utils/respuesta');

const ZONA = `'America/Argentina/Buenos_Aires'`;

// Operaciones que cuentan como venta real: pagos confirmados y no anuladas.
const OPERACIONES = `
    SELECT 'ONLINE' AS canal, c.id_compra AS id, c.fecha, c.total, c.estado, 'MERCADO_PAGO_QR' AS metodo,
           u.nombre || ' ' || u.apellido AS persona
    FROM compra c JOIN usuario u ON u.id_usuario = c.id_cliente
    WHERE c.estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO')
    UNION ALL
    SELECT 'POS', v.id_venta, v.fecha, v.total, v.estado, p.metodo, u.nombre || ' ' || u.apellido
    FROM venta v JOIN usuario u ON u.id_usuario = v.id_vendedor JOIN pago p ON p.id_venta = v.id_venta
    WHERE v.estado = 'COMPLETADA'`;

const DETALLES = `
    SELECT d.id_producto, d.cantidad, d.precio_unitario, c.fecha
    FROM detalle_compra d JOIN compra c ON c.id_compra = d.id_compra
    WHERE c.estado NOT IN ('PENDIENTE_PAGO', 'CANCELADO')
    UNION ALL
    SELECT d.id_producto, d.cantidad, d.precio_unitario, v.fecha
    FROM detalle_venta d JOIN venta v ON v.id_venta = d.id_venta
    WHERE v.estado = 'COMPLETADA'`;

const rango = (query) => ({ desde: query.from || null, hasta: query.to || null });
const FILTRO_FECHA = `(CAST(:desde AS date) IS NULL OR (fecha AT TIME ZONE ${ZONA})::date >= CAST(:desde AS date))
    AND (CAST(:hasta AS date) IS NULL OR (fecha AT TIME ZONE ${ZONA})::date <= CAST(:hasta AS date))`;

const registrar = (req, tipo) => Reporte.create({ tipo, id_administrador: req.user.id });

// ===================== Ventas de ambos canales =====================

// Incluye todos los estados, para que Administración consulte el historial completo.
const getAllSales = async (req, res) => {
    const { page, limit, offset } = paginacion(req.query, 20);
    const { channel, metodo, estado } = req.query;
    const replacements = { ...rango(req.query), channel: channel || null, metodo: metodo || null, estado: estado || null, limit, offset };

    const base = `
        SELECT * FROM (
            SELECT 'ONLINE' AS canal, c.id_compra AS id, c.fecha, c.total, c.estado, pg.metodo, pg.estado AS estado_pago,
                   u.nombre || ' ' || u.apellido AS persona
            FROM compra c JOIN usuario u ON u.id_usuario = c.id_cliente JOIN pago pg ON pg.id_compra = c.id_compra
            UNION ALL
            SELECT 'POS', v.id_venta, v.fecha, v.total, v.estado, pg.metodo, pg.estado,
                   u.nombre || ' ' || u.apellido
            FROM venta v JOIN usuario u ON u.id_usuario = v.id_vendedor JOIN pago pg ON pg.id_venta = v.id_venta
        ) o
        WHERE ${FILTRO_FECHA}
          AND (CAST(:channel AS text) IS NULL OR canal = :channel)
          AND (CAST(:metodo AS text) IS NULL OR metodo = :metodo)
          AND (CAST(:estado AS text) IS NULL OR estado = :estado)`;

    const [filas] = await db.query(`${base} ORDER BY fecha DESC LIMIT :limit OFFSET :offset`, { replacements });
    const [[{ total }]] = await db.query(`SELECT COUNT(*)::int AS total FROM (${base}) x`, { replacements });
    return lista(res, filas, page, limit, total);
};

// ===================== Reportes =====================

const getSalesReport = async (req, res) => {
    const replacements = rango(req.query);
    const [[totales]] = await db.query(`
        SELECT COALESCE(SUM(total), 0)::numeric AS ingresos, COUNT(*)::int AS operaciones
        FROM (${OPERACIONES}) o WHERE ${FILTRO_FECHA}`, { replacements });
    const [porDia] = await db.query(`
        SELECT (fecha AT TIME ZONE ${ZONA})::date AS dia, SUM(total)::numeric AS total, COUNT(*)::int AS operaciones
        FROM (${OPERACIONES}) o WHERE ${FILTRO_FECHA} GROUP BY dia ORDER BY dia`, { replacements });
    const [porCanal] = await db.query(`
        SELECT canal, SUM(total)::numeric AS total, COUNT(*)::int AS operaciones
        FROM (${OPERACIONES}) o WHERE ${FILTRO_FECHA} GROUP BY canal ORDER BY total DESC`, { replacements });
    const [porMetodo] = await db.query(`
        SELECT metodo, SUM(total)::numeric AS total, COUNT(*)::int AS operaciones
        FROM (${OPERACIONES}) o WHERE ${FILTRO_FECHA} GROUP BY metodo ORDER BY total DESC`, { replacements });
    const [porCategoria] = await db.query(`
        SELECT cat.nombre AS categoria, SUM(d.cantidad * d.precio_unitario)::numeric AS total, SUM(d.cantidad)::int AS unidades
        FROM (${DETALLES}) d JOIN producto p ON p.id_producto = d.id_producto JOIN categoria cat ON cat.id_categoria = p.id_categoria
        WHERE ${FILTRO_FECHA} GROUP BY cat.nombre ORDER BY total DESC`, { replacements });

    await registrar(req, 'VENTAS');
    return ok(res, { ...totales, por_dia: porDia, por_canal: porCanal, por_metodo: porMetodo, por_categoria: porCategoria });
};

const getBestSellers = async (req, res) => {
    const [filas] = await db.query(`
        SELECT p.id_producto, p.nombre, p.sku, SUM(d.cantidad)::int AS unidades, SUM(d.cantidad * d.precio_unitario)::numeric AS total
        FROM (${DETALLES}) d JOIN producto p ON p.id_producto = d.id_producto
        WHERE ${FILTRO_FECHA} GROUP BY p.id_producto ORDER BY unidades DESC LIMIT 10`, { replacements: rango(req.query) });

    await registrar(req, 'PRODUCTOS_MAS_VENDIDOS');
    return ok(res, filas);
};

const getStockReport = async (req, res) => {
    const [filas] = await db.query(`
        SELECT p.id_producto, p.nombre, p.sku, p.stock, p.stock_minimo, c.nombre AS categoria, p.stock * p.precio AS valorizado
        FROM producto p JOIN categoria c ON c.id_categoria = p.id_categoria
        WHERE p.activo = TRUE ORDER BY p.stock ASC, p.nombre ASC`);

    await registrar(req, 'STOCK');
    return ok(res, filas);
};

const getCashReport = async (req, res) => {
    const [filas] = await db.query(`
        SELECT s.id_sesion, c.nombre AS caja, u.nombre || ' ' || u.apellido AS vendedor, s.estado, s.fecha_apertura AS fecha,
               s.fecha_cierre, s.monto_inicial, s.monto_esperado, s.monto_declarado, s.diferencia
        FROM sesion_caja s JOIN caja c ON c.id_caja = s.id_caja JOIN usuario u ON u.id_usuario = s.id_vendedor
        WHERE (CAST(:desde AS date) IS NULL OR (s.fecha_apertura AT TIME ZONE ${ZONA})::date >= CAST(:desde AS date))
          AND (CAST(:hasta AS date) IS NULL OR (s.fecha_apertura AT TIME ZONE ${ZONA})::date <= CAST(:hasta AS date))
        ORDER BY s.id_sesion DESC`, { replacements: rango(req.query) });

    await registrar(req, 'CAJA');
    return ok(res, filas);
};

// Control de consistencia: todas las filas devueltas deberían ser 0.
const getAudit = async (req, res) => {
    const [[resultado]] = await db.query(`
        SELECT
          (SELECT COUNT(*)::int FROM producto p WHERE p.stock <> COALESCE((SELECT SUM(m.cantidad) FROM movimiento_stock m WHERE m.id_producto = p.id_producto), 0)) AS stock_distinto_de_movimientos,
          (SELECT COUNT(*)::int FROM detalle_venta d WHERE NOT EXISTS (SELECT 1 FROM movimiento_stock m WHERE m.id_venta = d.id_venta AND m.id_producto = d.id_producto AND m.tipo = 'VENTA_POS' AND m.cantidad = -d.cantidad)) AS ventas_sin_movimiento,
          (SELECT COUNT(*)::int FROM detalle_compra d WHERE NOT EXISTS (SELECT 1 FROM movimiento_stock m WHERE m.id_compra = d.id_compra AND m.id_producto = d.id_producto AND m.tipo = 'COMPRA_ONLINE' AND m.cantidad = -d.cantidad)) AS compras_sin_movimiento,
          (SELECT COUNT(*)::int FROM detalle_venta d JOIN venta v ON v.id_venta = d.id_venta WHERE v.estado = 'ANULADA' AND NOT EXISTS (SELECT 1 FROM movimiento_stock m WHERE m.id_venta = d.id_venta AND m.id_producto = d.id_producto AND m.tipo = 'ANULACION_VENTA' AND m.cantidad = d.cantidad)) AS ventas_anuladas_sin_reversa,
          (SELECT COUNT(*)::int FROM detalle_compra d JOIN compra c ON c.id_compra = d.id_compra WHERE c.estado = 'CANCELADO' AND NOT EXISTS (SELECT 1 FROM movimiento_stock m WHERE m.id_compra = d.id_compra AND m.id_producto = d.id_producto AND m.tipo = 'ANULACION_COMPRA' AND m.cantidad = d.cantidad)) AS compras_canceladas_sin_reversa,
          (SELECT COUNT(*)::int FROM venta v WHERE v.total + v.descuento <> (SELECT SUM(d.cantidad * d.precio_unitario) FROM detalle_venta d WHERE d.id_venta = v.id_venta)) AS ventas_con_total_distinto,
          (SELECT COUNT(*)::int FROM compra c WHERE c.total <> (SELECT SUM(d.cantidad * d.precio_unitario) FROM detalle_compra d WHERE d.id_compra = c.id_compra)) AS compras_con_total_distinto,
          (SELECT COUNT(*)::int FROM usuario u WHERE (SELECT COUNT(*) FROM administrador a WHERE a.id_usuario = u.id_usuario) + (SELECT COUNT(*) FROM vendedor x WHERE x.id_usuario = u.id_usuario) + (SELECT COUNT(*) FROM cliente c WHERE c.id_usuario = u.id_usuario) <> 1) AS usuarios_sin_rol_unico
    `);
    return ok(res, resultado);
};

// ===================== Dashboard =====================

const getDashboard = async (req, res) => {
    const inicioMes = `date_trunc('month', now() AT TIME ZONE ${ZONA})`;

    const [[mes]] = await db.query(`
        SELECT COALESCE(SUM(total) FILTER (WHERE (fecha AT TIME ZONE ${ZONA}) >= ${inicioMes}), 0)::numeric AS ventas_mes,
               COALESCE(SUM(total) FILTER (WHERE (fecha AT TIME ZONE ${ZONA}) >= ${inicioMes} - interval '1 month' AND (fecha AT TIME ZONE ${ZONA}) < ${inicioMes}), 0)::numeric AS ventas_mes_anterior
        FROM (${OPERACIONES}) o`);
    const [[contadores]] = await db.query(`
        SELECT (SELECT COUNT(*)::int FROM compra WHERE estado IN ('PENDIENTE_PAGO', 'CONFIRMADO', 'EN_PREPARACION')) AS pedidos_pendientes,
               (SELECT COUNT(*)::int FROM compra WHERE (fecha AT TIME ZONE ${ZONA}) >= ${inicioMes}) AS pedidos_mes,
               (SELECT COUNT(*)::int FROM producto WHERE activo = TRUE) AS productos_activos,
               (SELECT COUNT(*)::int FROM producto WHERE activo = TRUE AND stock <= stock_minimo) AS stock_critico,
               (SELECT COUNT(*)::int FROM cliente) AS clientes`);
    const [porMes] = await db.query(`
        SELECT to_char(date_trunc('month', fecha AT TIME ZONE ${ZONA}), 'YYYY-MM') AS mes, SUM(total)::numeric AS total
        FROM (${OPERACIONES}) o
        WHERE (fecha AT TIME ZONE ${ZONA}) >= ${inicioMes} - interval '11 months'
        GROUP BY mes ORDER BY mes`);
    const [porCanal] = await db.query(`SELECT canal, SUM(total)::numeric AS total FROM (${OPERACIONES}) o WHERE (fecha AT TIME ZONE ${ZONA}) >= ${inicioMes} GROUP BY canal`);
    const [pedidos] = await db.query(`
        SELECT c.id_compra, c.fecha, c.total, c.estado, u.nombre || ' ' || u.apellido AS cliente
        FROM compra c JOIN usuario u ON u.id_usuario = c.id_cliente ORDER BY c.id_compra DESC LIMIT 5`);
    const [stockBajo] = await db.query(`
        SELECT id_producto, nombre, stock, stock_minimo FROM producto
        WHERE activo = TRUE AND stock <= stock_minimo ORDER BY stock ASC LIMIT 5`);

    return ok(res, { ...mes, ...contadores, ventas_por_mes: porMes, ventas_por_canal: porCanal, pedidos_recientes: pedidos, stock_bajo: stockBajo });
};

// ===================== Exportaciones =====================
module.exports = { getAllSales, getSalesReport, getBestSellers, getStockReport, getCashReport, getAudit, getDashboard };
