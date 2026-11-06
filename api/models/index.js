const db = require('../config/conexion');

const Usuario = require('./usuario');
const { Administrador, Vendedor, Cliente } = require('./roles');
const Categoria = require('./categoria');
const { Sabor, ProductoSabor } = require('./sabor');
const Producto = require('./producto');
const { Promocion, ProductoPromocion } = require('./promocion');
const { Carrito, DetalleCarrito, Favorito } = require('./carrito');
const { Compra, DetalleCompra } = require('./compra');
const { Venta, DetalleVenta } = require('./venta');
const Pago = require('./pago');
const { Caja, SesionCaja, MovimientoCaja } = require('./caja');
const MovimientoStock = require('./movimientoStock');
const Reporte = require('./reporte');

// ==================== Relaciones ====================

// Usuarios y roles
Usuario.hasOne(Administrador, { foreignKey: 'id_usuario', as: 'administrador' });
Usuario.hasOne(Vendedor, { foreignKey: 'id_usuario', as: 'vendedor' });
Usuario.hasOne(Cliente, { foreignKey: 'id_usuario', as: 'cliente' });

// Categorías y productos
Categoria.hasMany(Producto, { foreignKey: 'id_categoria', as: 'productos' });
Producto.belongsTo(Categoria, { foreignKey: 'id_categoria', as: 'categoria' });

// Sabores (N:M)
Producto.belongsToMany(Sabor, { through: ProductoSabor, foreignKey: 'id_producto', otherKey: 'id_sabor', as: 'sabores' });
Sabor.belongsToMany(Producto, { through: ProductoSabor, foreignKey: 'id_sabor', otherKey: 'id_producto', as: 'productos' });

// Promociones (N:M)
Producto.belongsToMany(Promocion, { through: ProductoPromocion, foreignKey: 'id_producto', otherKey: 'id_promocion', as: 'promociones' });
Promocion.belongsToMany(Producto, { through: ProductoPromocion, foreignKey: 'id_promocion', otherKey: 'id_producto', as: 'productos' });

// Carrito y favoritos
Cliente.hasOne(Carrito, { foreignKey: 'id_cliente', as: 'carrito' });
Carrito.hasMany(DetalleCarrito, { foreignKey: 'id_carrito', as: 'detalles' });
DetalleCarrito.belongsTo(Producto, { foreignKey: 'id_producto', as: 'producto' });
Favorito.belongsTo(Producto, { foreignKey: 'id_producto', as: 'producto' });

// Compras
Compra.belongsTo(Usuario, { foreignKey: 'id_cliente', as: 'cliente' });
Compra.hasMany(DetalleCompra, { foreignKey: 'id_compra', as: 'detalles' });
DetalleCompra.belongsTo(Producto, { foreignKey: 'id_producto', as: 'producto' });
DetalleCompra.belongsTo(Promocion, { foreignKey: 'id_promocion', as: 'promocion' });
Compra.hasOne(Pago, { foreignKey: 'id_compra', as: 'pago' });

// Ventas
Venta.belongsTo(Usuario, { foreignKey: 'id_vendedor', as: 'vendedor' });
Venta.belongsTo(SesionCaja, { foreignKey: 'id_sesion', as: 'sesion' });
Venta.hasMany(DetalleVenta, { foreignKey: 'id_venta', as: 'detalles' });
DetalleVenta.belongsTo(Producto, { foreignKey: 'id_producto', as: 'producto' });
DetalleVenta.belongsTo(Promocion, { foreignKey: 'id_promocion', as: 'promocion' });
Venta.hasOne(Pago, { foreignKey: 'id_venta', as: 'pago' });
Pago.belongsTo(Usuario, { foreignKey: 'id_usuario_confirma', as: 'confirmado_por' });

// Caja
Caja.hasMany(SesionCaja, { foreignKey: 'id_caja', as: 'sesiones' });
SesionCaja.belongsTo(Caja, { foreignKey: 'id_caja', as: 'caja' });
SesionCaja.belongsTo(Usuario, { foreignKey: 'id_vendedor', as: 'vendedor' });
SesionCaja.hasMany(MovimientoCaja, { foreignKey: 'id_sesion', as: 'movimientos' });
SesionCaja.hasMany(Venta, { foreignKey: 'id_sesion', as: 'ventas' });
MovimientoCaja.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

// Movimientos de stock
MovimientoStock.belongsTo(Producto, { foreignKey: 'id_producto', as: 'producto' });
MovimientoStock.belongsTo(Usuario, { foreignKey: 'id_usuario', as: 'usuario' });

// Reportes
Reporte.belongsTo(Usuario, { foreignKey: 'id_administrador', as: 'administrador' });

// ==================== Exportar ====================
module.exports = {
    db,
    Usuario, Administrador, Vendedor, Cliente,
    Categoria, Sabor, ProductoSabor, Producto,
    Promocion, ProductoPromocion,
    Carrito, DetalleCarrito, Favorito,
    Compra, DetalleCompra, Venta, DetalleVenta, Pago,
    Caja, SesionCaja, MovimientoCaja,
    MovimientoStock, Reporte
};
