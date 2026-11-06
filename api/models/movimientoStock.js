const sequelize = require('../config/conexion');
const { DataTypes } = require('sequelize');

const MovimientoStock = sequelize.define('MovimientoStock', {
    id_movimiento: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_producto: { type: DataTypes.INTEGER, allowNull: false },
    id_usuario: { type: DataTypes.INTEGER, allowNull: false },
    tipo: { type: DataTypes.STRING(20), allowNull: false },
    cantidad: { type: DataTypes.INTEGER, allowNull: false },
    stock_resultante: { type: DataTypes.INTEGER, allowNull: false },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    observacion: { type: DataTypes.TEXT },
    id_venta: { type: DataTypes.INTEGER },
    id_compra: { type: DataTypes.INTEGER },
    clave_operacion: { type: DataTypes.UUID, unique: true }
}, {
    timestamps: false,
    tableName: 'movimiento_stock'
});

module.exports = MovimientoStock;
