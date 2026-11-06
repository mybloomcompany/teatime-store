const sequelize = require('../config/conexion');
const { DataTypes } = require('sequelize');

const Compra = sequelize.define('Compra', {
    id_compra: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    estado: { type: DataTypes.STRING(30), allowNull: false },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    id_cliente: { type: DataTypes.INTEGER, allowNull: false },
    clave_operacion: { type: DataTypes.UUID, allowNull: false, unique: true }
}, {
    timestamps: false,
    tableName: 'compra'
});

const DetalleCompra = sequelize.define('DetalleCompra', {
    id_compra: { type: DataTypes.INTEGER, primaryKey: true },
    id_producto: { type: DataTypes.INTEGER, primaryKey: true },
    cantidad: { type: DataTypes.INTEGER, allowNull: false },
    precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    precio_lista: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    id_promocion: { type: DataTypes.INTEGER }
}, {
    timestamps: false,
    tableName: 'detalle_compra'
});

module.exports = { Compra, DetalleCompra };
