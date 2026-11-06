const sequelize = require('../config/conexion');
const { DataTypes } = require('sequelize');

const Producto = sequelize.define('Producto', {
    id_producto: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(150), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    precio: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    id_categoria: { type: DataTypes.INTEGER, allowNull: false },
    sku: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    marca: { type: DataTypes.STRING(100) },
    imagen: { type: DataTypes.STRING(500) },
    presentacion: { type: DataTypes.STRING(50) },
    peso: { type: DataTypes.STRING(30) },
    stock_minimo: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
    timestamps: false,
    tableName: 'producto'
});

module.exports = Producto;
