// Prueba de integración contra la API en ejecución y PostgreSQL real.
// Uso: con el servidor encendido y los datos de prueba cargados, ejecutar npm test
require('dotenv').config();
const assert = require('node:assert');
const { randomUUID } = require('node:crypto');

const BASE = process.env.API_URL || 'http://localhost:3000/api/v1';
const CONTRASENA = process.env.SEED_PASSWORD;

if (!CONTRASENA) {
    console.error('Falta SEED_PASSWORD en api/.env: es la contraseña de las cuentas de prueba');
    process.exit(1);
}

let fallidas = 0;
let correctas = 0;

async function api(metodo, ruta, { token, body } = {}) {
    const res = await fetch(`${BASE}${ruta}`, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
        body: body ? JSON.stringify(body) : undefined
    });
    const json = await res.json();
    return { status: res.status, ...json };
}

async function prueba(nombre, fn) {
    try {
        await fn();
        correctas++;
        console.log(`  OK  ${nombre}`);
    } catch (err) {
        fallidas++;
        console.log(`  FALLA  ${nombre}\n        ${err.message}`);
    }
}

const login = async (email) => (await api('POST', '/auth/login', { body: { email, contrasena: CONTRASENA } })).data.token;
const stockDe = async (id) => (await api('GET', `/products/${id}`)).data.stock;

async function main() {
    const admin = await login('admin@teatime.test');
    const vendedor = await login('vendedor@teatime.test');
    const vendedor2 = await login('vendedor2@teatime.test');
    const cliente = await login('cliente@teatime.test');
    const productos = (await api('GET', '/products?limit=50')).data;
    const porSku = (sku) => productos.find((p) => p.sku === sku);

    console.log('\nAutenticación y roles');
    await prueba('login inválido responde 401', async () => {
        assert.equal((await api('POST', '/auth/login', { body: { email: 'admin@teatime.test', contrasena: 'incorrecta' } })).status, 401);
    });
    await prueba('sin token no se accede a usuarios', async () => assert.equal((await api('GET', '/users')).status, 401));
    await prueba('un cliente no accede a administración', async () => assert.equal((await api('GET', '/dashboard/summary', { token: cliente })).status, 403));
    await prueba('un cliente no accede al POS', async () => assert.equal((await api('POST', '/pos/sales', { token: cliente, body: {} })).status, 403));
    await prueba('un administrador no puede abrir caja', async () => assert.equal((await api('POST', '/pos/registers/1/open', { token: admin, body: { monto_inicial: 0 } })).status, 403));
    await prueba('un administrador no puede vender por POS', async () => assert.equal((await api('POST', '/pos/sales', { token: admin, body: {} })).status, 403));
    await prueba('el registro público crea un cliente', async () => {
        const email = `nuevo${Date.now()}@teatime.test`;
        const r = await api('POST', '/auth/register', { body: { nombre: 'Ana', apellido: 'Paz', email, contrasena: 'Clave12345' } });
        assert.equal(r.status, 201);
        assert.equal(r.data.usuario.rol, 'cliente');
        assert.equal((await api('POST', '/auth/register', { body: { nombre: 'Ana', apellido: 'Paz', email, contrasena: 'Clave12345' } })).status, 409);
    });

    console.log('\nCatálogo y búsqueda');
    await prueba('busca por marca, sabor y categoría', async () => {
        assert.ok((await api('GET', '/products?search=Patagonia')).data.length >= 1);
        const porSabor = (await api('GET', '/products?search=vainilla')).data;
        assert.ok(porSabor.some((p) => p.sku === 'TT-1024'), 'sabor vainilla');
        assert.ok((await api('GET', '/products?search=Accesorios')).data.some((p) => p.sku === 'TT-2001'), 'categoría');
    });
    await prueba('un producto puede tener varios sabores', async () => assert.equal(porSku('TT-1024').sabores.length, 2));
    await prueba('la promoción automática calcula el precio final', async () => {
        const p = porSku('TT-1040');
        assert.equal(p.precio_lista, 9200);
        assert.equal(p.precio_unitario, 8280);
    });
    let idNuevo;
    await prueba('el alta con stock inicial genera un movimiento', async () => {
        const categoria = porSku('TT-1032').id_categoria;
        const r = await api('POST', '/products', { token: admin, body: { nombre: 'Producto prueba', sku: `PR-${Date.now()}`, precio: 1000, id_categoria: categoria, stock_inicial: 5 } });
        assert.equal(r.status, 201);
        idNuevo = r.data.id_producto;
        assert.equal(r.data.stock, 5);
        const movs = (await api('GET', `/stock/movements?producto=${idNuevo}`, { token: admin })).data;
        assert.equal(movs.length, 1);
        assert.equal(movs[0].tipo, 'STOCK_INICIAL');
    });
    await prueba('editar un producto no cambia el stock', async () => {
        const r = await api('PATCH', `/products/${idNuevo}`, { token: admin, body: { stock: 999, precio: 1100 } });
        assert.equal(r.data.stock, 5);
        assert.equal(r.data.precio, 1100);
    });
    await prueba('precio cero es rechazado', async () => assert.equal((await api('PATCH', `/products/${idNuevo}`, { token: admin, body: { precio: 0 } })).status, 400));

    console.log('\nStock');
    await prueba('ingreso, egreso excesivo y ajuste', async () => {
        const entrada = await api('POST', '/stock/entry', { token: admin, body: { id_producto: idNuevo, cantidad: 10, clave_operacion: randomUUID() } });
        assert.equal(entrada.status, 201);
        assert.equal(await stockDe(idNuevo), 15);
        const exceso = await api('POST', '/stock/exit', { token: admin, body: { id_producto: idNuevo, cantidad: 100, observacion: 'prueba', clave_operacion: randomUUID() } });
        assert.equal(exceso.status, 409);
        assert.equal(await stockDe(idNuevo), 15);
        const ajuste = await api('POST', '/stock/adjustment', { token: vendedor, body: { id_producto: idNuevo, cantidad: 12, observacion: 'conteo', clave_operacion: randomUUID() } });
        assert.equal(ajuste.data.cantidad, -3);
        assert.equal(await stockDe(idNuevo), 12);
    });
    await prueba('un reintento de movimiento no lo duplica', async () => {
        const clave = randomUUID();
        const body = { id_producto: idNuevo, cantidad: 1, clave_operacion: clave };
        assert.equal((await api('POST', '/stock/entry', { token: admin, body })).status, 201);
        assert.equal((await api('POST', '/stock/entry', { token: admin, body })).status, 200);
        assert.equal(await stockDe(idNuevo), 13);
    });

    console.log('\nCaja y POS');
    const ticket = (sku, cantidad = 1) => [{ id_producto: porSku(sku).id_producto, cantidad }];
    await prueba('no se puede vender sin caja abierta', async () => {
        const r = await api('POST', '/pos/sales', { token: vendedor, body: { clave_operacion: randomUUID(), items: ticket('TT-1065'), metodo: 'EFECTIVO', monto_recibido: 5000 } });
        assert.equal(r.status, 409);
    });
    let sesion;
    await prueba('abre caja y no permite dos sesiones', async () => {
        const r = await api('POST', '/pos/registers/1/open', { token: vendedor, body: { monto_inicial: 10000 } });
        assert.equal(r.status, 201);
        sesion = r.data;
        assert.equal((await api('POST', '/pos/registers/1/open', { token: vendedor2, body: { monto_inicial: 0 } })).status, 409);
        assert.equal((await api('POST', '/pos/registers/2/open', { token: vendedor, body: { monto_inicial: 0 } })).status, 409);
    });
    await prueba('efectivo insuficiente es rechazado', async () => {
        const r = await api('POST', '/pos/sales', { token: vendedor, body: { clave_operacion: randomUUID(), items: ticket('TT-1065'), metodo: 'EFECTIVO', monto_recibido: 1 } });
        assert.equal(r.status, 422);
    });
    await prueba('QR y tarjeta exigen confirmación manual', async () => {
        const r = await api('POST', '/pos/sales', { token: vendedor, body: { clave_operacion: randomUUID(), items: ticket('TT-1065'), metodo: 'MERCADO_PAGO_QR' } });
        assert.equal(r.status, 422);
    });
    let venta;
    await prueba('venta en efectivo descuenta stock y calcula vuelto', async () => {
        const antes = await stockDe(porSku('TT-1065').id_producto);
        const r = await api('POST', '/pos/sales', { token: vendedor, body: { clave_operacion: randomUUID(), items: ticket('TT-1065', 2), metodo: 'EFECTIVO', monto_recibido: 5000 } });
        assert.equal(r.status, 201);
        venta = r.data;
        assert.equal(Number(venta.total), 3400);
        assert.equal(venta.vuelto, 1600);
        assert.equal(await stockDe(porSku('TT-1065').id_producto), antes - 2);
    });
    await prueba('el precio histórico queda guardado con la promoción', async () => {
        const r = await api('POST', '/pos/sales', { token: vendedor, body: { clave_operacion: randomUUID(), items: ticket('TT-1040'), metodo: 'MERCADO_PAGO_QR', confirmado_manual: true } });
        assert.equal(r.status, 201);
        assert.equal(Number(r.data.detalles[0].precio_lista), 9200);
        assert.equal(Number(r.data.detalles[0].precio_unitario), 8280);
        assert.ok(r.data.detalles[0].id_promocion);
    });
    await prueba('descuento manual respeta el tope', async () => {
        const r = await api('POST', '/pos/sales', { token: vendedor, body: { clave_operacion: randomUUID(), items: ticket('TT-1065'), metodo: 'EFECTIVO', monto_recibido: 5000, descuento_porcentaje: 50 } });
        assert.equal(r.status, 422);
    });
    await prueba('un reintento de venta no la duplica', async () => {
        const id = porSku('TT-1066').id_producto;
        const antes = await stockDe(id);
        const body = { clave_operacion: randomUUID(), items: [{ id_producto: id, cantidad: 1 }], metodo: 'TARJETA', confirmado_manual: true };
        const [a, b, c] = await Promise.all([
            api('POST', '/pos/sales', { token: vendedor, body }),
            api('POST', '/pos/sales', { token: vendedor, body }),
            api('POST', '/pos/sales', { token: vendedor, body })
        ]);
        assert.deepEqual([a.status, b.status, c.status].sort(), [200, 200, 201]);
        assert.equal(a.data.id_venta, b.data.id_venta);
        assert.equal(b.data.id_venta, c.data.id_venta);
        assert.equal(await stockDe(id), antes - 1);
    });
    await prueba('reutilizar una clave con otra venta da conflicto', async () => {
        const clave = randomUUID();
        await api('POST', '/pos/sales', { token: vendedor, body: { clave_operacion: clave, items: ticket('TT-1065'), metodo: 'TARJETA', confirmado_manual: true } });
        const r = await api('POST', '/pos/sales', { token: vendedor, body: { clave_operacion: clave, items: ticket('TT-1066'), metodo: 'TARJETA', confirmado_manual: true } });
        assert.equal(r.status, 409);
        assert.equal(r.error.code, 'CLAVE_REUTILIZADA');
    });
    await prueba('dos ventas simultáneas por la última unidad: solo una pasa', async () => {
        await api('POST', '/pos/registers/2/open', { token: vendedor2, body: { monto_inicial: 0 } });
        const creado = await api('POST', '/products', { token: admin, body: { nombre: 'Última unidad', sku: `UL-${Date.now()}`, precio: 500, id_categoria: porSku('TT-1032').id_categoria, stock_inicial: 1 } });
        const id = creado.data.id_producto;
        const pedir = (token) => api('POST', '/pos/sales', { token, body: { clave_operacion: randomUUID(), items: [{ id_producto: id, cantidad: 1 }], metodo: 'TARJETA', confirmado_manual: true } });
        const res = await Promise.all([pedir(vendedor), pedir(vendedor2)]);
        assert.deepEqual(res.map((r) => r.status).sort(), [201, 409]);
        assert.equal(await stockDe(id), 0);
    });
    await prueba('anular repone stock, no se duplica y corrige la caja', async () => {
        const id = porSku('TT-1065').id_producto;
        const antes = await stockDe(id);
        const r = await api('POST', `/pos/sales/${venta.id_venta}/cancel`, { token: vendedor, body: { motivo: 'prueba' } });
        assert.equal(r.status, 200);
        assert.equal(r.data.estado, 'ANULADA');
        assert.equal(await stockDe(id), antes + 2);
        await api('POST', `/pos/sales/${venta.id_venta}/cancel`, { token: vendedor, body: {} });
        assert.equal(await stockDe(id), antes + 2);
    });
    await prueba('otro vendedor no puede anular la venta', async () => {
        assert.equal((await api('POST', `/pos/sales/${venta.id_venta}/cancel`, { token: vendedor2, body: {} })).status, 403);
    });
    await prueba('ingreso, egreso y reintento de caja', async () => {
        const clave = randomUUID();
        const body = { tipo: 'INGRESO', monto: 500, descripcion: 'Cambio', clave_operacion: clave };
        assert.equal((await api('POST', `/pos/sessions/${sesion.id_sesion}/movements`, { token: vendedor, body })).status, 201);
        assert.equal((await api('POST', `/pos/sessions/${sesion.id_sesion}/movements`, { token: vendedor, body })).status, 200);
        assert.equal((await api('POST', `/pos/sessions/${sesion.id_sesion}/movements`, { token: vendedor, body: { tipo: 'EGRESO', monto: 200, descripcion: 'Limpieza', clave_operacion: randomUUID() } })).status, 201);
        assert.equal((await api('POST', `/pos/sessions/${sesion.id_sesion}/movements`, { token: vendedor, body: { tipo: 'EGRESO', monto: 9999999, descripcion: 'Excede', clave_operacion: randomUUID() } })).status, 409);
    });
    await prueba('arqueo: esperado, declarado y diferencia', async () => {
        // 10000 inicial + 500 ingreso - 200 egreso (la venta en efectivo fue anulada).
        const r = await api('POST', `/pos/sessions/${sesion.id_sesion}/close`, { token: vendedor, body: { monto_declarado: 10250 } });
        assert.equal(r.status, 200);
        assert.equal(r.data.estado, 'CERRADA');
        assert.equal(Number(r.data.monto_esperado), 10300);
        assert.equal(Number(r.data.diferencia), -50);
    });
    await prueba('con la sesión cerrada no se vende ni se anula', async () => {
        const v = await api('POST', '/pos/sales', { token: vendedor, body: { clave_operacion: randomUUID(), items: ticket('TT-1065'), metodo: 'TARJETA', confirmado_manual: true } });
        assert.equal(v.status, 409);
    });
    await prueba('historial de sesiones para el administrador', async () => {
        const r = await api('GET', '/pos/sessions', { token: admin });
        assert.ok(r.data.length >= 1);
    });

    console.log('\nEcommerce');
    await api('DELETE', '/cart', { token: cliente });
    await prueba('no se agrega más que el stock ni un producto agotado', async () => {
        assert.equal((await api('POST', '/cart/items', { token: cliente, body: { id_producto: porSku('TT-1055').id_producto, cantidad: 1 } })).status, 409);
        assert.equal((await api('POST', '/cart/items', { token: cliente, body: { id_producto: porSku('TT-1063').id_producto, cantidad: 999 } })).status, 409);
    });
    await prueba('favoritos: agregar, listar y quitar', async () => {
        const id = porSku('TT-1032').id_producto;
        assert.equal((await api('POST', `/favorites/${id}`, { token: cliente })).status, 201);
        assert.ok((await api('GET', '/favorites', { token: cliente })).data.some((p) => p.id_producto === id));
        assert.equal((await api('DELETE', `/favorites/${id}`, { token: cliente })).status, 200);
    });
    await prueba('el código promocional calcula sin guardarse en el carrito', async () => {
        await api('POST', '/cart/items', { token: cliente, body: { id_producto: porSku('TT-1032').id_producto, cantidad: 2 } });
        const con = (await api('GET', '/cart?codigo=invierno15', { token: cliente })).data;
        assert.equal(con.total, 14450);
        assert.equal((await api('GET', '/cart', { token: cliente })).data.total, 17000);
        assert.equal((await api('GET', '/cart?codigo=NOEXISTE', { token: cliente })).status, 422);
    });
    await prueba('el carrito vacío no genera pedido', async () => {
        const otro = await api('POST', '/auth/register', { body: { nombre: 'Sin', apellido: 'Carrito', email: `vacio${Date.now()}@teatime.test`, contrasena: 'Clave12345' } });
        assert.equal((await api('POST', '/orders', { token: otro.data.token, body: { clave_operacion: randomUUID() } })).status, 422);
    });
    let pedido;
    await prueba('la compra queda pendiente, descuenta stock y vacía el carrito', async () => {
        const id = porSku('TT-1032').id_producto;
        const antes = await stockDe(id);
        const clave = randomUUID();
        const r = await api('POST', '/orders', { token: cliente, body: { clave_operacion: clave, codigo: 'INVIERNO15', total_esperado: 14450 } });
        assert.equal(r.status, 201);
        pedido = r.data;
        assert.equal(pedido.estado, 'PENDIENTE_PAGO');
        assert.equal(pedido.pago.estado, 'PENDIENTE');
        assert.equal(pedido.entrega, 'RETIRO_EN_LOCAL');
        assert.equal(await stockDe(id), antes - 2);
        assert.equal((await api('GET', '/cart', { token: cliente })).data.items.length, 0);
        const reintento = await api('POST', '/orders', { token: cliente, body: { clave_operacion: clave, codigo: 'INVIERNO15', total_esperado: 14450 } });
        assert.equal(reintento.status, 200);
        assert.equal(reintento.data.id_compra, pedido.id_compra);
    });
    await prueba('el cliente no aprueba su propio pago', async () => {
        assert.equal((await api('POST', `/orders/${pedido.id_compra}/payment/confirm`, { token: cliente, body: {} })).status, 403);
        const aviso = await api('POST', `/me/orders/${pedido.id_compra}/payment-notice`, { token: cliente, body: { referencia: `OP-${Date.now()}` } });
        assert.equal(aviso.data.pago.estado, 'PENDIENTE');
    });
    await prueba('un pedido sin pago no avanza', async () => {
        assert.equal((await api('PATCH', `/orders/${pedido.id_compra}/status`, { token: admin, body: { estado: 'EN_PREPARACION' } })).status, 409);
    });
    await prueba('confirmación manual y estados hasta la entrega', async () => {
        const c = await api('POST', `/orders/${pedido.id_compra}/payment/confirm`, { token: admin, body: {} });
        assert.equal(c.data.estado, 'CONFIRMADO');
        assert.equal(c.data.pago.estado, 'APROBADO');
        for (const estado of ['EN_PREPARACION', 'LISTO_PARA_RETIRO', 'ENTREGADO']) {
            assert.equal((await api('PATCH', `/orders/${pedido.id_compra}/status`, { token: admin, body: { estado } })).data.estado, estado);
        }
        assert.equal((await api('PATCH', `/orders/${pedido.id_compra}/status`, { token: admin, body: { estado: 'CANCELADO' } })).status, 409);
    });
    await prueba('un cliente no ve pedidos ajenos', async () => {
        const otro = await api('POST', '/auth/register', { body: { nombre: 'Otro', apellido: 'Cliente', email: `otro${Date.now()}@teatime.test`, contrasena: 'Clave12345' } });
        assert.equal((await api('GET', `/me/orders/${pedido.id_compra}`, { token: otro.data.token })).status, 404);
    });
    await prueba('cancelar o rechazar un pedido repone el stock', async () => {
        const id = porSku('TT-1062').id_producto;
        const antes = await stockDe(id);
        await api('POST', '/cart/items', { token: cliente, body: { id_producto: id, cantidad: 3 } });
        const a = await api('POST', '/orders', { token: cliente, body: { clave_operacion: randomUUID() } });
        assert.equal(await stockDe(id), antes - 3);
        await api('POST', `/me/orders/${a.data.id_compra}/cancel`, { token: cliente });
        await api('POST', `/me/orders/${a.data.id_compra}/cancel`, { token: cliente });
        assert.equal(await stockDe(id), antes);

        await api('POST', '/cart/items', { token: cliente, body: { id_producto: id, cantidad: 1 } });
        const b = await api('POST', '/orders', { token: cliente, body: { clave_operacion: randomUUID() } });
        const r = await api('POST', `/orders/${b.data.id_compra}/payment/reject`, { token: admin, body: {} });
        assert.equal(r.data.pago.estado, 'RECHAZADO');
        assert.equal(await stockDe(id), antes);
    });

    console.log('\nAdministración');
    await prueba('promoción: crear, listar y bloquear borrado si fue usada', async () => {
        const hoy = new Date().toISOString().slice(0, 10);
        const r = await api('POST', '/promotions', { token: admin, body: { nombre: 'Prueba', porcentaje_descuento: 5, fecha_inicio: hoy, fecha_fin: '2099-01-01', categorias: [porSku('TT-2001').id_categoria] } });
        assert.equal(r.status, 201);
        assert.equal((await api('DELETE', `/promotions/${r.data.id_promocion}`, { token: admin })).status, 200);
        const lista = (await api('GET', '/promotions', { token: admin })).data;
        const usada = lista.find((p) => p.nombre === 'Ritual de primavera');
        assert.equal((await api('DELETE', `/promotions/${usada.id_promocion}`, { token: admin })).status, 409);
    });
    await prueba('categoría y sabor: alta y baja, sin borrar datos en uso', async () => {
        const c = await api('POST', '/categories', { token: admin, body: { nombre: `Cat ${Date.now()}` } });
        assert.equal((await api('DELETE', `/categories/${c.data.id_categoria}`, { token: admin })).status, 200);
        assert.equal((await api('DELETE', `/categories/${porSku('TT-1032').id_categoria}`, { token: admin })).status, 409);
        const s = await api('POST', '/flavors', { token: admin, body: { nombre: `Sabor ${Date.now()}` } });
        assert.equal((await api('DELETE', `/flavors/${s.data.id_sabor}`, { token: admin })).data.eliminado, true);
    });
    await prueba('usuarios: crear vendedor y desactivarlo impide su login', async () => {
        const email = `caja${Date.now()}@teatime.test`;
        const r = await api('POST', '/users', { token: admin, body: { nombre: 'Luz', apellido: 'Sol', email, contrasena: 'Clave12345', rol: 'vendedor' } });
        assert.equal(r.data.rol, 'vendedor');
        await api('PATCH', `/users/${r.data.id_usuario}/status`, { token: admin, body: { activo: false } });
        assert.equal((await api('POST', '/auth/login', { body: { email, contrasena: 'Clave12345' } })).status, 403);
    });
    await prueba('dashboard, ventas unificadas y reportes responden con datos', async () => {
        const d = (await api('GET', '/dashboard/summary', { token: admin })).data;
        assert.ok(Number(d.ventas_mes) > 0);
        const ventas = (await api('GET', '/sales', { token: admin })).data;
        assert.ok(ventas.some((v) => v.canal === 'ONLINE') && ventas.some((v) => v.canal === 'POS'));
        assert.ok((await api('GET', '/reports/sales?from=2020-01-01&to=2099-01-01', { token: admin })).data.por_canal.length === 2);
        assert.ok((await api('GET', '/reports/best-sellers', { token: admin })).data.length > 0);
        assert.ok((await api('GET', '/reports/stock', { token: admin })).data.length > 0);
        assert.ok((await api('GET', '/reports/cash', { token: admin })).data.length > 0);
    });

    console.log('\nAuditoría de consistencia');
    await prueba('todos los controles dan 0', async () => {
        const a = (await api('GET', '/reports/audit', { token: admin })).data;
        console.log('       ', JSON.stringify(a));
        for (const [control, valor] of Object.entries(a)) assert.equal(valor, 0, control);
    });

    // Deja cerrada la segunda caja usada en la prueba de concurrencia.
    const actual = await api('GET', '/pos/sessions/current', { token: vendedor2 });
    if (actual.data) await api('POST', `/pos/sessions/${actual.data.id_sesion}/close`, { token: vendedor2, body: { monto_declarado: actual.data.efectivo_esperado } });

    console.log(`\nResultado: ${correctas} correctas, ${fallidas} fallidas\n`);
    process.exit(fallidas ? 1 : 0);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
