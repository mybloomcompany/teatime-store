// Formato único de respuesta definido en TEATIME.pdf.
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

const lista = (res, data, page, limit, total) => res.json({
    success: true,
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
});

// Error de negocio: lo recibe errorMiddleware y lo devuelve al cliente.
const crearError = (status, code, message) => Object.assign(new Error(message), { status, code });

const paginacion = (query, limitePorDefecto = 12) => {
    const page = Math.max(parseInt(query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit) || limitePorDefecto, 1), 200);
    return { page, limit, offset: (page - 1) * limit };
};

const esUuid = (valor) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor || '');

module.exports = { ok, lista, crearError, paginacion, esUuid };
