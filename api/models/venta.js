const sequelize = require('../config/conexion');
const { DataTypes } = require('sequelize');

const Venta = sequelize.define('Venta', {
    id_venta: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    estado: { type: DataTypes.STRING(30), allowNull: false },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    id_vendedor: { type: DataTypes.INTEGER, allowNull: false },
    clave_operacion: { type: DataTypes.UUID, allowNull: false, unique: true },
    id_sesion: { type: DataTypes.INTEGER, allowNull: false },
    descuento: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
    nota: { type: DataTypes.TEXT }
}, {
    timestamps: false,
    tableName: 'venta'
});

const DetalleVenta = sequelize.define('DetalleVenta', {
    id_venta: { type: DataTypes.INTEGER, primaryKey: true },
    id_producto: { type: DataTypes.INTEGER, primaryKey: true },
    cantidad: { type: DataTypes.INTEGER, allowNull: false },
    precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    precio_lista: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    id_promocion: { type: DataTypes.INTEGER }
}, {
    timestamps: false,
    tableName: 'detalle_venta'
});

module.exports = { Venta, DetalleVenta };
