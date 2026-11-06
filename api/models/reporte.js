const sequelize = require('../config/conexion');
const { DataTypes } = require('sequelize');

const Reporte = sequelize.define('Reporte', {
    id_reporte: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    tipo: { type: DataTypes.STRING(100), allowNull: false },
    fecha_generacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    id_administrador: { type: DataTypes.INTEGER, allowNull: false }
}, {
    timestamps: false,
    tableName: 'reporte'
});

module.exports = Reporte;
