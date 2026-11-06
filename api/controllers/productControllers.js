// ===================== Importaciones =====================
const { Op, literal } = require('sequelize');
const { db, Producto, Categoria, Sabor, ProductoSabor } = require('../models');
const { ok, lista, crearError, paginacion } = require('../utils/respuesta');
const { agregarPrecios, hoy } = require('../utils/precios');
const { registrarMovimiento } = require('../utils/stock');

const inclusiones = [
    { model: Categoria, as: 'categoria', attributes: ['id_categoria', 'nombre'] },
    { model: Sabor, as: 'sabores', attributes: ['id_sabor', 'nombre'], through: { attributes: [] } }
];

const ORDENES = {
    precio_asc: [['precio', 'ASC']],
    precio_desc: [['precio', 'DESC']],
    nombre: [['nombre', 'ASC']],
    nuevos: [['id_producto', 'DESC']]
};

const validarDatos = ({ nombre, sku, precio, id_categoria }) => {
    if (!nombre?.trim()) throw crearError(400, 'DATOS_INCOMPLETOS', 'El nombre es obligatorio');
    if (!sku?.trim()) throw crearError(400, 'DATOS_INCOMPLETOS', 'El SKU es obligatorio');
    if (!(Number(precio) > 0)) throw crearError(400, 'PRECIO_INVALIDO', 'El precio debe ser numérico y mayor a cero');
    if (!id_categoria) throw crearError(400, 'DATOS_INCOMPLETOS', 'La categoría es obligatoria');
};

const camposEditables = (b) => ({
    nombre: b.nombre?.trim(),
    descripcion: b.descripcion || null,
    precio: b.precio,
    id_categoria: b.id_categoria,
    sku: b.sku?.trim().toUpperCase(),
    marca: b.marca || null,
    imagen: b.imagen || null,
    presentacion: b.presentacion || null,
    peso: b.peso || null,
    stock_minimo: Number(b.stock_minimo) || 0
});

async function guardarSabores(idProducto, sabores, t) {
    await ProductoSabor.destroy({ where: { id_producto: idProducto }, transaction: t });
    if (sabores?.length) {
        await ProductoSabor.bulkCreate(sabores.map((id_sabor) => ({ id_producto: idProducto, id_sabor })), { transaction: t });
    }
}

// ===================== Controladores =====================

// Clientes y visitantes solo ven productos activos. El administrador y el vendedor pueden ver todos.
const getProducts = async (req, res) => {
    const { page, limit, offset } = paginacion(req.query);
    const { search, category, flavor, brand, minPrice, maxPrice, status, sort, promo, estado_stock } = req.query;
    const where = {};
    const condiciones = [];

    const gestion = req.user && ['administrador', 'vendedor'].includes(req.user.rol);
    if (!gestion || !status) where.activo = true;
    if (gestion && status === 'inactivo') where.activo = false;
    if (gestion && status === 'todos') delete where.activo;

    if (search) {
        const q = { [Op.iLike]: `%${search}%` };
        const qEscapado = db.escape(`%${search}%`);
        condiciones.push({
            [Op.or]: [
                { nombre: q }, { descripcion: q }, { sku: q }, { marca: q },
                { id_categoria: { [Op.in]: literal(`(SELECT id_categoria FROM categoria WHERE nombre ILIKE ${qEscapado})`) } },
                { id_producto: { [Op.in]: literal(`(SELECT ps.id_producto FROM producto_sabor ps JOIN sabor s ON s.id_sabor = ps.id_sabor WHERE s.nombre ILIKE ${qEscapado})`) } }
            ]
        });
    }
    if (category) where.id_categoria = category;
    if (brand) where.marca = brand;
    if (flavor) {
        condiciones.push({ id_producto: { [Op.in]: literal(`(SELECT id_producto FROM producto_sabor WHERE id_sabor = ${Number(flavor) || 0})`) } });
    }
    if (minPrice || maxPrice) {
        where.precio = {};
        if (minPrice) where.precio[Op.gte] = minPrice;
        if (maxPrice) where.precio[Op.lte] = maxPrice;
    }
    if (promo === '1') {
        condiciones.push({
            id_producto: {
                [Op.in]: literal(`(SELECT pp.id_producto FROM producto_promocion pp JOIN promocion p ON p.id_promocion = pp.id_promocion
                    WHERE p.codigo IS NULL AND p.fecha_inicio <= ${db.escape(hoy())} AND p.fecha_fin >= ${db.escape(hoy())})`)
            }
        });
    }
    if (estado_stock === 'agotado') where.stock = 0;
    if (estado_stock === 'bajo') condiciones.push(literal('stock > 0 AND stock <= stock_minimo'));

    if (condiciones.length) where[Op.and] = condiciones;

    const { rows, count } = await Producto.findAndCountAll({
        where, include: inclusiones, limit, offset, distinct: true,
        order: ORDENES[sort] || [['id_producto', 'ASC']]
    });

    return lista(res, await agregarPrecios(rows), page, limit, count);
};

const getBrands = async (req, res) => {
    const marcas = await Producto.findAll({
        attributes: [[db.fn('DISTINCT', db.col('marca')), 'marca']],
        where: { marca: { [Op.ne]: null }, activo: true },
        order: [['marca', 'ASC']],
        raw: true
    });
    return ok(res, marcas.map((m) => m.marca));
};

const getProduct = async (req, res) => {
    const producto = await Producto.findByPk(req.params.id, { include: inclusiones });
    const gestion = req.user && ['administrador', 'vendedor'].includes(req.user.rol);
    if (!producto || (!producto.activo && !gestion)) throw crearError(404, 'PRODUCTO_NO_ENCONTRADO', 'Producto no encontrado');

    const [conPrecio] = await agregarPrecios([producto]);
    return ok(res, conPrecio);
};

// El stock inicial no se escribe directo: entra como movimiento, igual que cualquier otro cambio.
const createProduct = async (req, res) => {
    validarDatos(req.body);
    const stockInicial = Number(req.body.stock_inicial) || 0;
    if (stockInicial < 0 || !Number.isInteger(stockInicial)) throw crearError(400, 'STOCK_INVALIDO', 'El stock inicial debe ser un entero mayor o igual a cero');
    if (!(await Categoria.findByPk(req.body.id_categoria))) throw crearError(400, 'CATEGORIA_INEXISTENTE', 'La categoría no existe');

    const creado = await db.transaction(async (t) => {
        const producto = await Producto.create({ ...camposEditables(req.body), stock: 0 }, { transaction: t });
        await guardarSabores(producto.id_producto, req.body.sabores, t);
        if (stockInicial > 0) {
            await registrarMovimiento(producto, {
                id_usuario: req.user.id, tipo: 'STOCK_INICIAL', cantidad: stockInicial, observacion: 'Stock inicial'
            }, t);
        }
        return producto;
    });

    const producto = await Producto.findByPk(creado.id_producto, { include: inclusiones });
    const [conPrecio] = await agregarPrecios([producto]);
    return ok(res, conPrecio, 201);
};

// Editar un producto nunca cambia su stock.
const updateProduct = async (req, res) => {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) throw crearError(404, 'PRODUCTO_NO_ENCONTRADO', 'Producto no encontrado');

    const datos = { ...producto.toJSON(), ...req.body };
    validarDatos(datos);

    await db.transaction(async (t) => {
        await producto.update({
            ...camposEditables(datos),
            activo: typeof req.body.activo === 'boolean' ? req.body.activo : producto.activo
        }, { transaction: t });
        if (req.body.sabores) await guardarSabores(producto.id_producto, req.body.sabores, t);
    });

    const actualizado = await Producto.findByPk(producto.id_producto, { include: inclusiones });
    const [conPrecio] = await agregarPrecios([actualizado]);
    return ok(res, conPrecio);
};

// Baja lógica: conserva compras, ventas y movimientos históricos.
const deleteProduct = async (req, res) => {
    const producto = await Producto.findByPk(req.params.id);
    if (!producto) throw crearError(404, 'PRODUCTO_NO_ENCONTRADO', 'Producto no encontrado');
    producto.activo = false;
    await producto.save();
    return ok(res, { desactivado: true });
};

// ===================== Exportaciones =====================
module.exports = { getProducts, getBrands, getProduct, createProduct, updateProduct, deleteProduct };
