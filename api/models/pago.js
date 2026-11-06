const sequelize = require('../config/conexion');
const { DataTypes } = require('sequelize');

const Pago = sequelize.define('Pago', {
    id_pago: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_compra: { type: DataTypes.INTEGER, unique: true },
    id_venta: { type: DataTypes.INTEGER, unique: true },
    metodo: { type: DataTypes.STRING(20), allowNull: false },
    estado: { type: DataTypes.STRING(20), allowNull: false },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    monto_recibido: { type: DataTypes.DECIMAL(10, 2) },
    referencia_externa: { type: DataTypes.STRING(100), unique: true },
    id_usuario_confirma: { type: DataTypes.INTEGER },
    fecha_creacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    fecha_confirmacion: { type: DataTypes.DATE }
}, {
    timestamps: false,
    tableName: 'pago'
});

module.exports = Pago;
