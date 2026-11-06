const sequelize = require('../config/conexion');
const { DataTypes } = require('sequelize');

const Sabor = sequelize.define('Sabor', {
    id_sabor: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
    timestamps: false,
    tableName: 'sabor'
});

const ProductoSabor = sequelize.define('ProductoSabor', {
    id_producto: { type: DataTypes.INTEGER, primaryKey: true },
    id_sabor: { type: DataTypes.INTEGER, primaryKey: true }
}, {
    timestamps: false,
    tableName: 'producto_sabor'
});

module.exports = { Sabor, ProductoSabor };
