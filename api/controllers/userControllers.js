// ===================== Importaciones =====================
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { db, Usuario, Administrador, Vendedor, Cliente, Carrito } = require('../models');
const { ok, lista, crearError, paginacion } = require('../utils/respuesta');

const inclusionRoles = [
    { model: Administrador, as: 'administrador' },
    { model: Vendedor, as: 'vendedor' },
    { model: Cliente, as: 'cliente' }
];

const rolDe = (u) => (u.administrador ? 'administrador' : u.vendedor ? 'vendedor' : u.cliente ? 'cliente' : null);

const formatear = (u) => ({
    id_usuario: u.id_usuario,
    nombre: u.nombre,
    apellido: u.apellido,
    email: u.email,
    telefono: u.telefono,
    activo: u.activo,
    rol: rolDe(u)
});

// ===================== Controladores =====================

const getUsers = async (req, res) => {
    const { page, limit, offset } = paginacion(req.query, 20);
    const where = {};

    if (req.query.search) {
        const q = { [Op.iLike]: `%${req.query.search}%` };
        where[Op.or] = [{ nombre: q }, { apellido: q }, { email: q }];
    }
    if (req.query.status) where.activo = req.query.status === 'activo';

    const include = inclusionRoles.map((r) => ({
        ...r,
        required: req.query.rol === r.as
    }));

    const { rows, count } = await Usuario.findAndCountAll({ where, include, limit, offset, order: [['id_usuario', 'DESC']], distinct: true });
    return lista(res, rows.map(formatear), page, limit, count);
};

const getUser = async (req, res) => {
    const usuario = await Usuario.findByPk(req.params.id, { include: inclusionRoles });
    if (!usuario) throw crearError(404, 'USUARIO_NO_ENCONTRADO', 'Usuario no encontrado');
    return ok(res, formatear(usuario));
};

const createUser = async (req, res) => {
    const { nombre, apellido, email, contrasena, telefono, rol } = req.body;

    if (!nombre?.trim() || !apellido?.trim() || !email || !contrasena)
        throw crearError(400, 'DATOS_INCOMPLETOS', 'Nombre, apellido, email y contraseña son obligatorios');
    if (!['administrador', 'vendedor', 'cliente'].includes(rol))
        throw crearError(400, 'ROL_INVALIDO', 'El rol debe ser administrador, vendedor o cliente');
    if (contrasena.length < 8) throw crearError(400, 'CONTRASENA_CORTA', 'La contraseña debe tener al menos 8 caracteres');

    const creado = await db.transaction(async (t) => {
        const usuario = await Usuario.create({
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            email: email.trim().toLowerCase(),
            contrasena: await bcrypt.hash(contrasena, 10),
            telefono: telefono || null
        }, { transaction: t });

        // Un usuario tiene un solo rol.
        if (rol === 'administrador') await Administrador.create({ id_usuario: usuario.id_usuario }, { transaction: t });
        if (rol === 'vendedor') await Vendedor.create({ id_usuario: usuario.id_usuario }, { transaction: t });
        if (rol === 'cliente') {
            await Cliente.create({ id_usuario: usuario.id_usuario }, { transaction: t });
            await Carrito.create({ id_cliente: usuario.id_usuario }, { transaction: t });
        }
        return usuario;
    });

    const usuario = await Usuario.findByPk(creado.id_usuario, { include: inclusionRoles });
    return ok(res, formatear(usuario), 201);
};

// El rol no se cambia: compras, ventas y reportes dependen de la tabla de cada rol.
const updateUser = async (req, res) => {
    const usuario = await Usuario.findByPk(req.params.id, { include: inclusionRoles });
    if (!usuario) throw crearError(404, 'USUARIO_NO_ENCONTRADO', 'Usuario no encontrado');

    const { nombre, apellido, email, telefono, contrasena } = req.body;
    if (nombre !== undefined) usuario.nombre = nombre.trim();
    if (apellido !== undefined) usuario.apellido = apellido.trim();
    if (email !== undefined) usuario.email = email.trim().toLowerCase();
    if (telefono !== undefined) usuario.telefono = telefono || null;
    if (contrasena) {
        if (contrasena.length < 8) throw crearError(400, 'CONTRASENA_CORTA', 'La contraseña debe tener al menos 8 caracteres');
        usuario.contrasena = await bcrypt.hash(contrasena, 10);
    }

    await usuario.save();
    return ok(res, formatear(usuario));
};

// Baja lógica: nunca se borra un usuario con historial.
const updateUserStatus = async (req, res) => {
    const usuario = await Usuario.findByPk(req.params.id, { include: inclusionRoles });
    if (!usuario) throw crearError(404, 'USUARIO_NO_ENCONTRADO', 'Usuario no encontrado');
    if (usuario.id_usuario === req.user.id) throw crearError(409, 'ACCION_NO_PERMITIDA', 'No puede cambiar el estado de su propia cuenta');
    if (typeof req.body.activo !== 'boolean') throw crearError(400, 'DATOS_INVALIDOS', 'Indique el estado activo');

    usuario.activo = req.body.activo;
    await usuario.save();
    return ok(res, formatear(usuario));
};

// ===================== Exportaciones =====================
module.exports = { getUsers, getUser, createUser, updateUser, updateUserStatus };
