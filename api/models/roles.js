const sequelize = require('../config/conexion');
const { DataTypes } = require('sequelize');

// Las tres tablas de especialización tienen la misma forma: solo el id del usuario.
const definirRol = (nombre, tabla) => sequelize.define(nombre, {
    id_usuario: { type: DataTypes.INTEGER, primaryKey: true }
}, {
    timestamps: false,
    tableName: tabla
});

const Administrador = definirRol('Administrador', 'administrador');
const Vendedor = definirRol('Vendedor', 'vendedor');
const Cliente = definirRol('Cliente', 'cliente');

module.exports = { Administrador, Vendedor, Cliente };
