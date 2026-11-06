// Datos de prueba para desarrollo y demostración. Se ejecuta con: npm run seed
// Se puede ejecutar varias veces: no duplica datos.
require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
    db, Usuario, Administrador, Vendedor, Cliente, Carrito, Categoria, Sabor, ProductoSabor,
    Producto, Promocion, ProductoPromocion, Caja
} = require('../models');
const { registrarMovimiento } = require('../utils/stock');

// Solo para desarrollo: nunca usar estas cuentas en producción.
const CONTRASENA_PRUEBA = process.env.SEED_PASSWORD;

const USUARIOS = [
    { nombre: 'María', apellido: 'García', email: 'admin@teatime.test', rol: Administrador },
    { nombre: 'Matías', apellido: 'González', email: 'vendedor@teatime.test', rol: Vendedor },
    { nombre: 'Sofía', apellido: 'Ríos', email: 'vendedor2@teatime.test', rol: Vendedor },
    { nombre: 'Micaela', apellido: 'Martínez', email: 'cliente@teatime.test', rol: Cliente, telefono: '+54 11 4567 8901' }
];

const CATEGORIAS = ['Tés', 'Hebras', 'Infusiones', 'Accesorios', 'Regalos'];
const SABORES = ['Té negro', 'Té verde', 'Boldo', 'Tilo', 'Manzanilla', 'Frutos rojos', 'Vainilla', 'Durazno'];

const PRODUCTOS = [
    { sku: 'TT-1032', nombre: 'Té Verde Matcha Orgánico', categoria: 'Tés', marca: 'New Garden', precio: 8500, stock: 12, stock_minimo: 5, imagen: '/img/matcha.jpg', presentacion: 'Lata', peso: '40 g', sabores: ['Té verde'], descripcion: 'Matcha ceremonial seleccionado en Shizuoka, Japón. Notas vegetales y final dulce.' },
    { sku: 'TT-1024', nombre: 'Té Negro Ceylon en Hebras', categoria: 'Hebras', marca: 'New Garden', precio: 7200, stock: 8, stock_minimo: 5, imagen: '/img/ceylon.jpg', presentacion: 'Hebras', peso: '100 g', sabores: ['Té negro', 'Vainilla'], descripcion: 'Hebras enteras de Sri Lanka, de cuerpo intenso. Disponible en variedad clásica o con vainilla.' },
    { sku: 'TT-1040', nombre: 'Infusión Frutal Patagonia', categoria: 'Infusiones', marca: 'Patagonia Finest Tea & Mate', precio: 9200, stock: 24, stock_minimo: 5, imagen: '/img/frutal.jpg', presentacion: 'Saquitos', peso: '15 saquitos', sabores: ['Frutos rojos'], descripcion: 'Mezcla de frutos rojos deshidratados, sin cafeína.' },
    { sku: 'TT-1055', nombre: 'Set Ceremonial', categoria: 'Regalos', marca: 'Edición TeaTime', precio: 18900, stock: 0, stock_minimo: 2, imagen: '/img/set-ceremonial.jpg', presentacion: 'Set', peso: '2 latas', sabores: [], descripcion: 'Dos latas de edición limitada para regalar.' },
    { sku: 'TT-1061', nombre: 'Té Manzanilla en Hebras', categoria: 'Hebras', marca: 'DeInfusiones', precio: 12200, stock: 18, stock_minimo: 4, imagen: '/img/manzanilla.png', presentacion: 'Hebras', peso: '40 g', sabores: ['Manzanilla'], descripcion: 'Flores enteras de manzanilla, seleccionadas por su aroma suave y relajante.' },
    { sku: 'TT-1062', nombre: 'Té Boldo en Hebras', categoria: 'Hebras', marca: 'DeInfusiones', precio: 6400, stock: 15, stock_minimo: 4, imagen: '/img/boldo.png', presentacion: 'Hebras', peso: '50 g', sabores: ['Boldo'], descripcion: 'Hojas de boldo seleccionadas, ideal para después de las comidas.' },
    { sku: 'TT-1063', nombre: 'Té Tilo en Hebras', categoria: 'Hebras', marca: 'DeInfusiones', precio: 6900, stock: 3, stock_minimo: 4, imagen: '/img/tilo.png', presentacion: 'Hebras', peso: '50 g', sabores: ['Tilo'], descripcion: 'Flores y brácteas de tilo para el descanso.' },
    { sku: 'TT-1064', nombre: 'Blend Frutos Rojos', categoria: 'Infusiones', marca: 'Green Hills', precio: 7800, stock: 20, stock_minimo: 5, imagen: '/img/frutos-rojos.png', presentacion: 'Hebras', peso: '80 g', sabores: ['Frutos rojos', 'Durazno'], descripcion: 'Mezcla frutal de hebras con variedades de frutos rojos y durazno.' },
    { sku: 'TT-1065', nombre: 'Té Negro Clásico', categoria: 'Tés', marca: 'Green Hills', precio: 1700, stock: 40, stock_minimo: 10, imagen: '/img/te-negro.png', presentacion: 'Saquitos', peso: '25 saquitos', sabores: ['Té negro'], descripcion: 'Té negro de todos los días, en saquitos.' },
    { sku: 'TT-1066', nombre: 'Té Verde Jazmín', categoria: 'Tés', marca: 'Green Hills', precio: 5400, stock: 16, stock_minimo: 5, imagen: '/img/te-verde.png', presentacion: 'Pirámides', peso: '15 pirámides', sabores: ['Té verde'], descripcion: 'Té verde con aroma floral, en pirámides.' },
    { sku: 'TT-2001', nombre: 'Juego de Té Kioto', categoria: 'Accesorios', marca: 'Edición TeaTime', precio: 32500, stock: 4, stock_minimo: 2, imagen: '/img/set-tetera.jpg', presentacion: 'Set', peso: '5 piezas', sabores: [], descripcion: 'Tetera y cuatro tazas de cerámica pintadas a mano.' }
];

const fechaRelativa = (dias) => {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(d);
};

async function seedDatabase() {
    if (!CONTRASENA_PRUEBA) throw new Error('Falta SEED_PASSWORD en api/.env: es la contraseña de las cuentas de prueba');

    await db.authenticate();
    const hash = await bcrypt.hash(CONTRASENA_PRUEBA, 10);

    await db.transaction(async (t) => {
        const cuentas = {};
        for (const u of USUARIOS) {
            const [usuario, creado] = await Usuario.findOrCreate({
                where: { email: u.email },
                defaults: { nombre: u.nombre, apellido: u.apellido, contrasena: hash, telefono: u.telefono || null },
                transaction: t
            });
            cuentas[u.email] = usuario;
            if (creado) await u.rol.create({ id_usuario: usuario.id_usuario }, { transaction: t });
            if (creado && u.rol === Cliente) await Carrito.create({ id_cliente: usuario.id_usuario }, { transaction: t });
        }

        const categorias = {};
        for (const nombre of CATEGORIAS) {
            [categorias[nombre]] = await Categoria.findOrCreate({ where: { nombre }, transaction: t });
        }

        const sabores = {};
        for (const nombre of SABORES) {
            [sabores[nombre]] = await Sabor.findOrCreate({ where: { nombre }, transaction: t });
        }

        for (const nombre of ['Caja 1', 'Caja 2']) {
            await Caja.findOrCreate({ where: { nombre }, transaction: t });
        }

        const admin = cuentas['admin@teatime.test'];
        const productos = {};

        for (const p of PRODUCTOS) {
            const { categoria, sabores: nombresSabores, stock, ...datos } = p;
            const [producto, creado] = await Producto.findOrCreate({
                where: { sku: p.sku },
                defaults: { ...datos, id_categoria: categorias[categoria].id_categoria, stock: 0 },
                transaction: t
            });
            productos[p.sku] = producto;

            if (creado) {
                for (const nombre of nombresSabores) {
                    await ProductoSabor.create({ id_producto: producto.id_producto, id_sabor: sabores[nombre].id_sabor }, { transaction: t });
                }
                // Igual que en la API: el stock inicial entra como movimiento.
                if (stock > 0) {
                    await registrarMovimiento(producto, {
                        id_usuario: admin.id_usuario, tipo: 'STOCK_INICIAL', cantidad: stock, observacion: 'Carga inicial de datos de prueba'
                    }, t);
                }
            }
        }

        const [automatica, creadaA] = await Promocion.findOrCreate({
            where: { nombre: 'Ritual de primavera' },
            defaults: {
                descripcion: '10% de descuento en infusiones seleccionadas.',
                porcentaje_descuento: 10, fecha_inicio: fechaRelativa(-5), fecha_fin: fechaRelativa(60)
            },
            transaction: t
        });
        if (creadaA) {
            for (const sku of ['TT-1040', 'TT-1064']) {
                await ProductoPromocion.create({ id_producto: productos[sku].id_producto, id_promocion: automatica.id_promocion }, { transaction: t });
            }
        }

        const [conCodigo, creadaC] = await Promocion.findOrCreate({
            where: { nombre: 'Ritual de invierno' },
            defaults: {
                descripcion: '15% en tés seleccionados con el código INVIERNO15.', codigo: 'INVIERNO15',
                porcentaje_descuento: 15, fecha_inicio: fechaRelativa(-5), fecha_fin: fechaRelativa(60)
            },
            transaction: t
        });
        if (creadaC) {
            for (const sku of ['TT-1032', 'TT-1024', 'TT-1066']) {
                await ProductoPromocion.create({ id_producto: productos[sku].id_producto, id_promocion: conCodigo.id_promocion }, { transaction: t });
            }
        }
    });

    console.log('Datos de prueba cargados.');
    await db.close();
}

seedDatabase().catch((err) => {
    console.error('Error al cargar los datos:', err);
    process.exit(1);
});
