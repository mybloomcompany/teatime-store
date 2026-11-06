// ===================== Importaciones =====================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, Usuario, Cliente, Carrito } = require('../models');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/jwt');
const { obtenerRol } = require('../middlewares/authMiddleware');
const { ok, crearError } = require('../utils/respuesta');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const datosPublicos = (usuario, rol) => ({
    id_usuario: usuario.id_usuario,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    telefono: usuario.telefono,
    activo: usuario.activo,
    rol
});

const firmarToken = (usuario, rol) => jwt.sign({ id: usuario.id_usuario, rol }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

// ===================== Controladores =====================

// El registro público siempre crea un cliente con su carrito.
const register = async (req, res) => {
    const { nombre, apellido, email, contrasena, telefono } = req.body;

    if (!nombre?.trim() || !apellido?.trim() || !email || !contrasena)
        throw crearError(400, 'DATOS_INCOMPLETOS', 'Nombre, apellido, email y contraseña son obligatorios');
    if (!EMAIL.test(email)) throw crearError(400, 'EMAIL_INVALIDO', 'El email no es válido');
    if (contrasena.length < 8) throw crearError(400, 'CONTRASENA_CORTA', 'La contraseña debe tener al menos 8 caracteres');

    const emailNormalizado = email.trim().toLowerCase();
    if (await Usuario.findOne({ where: { email: emailNormalizado } }))
        throw crearError(409, 'EMAIL_EXISTENTE', 'Ya existe una cuenta con ese email');

    const usuario = await db.transaction(async (t) => {
        const nuevo = await Usuario.create({
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            email: emailNormalizado,
            contrasena: await bcrypt.hash(contrasena, 10),
            telefono: telefono || null
        }, { transaction: t });
        await Cliente.create({ id_usuario: nuevo.id_usuario }, { transaction: t });
        await Carrito.create({ id_cliente: nuevo.id_usuario }, { transaction: t });
        return nuevo;
    });

    return ok(res, { token: firmarToken(usuario, 'cliente'), usuario: datosPublicos(usuario, 'cliente') }, 201);
};

const login = async (req, res) => {
    const { email, contrasena } = req.body;
    if (!email || !contrasena) throw crearError(400, 'DATOS_INCOMPLETOS', 'Ingrese email y contraseña');

    const usuario = await Usuario.findOne({ where: { email: email.trim().toLowerCase() } });

    // Mismo mensaje en ambos casos para no revelar qué emails existen.
    if (!usuario || !(await bcrypt.compare(contrasena, usuario.contrasena)))
        throw crearError(401, 'CREDENCIALES_INVALIDAS', 'Email o contraseña incorrectos');
    if (!usuario.activo) throw crearError(403, 'USUARIO_INACTIVO', 'La cuenta está desactivada');

    const rol = await obtenerRol(usuario.id_usuario);
    return ok(res, { token: firmarToken(usuario, rol), usuario: datosPublicos(usuario, rol) });
};

const me = async (req, res) => {
    const usuario = await Usuario.findByPk(req.user.id);
    return ok(res, datosPublicos(usuario, req.user.rol));
};

const updateMe = async (req, res) => {
    const { nombre, apellido, telefono, contrasena } = req.body;
    const usuario = await Usuario.findByPk(req.user.id);

    if (nombre !== undefined) {
        if (!nombre.trim()) throw crearError(400, 'DATOS_INCOMPLETOS', 'El nombre es obligatorio');
        usuario.nombre = nombre.trim();
    }
    if (apellido !== undefined) {
        if (!apellido.trim()) throw crearError(400, 'DATOS_INCOMPLETOS', 'El apellido es obligatorio');
        usuario.apellido = apellido.trim();
    }
    if (telefono !== undefined) usuario.telefono = telefono || null;
    if (contrasena) {
        if (contrasena.length < 8) throw crearError(400, 'CONTRASENA_CORTA', 'La contraseña debe tener al menos 8 caracteres');
        usuario.contrasena = await bcrypt.hash(contrasena, 10);
    }

    await usuario.save();
    return ok(res, datosPublicos(usuario, req.user.rol));
};

// ===================== Exportaciones =====================
module.exports = { register, login, me, updateMe, datosPublicos };
