export const moneda = (valor) =>
  `$ ${Number(valor || 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export const fecha = (valor) =>
  valor ? new Date(valor).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export const fechaHora = (valor) =>
  valor ? new Date(valor).toLocaleString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export const hoyISO = () => new Date().toLocaleDateString('en-CA')

export const numeroPedido = (id) => `TT-${String(id).padStart(5, '0')}`
export const numeroVenta = (id) => `#${String(id).padStart(6, '0')}`

// Texto y color de cada estado del sistema.
export const ESTADOS = {
  PENDIENTE_PAGO: ['Pendiente de pago', 'aviso'],
  CONFIRMADO: ['Confirmado', 'info'],
  EN_PREPARACION: ['En preparación', 'aviso'],
  LISTO_PARA_RETIRO: ['Listo para retirar', 'info'],
  ENTREGADO: ['Entregado', 'exito'],
  CANCELADO: ['Cancelado', 'error'],
  COMPLETADA: ['Cobrada', 'exito'],
  ANULADA: ['Anulada', 'error'],
  PENDIENTE: ['Pendiente', 'aviso'],
  APROBADO: ['Aprobado', 'exito'],
  RECHAZADO: ['Rechazado', 'error'],
  ANULADO: ['Anulado', 'error'],
  ABIERTA: ['Abierta', 'exito'],
  CERRADA: ['Cerrada', 'neutro'],
  ACTIVA: ['Activa', 'exito'],
  PROGRAMADA: ['Programada', 'info'],
  FINALIZADA: ['Finalizada', 'neutro'],
  DISPONIBLE: ['Disponible', 'exito'],
  BAJO: ['Stock bajo', 'aviso'],
  AGOTADO: ['Agotado', 'error']
}

export const METODOS_PAGO = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  MERCADO_PAGO_QR: 'QR Mercado Pago'
}

export const TIPOS_MOVIMIENTO = {
  STOCK_INICIAL: 'Stock inicial',
  INGRESO: 'Ingreso',
  EGRESO: 'Egreso',
  AJUSTE: 'Ajuste',
  PERDIDA: 'Pérdida',
  DANADO: 'Dañado',
  VENTA_POS: 'Venta POS',
  COMPRA_ONLINE: 'Compra online',
  ANULACION_VENTA: 'Anulación de venta',
  ANULACION_COMPRA: 'Anulación de compra',
  VENTA_EFECTIVO: 'Venta en efectivo'
}
