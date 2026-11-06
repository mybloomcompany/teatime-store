// ===================== Importaciones =====================
const { Categoria, Sabor, Producto, ProductoSabor } = require('../models');
const { ok, crearError } = require('../utils/respuesta');

// ===================== Categorías =====================

const getCategories = async (req, res) => {
    const categorias = await Categoria.findAll({ order: [['nombre', 'ASC']] });
    return ok(res, categorias);
};

const getCategory = async (req, res) => {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) throw crearError(404, 'CATEGORIA_NO_ENCONTRADA', 'Categoría no encontrada');
    return ok(res, categoria);
};

const createCategory = async (req, res) => {
    const { nombre, descripcion } = req.body;
    if (!nombre?.trim()) throw crearError(400, 'DATOS_INCOMPLETOS', 'El nombre es obligatorio');
    const categoria = await Categoria.create({ nombre: nombre.trim(), descripcion: descripcion || null });
    return ok(res, categoria, 201);
};

const updateCategory = async (req, res) => {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) throw crearError(404, 'CATEGORIA_NO_ENCONTRADA', 'Categoría no encontrada');

    const { nombre, descripcion } = req.body;
    if (nombre !== undefined) {
        if (!nombre.trim()) throw crearError(400, 'DATOS_INCOMPLETOS', 'El nombre es obligatorio');
        categoria.nombre = nombre.trim();
    }
    if (descripcion !== undefined) categoria.descripcion = descripcion || null;
    await categoria.save();
    return ok(res, categoria);
};

const deleteCategory = async (req, res) => {
    const categoria = await Categoria.findByPk(req.params.id);
    if (!categoria) throw crearError(404, 'CATEGORIA_NO_ENCONTRADA', 'Categoría no encontrada');

    if (await Producto.count({ where: { id_categoria: categoria.id_categoria } }))
        throw crearError(409, 'CATEGORIA_EN_USO', 'No se puede eliminar: la categoría tiene productos');

    await categoria.destroy();
    return ok(res, { eliminado: true });
};

// ===================== Sabores =====================

const getFlavors = async (req, res) => {
    const where = req.query.todos === '1' ? {} : { activo: true };
    const sabores = await Sabor.findAll({ where, order: [['nombre', 'ASC']] });
    return ok(res, sabores);
};

const createFlavor = async (req, res) => {
    if (!req.body.nombre?.trim()) throw crearError(400, 'DATOS_INCOMPLETOS', 'El nombre es obligatorio');
    const sabor = await Sabor.create({ nombre: req.body.nombre.trim() });
    return ok(res, sabor, 201);
};

const updateFlavor = async (req, res) => {
    const sabor = await Sabor.findByPk(req.params.id);
    if (!sabor) throw crearError(404, 'SABOR_NO_ENCONTRADO', 'Sabor no encontrado');

    if (req.body.nombre !== undefined) {
        if (!req.body.nombre.trim()) throw crearError(400, 'DATOS_INCOMPLETOS', 'El nombre es obligatorio');
        sabor.nombre = req.body.nombre.trim();
    }
    if (typeof req.body.activo === 'boolean') sabor.activo = req.body.activo;
    await sabor.save();
    return ok(res, sabor);
};

// Si está en uso se desactiva, para no alterar los productos que lo tienen.
const deleteFlavor = async (req, res) => {
    const sabor = await Sabor.findByPk(req.params.id);
    if (!sabor) throw crearError(404, 'SABOR_NO_ENCONTRADO', 'Sabor no encontrado');

    if (await ProductoSabor.count({ where: { id_sabor: sabor.id_sabor } })) {
        sabor.activo = false;
        await sabor.save();
        return ok(res, { eliminado: false, desactivado: true });
    }

    await sabor.destroy();
    return ok(res, { eliminado: true });
};

// ===================== Exportaciones =====================
module.exports = {
    getCategories, getCategory, createCategory, updateCategory, deleteCategory,
    getFlavors, createFlavor, updateFlavor, deleteFlavor
};
