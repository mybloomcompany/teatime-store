const sequelize = require('../config/conexion');
const { DataTypes } = require('sequelize');

const Promocion = sequelize.define('Promocion', {
    id_promocion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    porcentaje_descuento: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    fecha_inicio: { type: DataTypes.DATEONLY, allowNull: false },
    fecha_fin: { type: DataTypes.DATEONLY, allowNull: false },
    codigo: { type: DataTypes.STRING(30), unique: true }
}, {
    timestamps: false,
    tableName: 'promocion'
});

const ProductoPromocion = sequelize.define('ProductoPromocion', {
    id_producto: { type: DataTypes.INTEGER, primaryKey: true },
    id_promocion: { type: DataTypes.INTEGER, primaryKey: true }
}, {
    timestamps: false,
    tableName: 'producto_promocion'
});

module.exports = { Promocion, ProductoPromocion };
