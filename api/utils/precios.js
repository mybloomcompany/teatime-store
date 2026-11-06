const { Op } = require('sequelize');
const { Promocion, ProductoPromocion } = require('../models');
const { crearError } = require('./respuesta');

// Fecha de hoy en Argentina, sin depender de la zona horaria del servidor.
const hoy = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());

const redondear = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;

// Busca las promociones vigentes de cada producto: las automáticas y, si llega, la del código.
async function promocionesPorProducto(ids, codigo, t) {
    const vigencia = { fecha_inicio: { [Op.lte]: hoy() }, fecha_fin: { [Op.gte]: hoy() } };
    let promoCodigo = null;

    if (codigo) {
        promoCodigo = await Promocion.findOne({ where: { codigo: String(codigo).trim().toUpperCase(), ...vigencia }, transaction: t });
        if (!promoCodigo) throw crearError(422, 'CODIGO_INVALIDO', 'El código promocional no existe o no está vigente');
    }

    const condicion = promoCodigo
        ? { [Op.or]: [{ codigo: null }, { id_promocion: promoCodigo.id_promocion }] }
        : { codigo: null };

    const promociones = await Promocion.findAll({ where: { ...vigencia, ...condicion }, transaction: t });
    const relaciones = await ProductoPromocion.findAll({
        where: { id_producto: ids, id_promocion: promociones.map((p) => p.id_promocion) },
        transaction: t
    });

    const porId = new Map(promociones.map((p) => [p.id_promocion, p]));
    const resultado = new Map();
    relaciones.forEach((r) => {
        const lista = resultado.get(r.id_producto) || [];
        lista.push(porId.get(r.id_promocion));
        resultado.set(r.id_producto, lista);
    });

    if (promoCodigo && !relaciones.some((r) => r.id_promocion === promoCodigo.id_promocion)) {
        throw crearError(422, 'CODIGO_NO_APLICA', 'El código no aplica a estos productos');
    }

    return resultado;
}

// Regla única: gana el mayor porcentaje y las promociones no se acumulan.
function calcularPrecio(precioLista, promociones = []) {
    const lista = Number(precioLista);
    const mejor = [...promociones].sort((a, b) =>
        Number(b.porcentaje_descuento) - Number(a.porcentaje_descuento) || a.id_promocion - b.id_promocion)[0];

    if (!mejor) return { precio_lista: lista, precio_unitario: lista, id_promocion: null, promocion: null };

    const final = redondear(lista * (1 - Number(mejor.porcentaje_descuento) / 100));
    if (final >= lista) return { precio_lista: lista, precio_unitario: lista, id_promocion: null, promocion: null };

    return {
        precio_lista: lista,
        precio_unitario: final,
        id_promocion: mejor.id_promocion,
        promocion: { id_promocion: mejor.id_promocion, nombre: mejor.nombre, porcentaje: Number(mejor.porcentaje_descuento) }
    };
}

// Agrega el precio final a una lista de productos del catálogo.
async function agregarPrecios(productos) {
    const ids = productos.map((p) => p.id_producto);
    const promociones = ids.length ? await promocionesPorProducto(ids) : new Map();
    return productos.map((p) => ({
        ...p.toJSON(),
        precio: Number(p.precio),
        ...calcularPrecio(p.precio, promociones.get(p.id_producto))
    }));
}

module.exports = { hoy, redondear, promocionesPorProducto, calcularPrecio, agregarPrecios };
