// ===================== Importaciones =====================
const jwt = require('jsonwebtoken');
const { Usuario, Administrador, Vendedor, Cliente } = require('../models');
const { JWT_SECRET } = require('../config/jwt');
const { crearError } = require('../utils/respuesta');

// ===================== Funciones =====================

// El rol sale de la tabla de especialización donde está el usuario.
async function obtenerRol(idUsuario) {
    if (await Administrador.findByPk(idUsuario)) return 'administrador';
    if (await Vendedor.findByPk(idUsuario)) return 'vendedor';
    if (await Cliente.findByPk(idUsuario)) return 'cliente';
    return null;
}

async function usuarioDesdeToken(req) {
    const header = req.headers.authorization;
    if (!header) return null;

    const token = header.replace(/^Bearer\s+/i, '');
    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch {
        throw crearError(401, 'TOKEN_INVALIDO', 'Token inválido o expirado');
    }

    const usuario = await Usuario.findByPk(decoded.id);
    if (!usuario || !usuario.activo) throw crearError(401, 'USUARIO_INACTIVO', 'El usuario no existe o está inactivo');

    return { id: usuario.id_usuario, email: usuario.email, rol: await obtenerRol(usuario.id_usuario) };
}

// ===================== Middlewares =====================

// Verificación de tokens
async function verifyToken(req, res, next) {
    req.user = await usuarioDesdeToken(req);
    if (!req.user) throw crearError(401, 'TOKEN_REQUERIDO', 'Debe iniciar sesión');
    next();
}

// Para rutas públicas que cambian si quien consulta es administrador
async function optionalToken(req, res, next) {
    req.user = await usuarioDesdeToken(req);
    next();
}

// Autorización de roles
function authorizeRole(roles = []) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.rol)) {
            throw crearError(403, 'ACCESO_DENEGADO', 'No tiene permiso para realizar esta acción');
        }
        next();
    };
}

// ===================== Exportaciones =====================
module.exports = { verifyToken, optionalToken, authorizeRole, obtenerRol };
