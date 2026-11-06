const sequelize = require('../config/conexion');
const { DataTypes } = require('sequelize');

const Categoria = sequelize.define('Categoria', {
    id_categoria: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    descripcion: { type: DataTypes.TEXT }
}, {
    timestamps: false,
    tableName: 'categoria'
});

module.exports = Categoria;
