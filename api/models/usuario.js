const sequelize = require('../config/conexion');
const { DataTypes } = require('sequelize');

const Usuario = sequelize.define('Usuario', {
    id_usuario: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    apellido: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true, validate: { isEmail: true } },
    contrasena: { type: DataTypes.STRING, allowNull: false },
    telefono: { type: DataTypes.STRING(30) },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, {
    timestamps: false,
    tableName: 'usuario'
});

module.exports = Usuario;
