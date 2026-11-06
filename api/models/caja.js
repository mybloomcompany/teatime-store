const sequelize = require('../config/conexion');
const { DataTypes } = require('sequelize');

const Caja = sequelize.define('Caja', {
    id_caja: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
    timestamps: false,
    tableName: 'caja'
});

const SesionCaja = sequelize.define('SesionCaja', {
    id_sesion: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_caja: { type: DataTypes.INTEGER, allowNull: false },
    id_vendedor: { type: DataTypes.INTEGER, allowNull: false },
    estado: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ABIERTA' },
    fecha_apertura: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    monto_inicial: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    fecha_cierre: { type: DataTypes.DATE },
    monto_esperado: { type: DataTypes.DECIMAL(10, 2) },
    monto_declarado: { type: DataTypes.DECIMAL(10, 2) },
    diferencia: { type: DataTypes.DECIMAL(10, 2) },
    observacion: { type: DataTypes.TEXT }
}, {
    timestamps: false,
    tableName: 'sesion_caja'
});

const MovimientoCaja = sequelize.define('MovimientoCaja', {
    id_movimiento_caja: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    id_sesion: { type: DataTypes.INTEGER, allowNull: false },
    id_usuario: { type: DataTypes.INTEGER, allowNull: false },
    tipo: { type: DataTypes.STRING(20), allowNull: false },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    descripcion: { type: DataTypes.TEXT },
    id_venta: { type: DataTypes.INTEGER },
    clave_operacion: { type: DataTypes.UUID, unique: true },
    fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
    timestamps: false,
    tableName: 'movimiento_caja'
});

module.exports = { Caja, SesionCaja, MovimientoCaja };
