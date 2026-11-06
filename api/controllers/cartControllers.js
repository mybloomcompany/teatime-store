// ===================== Importaciones =====================
const { Carrito, DetalleCarrito, Favorito, Producto, Categoria } = require('../models');
const { ok, crearError } = require('../utils/respuesta');
const { promocionesPorProducto, calcularPrecio, redondear, agregarPrecios } = require('../utils/precios');

const obtenerCarrito = async (idCliente) => {
    const [carrito] = await Carrito.findOrCreate({ where: { id_cliente: idCliente } });
    return carrito;
};

// El carrito guarda solo productos y cantidades. Los precios se calculan en cada consulta.
async function armarCarrito(idCliente, codigo) {
    const carrito = await obtenerCarrito(idCliente);
    const detalles = await DetalleCarrito.findAll({
        where: { id_carrito: carrito.id_carrito },
        include: [{ model: Producto, as: 'producto', include: [{ model: Categoria, as: 'categoria', attributes: ['nombre'] }] }],
        order: [['id_producto', 'ASC']]
    });

    const ids = detalles.map((d) => d.id_producto);
    const promociones = ids.length ? await promocionesPorProducto(ids, codigo) : new Map();

    const items = detalles.map((d) => {
        const precio = calcularPrecio(d.producto.precio, promociones.get(d.id_producto));
        return {
            id_producto: d.id_producto,
            nombre: d.producto.nombre,
            imagen: d.producto.imagen,
            presentacion: d.producto.presentacion,
            peso: d.producto.peso,
            marca: d.producto.marca,
            categoria: d.producto.categoria?.nombre,
            stock: d.producto.stock,
            disponible: d.producto.activo && d.producto.stock >= d.cantidad,
            cantidad: d.cantidad,
            ...precio,
            importe: redondear(precio.precio_unitario * d.cantidad)
        };
    });

    const subtotal = redondear(items.reduce((s, i) => s + i.precio_lista * i.cantidad, 0));
    const total = redondear(items.reduce((s, i) => s + i.importe, 0));
    return { items, subtotal, descuento: redondear(subtotal - total), total, codigo: codigo ? String(codigo).toUpperCase() : null };
}

async function validarCantidad(idProducto, cantidad) {
    if (!Number.isInteger(cantidad) || cantidad <= 0) throw crearError(400, 'CANTIDAD_INVALIDA', 'La cantidad debe ser un entero mayor a cero');

    const producto = await Producto.findByPk(idProducto);
    if (!producto || !producto.activo) throw crearError(404, 'PRODUCTO_NO_ENCONTRADO', 'Producto no encontrado');
    if (cantidad > producto.stock) throw crearError(409, 'STOCK_INSUFICIENTE', `Solo hay ${producto.stock} unidades disponibles de ${producto.nombre}`);
}

// ===================== Carrito =====================

const getCart = async (req, res) => ok(res, await armarCarrito(req.user.id, req.query.codigo));

const addItem = async (req, res) => {
    const idProducto = Number(req.body.id_producto);
    const cantidad = Number(req.body.cantidad ?? 1);
    const carrito = await obtenerCarrito(req.user.id);

    const existente = await DetalleCarrito.findOne({ where: { id_carrito: carrito.id_carrito, id_producto: idProducto } });
    const nuevaCantidad = (existente?.cantidad || 0) + cantidad;
    await validarCantidad(idProducto, nuevaCantidad);

    if (existente) {
        existente.cantidad = nuevaCantidad;
        await existente.save();
    } else {
        await DetalleCarrito.create({ id_carrito: carrito.id_carrito, id_producto: idProducto, cantidad });
    }
    return ok(res, await armarCarrito(req.user.id), 201);
};

const updateItem = async (req, res) => {
    const cantidad = Number(req.body.cantidad);
    const carrito = await obtenerCarrito(req.user.id);
    const detalle = await DetalleCarrito.findOne({ where: { id_carrito: carrito.id_carrito, id_producto: req.params.id } });
    if (!detalle) throw crearError(404, 'ITEM_NO_ENCONTRADO', 'El producto no está en el carrito');

    await validarCantidad(detalle.id_producto, cantidad);
    detalle.cantidad = cantidad;
    await detalle.save();
    return ok(res, await armarCarrito(req.user.id));
};

const deleteItem = async (req, res) => {
    const carrito = await obtenerCarrito(req.user.id);
    await DetalleCarrito.destroy({ where: { id_carrito: carrito.id_carrito, id_producto: req.params.id } });
    return ok(res, await armarCarrito(req.user.id));
};

const emptyCart = async (req, res) => {
    const carrito = await obtenerCarrito(req.user.id);
    await DetalleCarrito.destroy({ where: { id_carrito: carrito.id_carrito } });
    return ok(res, await armarCarrito(req.user.id));
};

// ===================== Favoritos =====================

const getFavorites = async (req, res) => {
    const favoritos = await Favorito.findAll({
        where: { id_cliente: req.user.id },
        include: [{ model: Producto, as: 'producto', where: { activo: true }, include: [{ model: Categoria, as: 'categoria', attributes: ['id_categoria', 'nombre'] }] }],
        order: [['fecha_agregado', 'DESC']]
    });
    return ok(res, await agregarPrecios(favoritos.map((f) => f.producto)));
};

const addFavorite = async (req, res) => {
    const producto = await Producto.findByPk(req.params.productId);
    if (!producto || !producto.activo) throw crearError(404, 'PRODUCTO_NO_ENCONTRADO', 'Producto no encontrado');
    await Favorito.findOrCreate({ where: { id_cliente: req.user.id, id_producto: producto.id_producto } });
    return ok(res, { favorito: true }, 201);
};

const deleteFavorite = async (req, res) => {
    await Favorito.destroy({ where: { id_cliente: req.user.id, id_producto: req.params.productId } });
    return ok(res, { favorito: false });
};

// ===================== Exportaciones =====================
module.exports = { getCart, addItem, updateItem, deleteItem, emptyCart, getFavorites, addFavorite, deleteFavorite };
