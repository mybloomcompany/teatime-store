const sequelize = require('../config/conexion');
const { DataTypes } = require('sequelize');

const Carrito = sequelize.define('Carrito', {
    id_carrito: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fecha_creacion: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
    id_cliente: { type: DataTypes.INTEGER, allowNull: false, unique: true }
}, {
    timestamps: false,
    tableName: 'carrito'
});

const DetalleCarrito = sequelize.define('DetalleCarrito', {
    id_carrito: { type: DataTypes.INTEGER, primaryKey: true },
    id_producto: { type: DataTypes.INTEGER, primaryKey: true },
    cantidad: { type: DataTypes.INTEGER, allowNull: false }
}, {
    timestamps: false,
    tableName: 'detalle_carrito'
});

const Favorito = sequelize.define('Favorito', {
    id_cliente: { type: DataTypes.INTEGER, primaryKey: true },
    id_producto: { type: DataTypes.INTEGER, primaryKey: true },
    fecha_agregado: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    timestamps: false,
    tableName: 'favorito'
});

module.exports = { Carrito, DetalleCarrito, Favorito };
