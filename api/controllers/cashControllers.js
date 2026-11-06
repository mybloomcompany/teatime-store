// ===================== Importaciones =====================
const { UniqueConstraintError } = require('sequelize');
const { db, Caja, SesionCaja, MovimientoCaja, Venta, Pago, Usuario } = require('../models');
const { ok, lista, crearError, paginacion, esUuid } = require('../utils/respuesta');
const { redondear } = require('../utils/precios');

const SIGNOS = { INGRESO: 1, VENTA_EFECTIVO: 1, EGRESO: -1, ANULACION_VENTA: -1 };

// Efectivo esperado = monto inicial + movimientos de la sesión (con su signo).
async function calcularEsperado(sesion, t) {
    const movimientos = await MovimientoCaja.findAll({ where: { id_sesion: sesion.id_sesion }, transaction: t });
    const neto = movimientos.reduce((s, m) => s + SIGNOS[m.tipo] * Number(m.monto), 0);
    return redondear(Number(sesion.monto_inicial) + neto);
}

const sesionDelVendedor = (idVendedor, t) => SesionCaja.findOne({
    where: { id_vendedor: idVendedor, estado: 'ABIERTA' },
    include: [{ model: Caja, as: 'caja' }],
    transaction: t
});

// Arqueo: resumen de dinero y ventas de una sesión.
async function resumenSesion(sesion) {
    const ventas = await Venta.findAll({
        where: { id_sesion: sesion.id_sesion },
        include: [{ model: Pago, as: 'pago' }],
        order: [['id_venta', 'DESC']]
    });
    const movimientos = await MovimientoCaja.findAll({
        where: { id_sesion: sesion.id_sesion },
        include: [{ model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido'] }],
        order: [['id_movimiento_caja', 'DESC']]
    });

    const completadas = ventas.filter((v) => v.estado === 'COMPLETADA');
    const porMetodo = { EFECTIVO: 0, TARJETA: 0, MERCADO_PAGO_QR: 0 };
    completadas.forEach((v) => { if (v.pago) porMetodo[v.pago.metodo] = redondear(porMetodo[v.pago.metodo] + Number(v.total)); });

    const sumar = (tipo) => redondear(movimientos.filter((m) => m.tipo === tipo).reduce((s, m) => s + Number(m.monto), 0));

    return {
        ...sesion.toJSON(),
        efectivo_esperado: sesion.estado === 'ABIERTA' ? await calcularEsperado(sesion) : Number(sesion.monto_esperado),
        ingresos: sumar('INGRESO'),
        egresos: sumar('EGRESO'),
        cantidad_ventas: completadas.length,
        cantidad_anuladas: ventas.length - completadas.length,
        total_ventas: redondear(completadas.reduce((s, v) => s + Number(v.total), 0)),
        ventas_por_metodo: porMetodo,
        movimientos,
        ventas
    };
}

// ===================== Cajas =====================

const getRegisters = async (req, res) => {
    const cajas = await Caja.findAll({
        where: req.user.rol === 'administrador' ? {} : { activa: true },
        include: [{
            model: SesionCaja, as: 'sesiones', where: { estado: 'ABIERTA' }, required: false,
            include: [{ model: Usuario, as: 'vendedor', attributes: ['nombre', 'apellido'] }]
        }],
        order: [['nombre', 'ASC']]
    });
    return ok(res, cajas);
};

const createRegister = async (req, res) => {
    if (!req.body.nombre?.trim()) throw crearError(400, 'DATOS_INCOMPLETOS', 'El nombre es obligatorio');
    return ok(res, await Caja.create({ nombre: req.body.nombre.trim() }), 201);
};

const updateRegister = async (req, res) => {
    const caja = await Caja.findByPk(req.params.id);
    if (!caja) throw crearError(404, 'CAJA_NO_ENCONTRADA', 'Caja no encontrada');

    if (req.body.nombre?.trim()) caja.nombre = req.body.nombre.trim();
    if (typeof req.body.activa === 'boolean') {
        if (!req.body.activa && await SesionCaja.count({ where: { id_caja: caja.id_caja, estado: 'ABIERTA' } })) {
            throw crearError(409, 'CAJA_ABIERTA', 'No se puede desactivar una caja con una sesión abierta');
        }
        caja.activa = req.body.activa;
    }
    await caja.save();
    return ok(res, caja);
};

// ===================== Sesiones =====================

const openSession = async (req, res) => {
    const monto = Number(req.body.monto_inicial);
    if (!(monto >= 0)) throw crearError(400, 'MONTO_INVALIDO', 'El monto inicial debe ser mayor o igual a cero');

    const caja = await Caja.findByPk(req.params.id);
    if (!caja || !caja.activa) throw crearError(404, 'CAJA_NO_ENCONTRADA', 'Caja no encontrada o inactiva');

    try {
        const sesion = await SesionCaja.create({ id_caja: caja.id_caja, id_vendedor: req.user.id, monto_inicial: monto });
        return ok(res, sesion, 201);
    } catch (err) {
        // Los índices únicos impiden dos sesiones abiertas para la misma caja o el mismo vendedor.
        if (err instanceof UniqueConstraintError) throw crearError(409, 'SESION_ABIERTA', 'La caja o el vendedor ya tienen una sesión abierta');
        throw err;
    }
};

const getCurrentSession = async (req, res) => {
    const sesion = await sesionDelVendedor(req.user.id);
    return ok(res, sesion ? await resumenSesion(sesion) : null);
};

const getSessions = async (req, res) => {
    const { page, limit, offset } = paginacion(req.query, 20);
    const where = {};
    if (req.user.rol === 'vendedor') where.id_vendedor = req.user.id;
    if (req.query.estado) where.estado = req.query.estado;
    if (req.query.caja) where.id_caja = req.query.caja;

    const { rows, count } = await SesionCaja.findAndCountAll({
        where, limit, offset, order: [['id_sesion', 'DESC']],
        include: [
            { model: Caja, as: 'caja', attributes: ['nombre'] },
            { model: Usuario, as: 'vendedor', attributes: ['nombre', 'apellido'] }
        ]
    });
    return lista(res, rows, page, limit, count);
};

const getSession = async (req, res) => {
    const sesion = await SesionCaja.findByPk(req.params.id, {
        include: [
            { model: Caja, as: 'caja', attributes: ['nombre'] },
            { model: Usuario, as: 'vendedor', attributes: ['nombre', 'apellido'] }
        ]
    });
    if (!sesion) throw crearError(404, 'SESION_NO_ENCONTRADA', 'Sesión no encontrada');
    if (req.user.rol === 'vendedor' && sesion.id_vendedor !== req.user.id) throw crearError(403, 'ACCESO_DENEGADO', 'La sesión pertenece a otro vendedor');
    return ok(res, await resumenSesion(sesion));
};

// Ingresos y egresos manuales de dinero. Se bloquea la sesión para no chocar con el cierre.
const addCashMovement = async (req, res) => {
    const { tipo, descripcion, clave_operacion } = req.body;
    const monto = Number(req.body.monto);

    if (!['INGRESO', 'EGRESO'].includes(tipo)) throw crearError(400, 'TIPO_INVALIDO', 'El tipo debe ser INGRESO o EGRESO');
    if (!(monto > 0)) throw crearError(400, 'MONTO_INVALIDO', 'El monto debe ser mayor a cero');
    if (!descripcion?.trim()) throw crearError(400, 'DATOS_INCOMPLETOS', 'Indique el motivo');
    if (!esUuid(clave_operacion)) throw crearError(400, 'CLAVE_INVALIDA', 'La clave de operación es obligatoria');

    const validarReintento = (m) => {
        if (m.id_usuario !== req.user.id || m.tipo !== tipo || Number(m.monto) !== monto) {
            throw crearError(409, 'CLAVE_REUTILIZADA', 'La clave de operación ya fue usada para otra solicitud');
        }
    };

    try {
        const resultado = await db.transaction(async (t) => {
            const sesion = await SesionCaja.findByPk(req.params.id, { lock: t.LOCK.UPDATE, transaction: t });
            if (!sesion) throw crearError(404, 'SESION_NO_ENCONTRADA', 'Sesión no encontrada');
            if (sesion.id_vendedor !== req.user.id) throw crearError(403, 'ACCESO_DENEGADO', 'La sesión pertenece a otro vendedor');
            if (sesion.estado !== 'ABIERTA') throw crearError(409, 'SESION_CERRADA', 'La sesión de caja está cerrada');

            const existente = await MovimientoCaja.findOne({ where: { clave_operacion }, transaction: t });
            if (existente) {
                validarReintento(existente);
                return { movimiento: existente, reintento: true };
            }

            if (tipo === 'EGRESO' && monto > await calcularEsperado(sesion, t)) {
                throw crearError(409, 'EFECTIVO_INSUFICIENTE', 'El egreso supera el efectivo disponible en caja');
            }

            const movimiento = await MovimientoCaja.create({
                id_sesion: sesion.id_sesion, id_usuario: req.user.id, tipo, monto, descripcion: descripcion.trim(), clave_operacion
            }, { transaction: t });
            return { movimiento, reintento: false };
        });
        return ok(res, resultado.movimiento, resultado.reintento ? 200 : 201);
    } catch (err) {
        if (!(err instanceof UniqueConstraintError)) throw err;
        const existente = await MovimientoCaja.findOne({ where: { clave_operacion } });
        validarReintento(existente);
        return ok(res, existente);
    }
};

// Cierre y arqueo: compara el efectivo esperado con el declarado.
const closeSession = async (req, res) => {
    const declarado = Number(req.body.monto_declarado);
    if (!(declarado >= 0)) throw crearError(400, 'MONTO_INVALIDO', 'Indique el efectivo contado');

    const sesion = await db.transaction(async (t) => {
        const actual = await SesionCaja.findByPk(req.params.id, { lock: t.LOCK.UPDATE, transaction: t });
        if (!actual) throw crearError(404, 'SESION_NO_ENCONTRADA', 'Sesión no encontrada');
        if (actual.id_vendedor !== req.user.id) throw crearError(403, 'ACCESO_DENEGADO', 'La sesión pertenece a otro vendedor');
        if (actual.estado !== 'ABIERTA') return actual; // reintento de un cierre ya hecho

        const esperado = await calcularEsperado(actual, t);
        await actual.update({
            estado: 'CERRADA',
            fecha_cierre: new Date(),
            monto_esperado: esperado,
            monto_declarado: declarado,
            diferencia: redondear(declarado - esperado),
            observacion: req.body.observacion || null
        }, { transaction: t });
        return actual;
    });

    return ok(res, await resumenSesion(sesion));
};

// ===================== Exportaciones =====================
module.exports = {
    getRegisters, createRegister, updateRegister,
    openSession, getCurrentSession, getSessions, getSession, addCashMovement, closeSession
};
