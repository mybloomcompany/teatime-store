// ===================== Importaciones =====================
const { Op } = require('sequelize');
const { db, Promocion, ProductoPromocion, Producto, DetalleCompra, DetalleVenta } = require('../models');
const { ok, crearError } = require('../utils/respuesta');
const { hoy, promocionesPorProducto } = require('../utils/precios');

const estadoDe = (p) => {
    const fecha = hoy();
    if (p.fecha_inicio > fecha) return 'PROGRAMADA';
    if (p.fecha_fin < fecha) return 'FINALIZADA';
    return 'ACTIVA';
};

const formatear = (p) => ({
    ...p.toJSON(),
    porcentaje_descuento: Number(p.porcentaje_descuento),
    tipo: p.codigo ? 'CODIGO' : 'AUTOMATICA',
    estado: estadoDe(p)
});

const validar = ({ nombre, porcentaje_descuento, fecha_inicio, fecha_fin }) => {
    if (!nombre?.trim()) throw crearError(400, 'DATOS_INCOMPLETOS', 'El nombre es obligatorio');
    const pct = Number(porcentaje_descuento);
    if (!(pct > 0 && pct <= 100)) throw crearError(400, 'PORCENTAJE_INVALIDO', 'El porcentaje debe ser mayor a 0 y hasta 100');
    if (!fecha_inicio || !fecha_fin) throw crearError(400, 'DATOS_INCOMPLETOS', 'Las fechas son obligatorias');
    if (fecha_fin < fecha_inicio) throw crearError(400, 'FECHAS_INVALIDAS', 'La fecha de fin no puede ser anterior a la de inicio');
};

// "Aplica a" categorías se traduce en productos concretos al guardar.
async function productosAlcanzados({ productos = [], categorias = [] }, t) {
    const ids = new Set(productos.map(Number));
    if (categorias.length) {
        const deCategoria = await Producto.findAll({ attributes: ['id_producto'], where: { id_categoria: categorias }, transaction: t });
        deCategoria.forEach((p) => ids.add(p.id_producto));
    }
    return [...ids];
}

// Reemplaza los productos, conservando los que ya tienen ventas o compras con esta promoción.
async function guardarProductos(idPromocion, ids, t) {
    const usadosCompra = await DetalleCompra.findAll({ attributes: ['id_producto'], where: { id_promocion: idPromocion }, transaction: t });
    const usadosVenta = await DetalleVenta.findAll({ attributes: ['id_producto'], where: { id_promocion: idPromocion }, transaction: t });
    const usados = [...usadosCompra, ...usadosVenta].map((d) => d.id_producto);
    const finales = [...new Set([...ids, ...usados])];

    await ProductoPromocion.destroy({
        where: { id_promocion: idPromocion, id_producto: { [Op.notIn]: finales.length ? finales : [0] } },
        transaction: t
    });
    await ProductoPromocion.bulkCreate(
        finales.map((id_producto) => ({ id_producto, id_promocion: idPromocion })),
        { transaction: t, ignoreDuplicates: true }
    );
}

const normalizarCodigo = (codigo) => (codigo?.trim() ? codigo.trim().toUpperCase() : null);

// ===================== Controladores =====================

// El público ve las vigentes. El administrador ve todas, con sus productos.
const getPromotions = async (req, res) => {
    const gestion = req.user?.rol === 'administrador';
    const where = gestion ? {} : { fecha_inicio: { [Op.lte]: hoy() }, fecha_fin: { [Op.gte]: hoy() } };

    const promociones = await Promocion.findAll({
        where,
        include: [{ model: Producto, as: 'productos', attributes: ['id_producto', 'nombre', 'imagen'], through: { attributes: [] } }],
        order: [['fecha_fin', 'DESC']]
    });

    let resultado = promociones.map(formatear);
    if (gestion && req.query.estado) resultado = resultado.filter((p) => p.estado === req.query.estado);
    return ok(res, resultado);
};

const getPromotion = async (req, res) => {
    const promocion = await Promocion.findByPk(req.params.id, {
        include: [{ model: Producto, as: 'productos', attributes: ['id_producto', 'nombre'], through: { attributes: [] } }]
    });
    if (!promocion) throw crearError(404, 'PROMOCION_NO_ENCONTRADA', 'Promoción no encontrada');
    return ok(res, formatear(promocion));
};

const createPromotion = async (req, res) => {
    validar(req.body);

    const creada = await db.transaction(async (t) => {
        const promocion = await Promocion.create({
            nombre: req.body.nombre.trim(),
            descripcion: req.body.descripcion || null,
            porcentaje_descuento: req.body.porcentaje_descuento,
            fecha_inicio: req.body.fecha_inicio,
            fecha_fin: req.body.fecha_fin,
            codigo: normalizarCodigo(req.body.codigo)
        }, { transaction: t });

        const ids = await productosAlcanzados(req.body, t);
        if (!ids.length) throw crearError(400, 'SIN_PRODUCTOS', 'Seleccione al menos un producto o categoría');
        await guardarProductos(promocion.id_promocion, ids, t);
        return promocion;
    });

    return ok(res, formatear(creada), 201);
};

const updatePromotion = async (req, res) => {
    const promocion = await Promocion.findByPk(req.params.id);
    if (!promocion) throw crearError(404, 'PROMOCION_NO_ENCONTRADA', 'Promoción no encontrada');

    const datos = { ...promocion.toJSON(), ...req.body };
    validar(datos);

    await db.transaction(async (t) => {
        await promocion.update({
            nombre: datos.nombre.trim(),
            descripcion: datos.descripcion || null,
            porcentaje_descuento: datos.porcentaje_descuento,
            fecha_inicio: datos.fecha_inicio,
            fecha_fin: datos.fecha_fin,
            codigo: normalizarCodigo(datos.codigo)
        }, { transaction: t });

        if (req.body.productos || req.body.categorias) {
            const ids = await productosAlcanzados(req.body, t);
            if (!ids.length) throw crearError(400, 'SIN_PRODUCTOS', 'Seleccione al menos un producto o categoría');
            await guardarProductos(promocion.id_promocion, ids, t);
        }
    });

    return ok(res, formatear(promocion));
};

// Una promoción ya usada no se borra: el historial la referencia. Se cierra cambiando su fecha de fin.
const deletePromotion = async (req, res) => {
    const promocion = await Promocion.findByPk(req.params.id);
    if (!promocion) throw crearError(404, 'PROMOCION_NO_ENCONTRADA', 'Promoción no encontrada');

    const usos = await DetalleCompra.count({ where: { id_promocion: promocion.id_promocion } })
        + await DetalleVenta.count({ where: { id_promocion: promocion.id_promocion } });
    if (usos) throw crearError(409, 'PROMOCION_USADA', 'La promoción ya fue usada. Para cerrarla, cambie su fecha de fin');

    await db.transaction(async (t) => {
        await ProductoPromocion.destroy({ where: { id_promocion: promocion.id_promocion }, transaction: t });
        await promocion.destroy({ transaction: t });
    });
    return ok(res, { eliminado: true });
};

const validatePromotion = async (req, res) => {
    const { codigo, productos } = req.body;
    if (!codigo || !productos?.length) throw crearError(400, 'DATOS_INCOMPLETOS', 'Indique el código y los productos');
    await promocionesPorProducto(productos.map(Number), codigo);
    return ok(res, { valido: true });
};

// ===================== Exportaciones =====================
module.exports = { getPromotions, getPromotion, createPromotion, updatePromotion, deletePromotion, validatePromotion };
