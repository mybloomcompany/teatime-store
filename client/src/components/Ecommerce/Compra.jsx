import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { fecha, moneda, numeroPedido } from '../../utils/formato'
import { descartarOperacion, ejecutarOperacion, esResultadoIncierto, operacionPendiente } from '../../utils/operacion'
import { Cantidad, Cargando, Estado, Mensaje, Paginacion, Vacio } from '../General'

const CODIGO_GUARDADO = 'codigo_promocion'

function Resumen({ carrito }) {
  return (
    <>
      <div className="resumen-linea"><span>Subtotal</span><span>{moneda(carrito.subtotal)}</span></div>
      {carrito.descuento > 0 && (
        <div className="resumen-linea" style={{ color: 'var(--exito)' }}><span>Descuento</span><span>- {moneda(carrito.descuento)}</span></div>
      )}
      <div className="resumen-linea"><span>Retiro en el local</span><span>Gratis</span></div>
      <div className="resumen-total"><span>TOTAL</span><span>{moneda(carrito.total)}</span></div>
    </>
  )
}

// ===================== Carrito =====================

export function Carrito() {
  const { actualizarCarrito } = useAuth()
  const navigate = useNavigate()
  const [carrito, setCarrito] = useState(null)
  const [codigo, setCodigo] = useState(sessionStorage.getItem(CODIGO_GUARDADO) || '')
  const [aplicado, setAplicado] = useState(sessionStorage.getItem(CODIGO_GUARDADO) || '')
  const [error, setError] = useState('')

  const cargar = useCallback(async (codigoActual) => {
    try {
      const { data } = await api.get('/cart', { params: codigoActual ? { codigo: codigoActual } : {} })
      setCarrito(data.data)
      setError('')
      return true
    } catch (err) {
      setError(mensajeDeError(err))
      return false
    }
  }, [])

  useEffect(() => { cargar(aplicado) }, [aplicado, cargar])

  const accion = async (peticion) => {
    try {
      await peticion
      await cargar(aplicado)
      await actualizarCarrito()
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  const aplicar = async (e) => {
    e.preventDefault()
    const limpio = codigo.trim().toUpperCase()
    if (await cargar(limpio)) {
      setAplicado(limpio)
      sessionStorage.setItem(CODIGO_GUARDADO, limpio)
    }
  }

  const quitarCodigo = () => {
    setCodigo('')
    setAplicado('')
    sessionStorage.removeItem(CODIGO_GUARDADO)
  }

  if (!carrito) return error ? <Mensaje>{error}</Mensaje> : <Cargando />

  return (
    <>
      <p className="etiqueta-seccion">Tu compra</p>
      <h1 style={{ marginBottom: 20 }}>Carrito de compras</h1>
      <Mensaje>{error}</Mensaje>
      {carrito.items.length === 0 ? (
        <Vacio>Tu carrito está vacío. <Link to="/products" className="fuerte">Ver productos</Link></Vacio>
      ) : (
        <div className="dos-columnas">
          <div>
            {carrito.items.map((item) => (
              <div key={item.id_producto} className="tarjeta item-carrito">
                <img src={item.imagen || '/favicon.svg'} alt="" />
                <div>
                  <Link to={`/products/${item.id_producto}`} className="producto-nombre">{item.nombre}</Link>
                  <p className="tenue">{[item.marca, item.peso].filter(Boolean).join(' · ')}</p>
                  {item.promocion && <p style={{ color: 'var(--exito)', fontSize: 12 }}>{item.promocion.nombre} (-{Math.round(item.promocion.porcentaje)}%)</p>}
                  {!item.disponible && <p style={{ color: 'var(--error)', fontSize: 12 }}>Stock disponible: {item.stock}</p>}
                </div>
                <Cantidad valor={item.cantidad} maximo={item.stock} onCambiar={(cantidad) => accion(api.patch(`/cart/items/${item.id_producto}`, { cantidad }))} />
                <span className="precio">{moneda(item.importe)}</span>
                <button className="btn btn-peligro btn-chico" onClick={() => accion(api.delete(`/cart/items/${item.id_producto}`))}>Eliminar</button>
              </div>
            ))}
            <form className="tarjeta acciones" onSubmit={aplicar}>
              <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder="Código de descuento" aria-label="Código de descuento" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
              <button className="btn btn-secundario">Aplicar</button>
              {aplicado && <button type="button" className="btn btn-secundario" onClick={quitarCodigo}>Quitar {aplicado}</button>}
            </form>
          </div>
          <div className="tarjeta" style={{ marginTop: 0 }}>
            <h3 style={{ marginBottom: 12 }}>Resumen</h3>
            <Resumen carrito={carrito} />
            <button className="btn btn-bloque" style={{ marginTop: 16 }} disabled={carrito.items.some((i) => !i.disponible)} onClick={() => navigate('/checkout')}>Finalizar compra</button>
            <p className="tenue" style={{ textAlign: 'center', marginTop: 10 }}>Pago con QR de Mercado Pago · Retiro en el local</p>
          </div>
        </div>
      )}
    </>
  )
}

// ===================== Checkout =====================

export function Checkout() {
  const { usuario, actualizarCarrito } = useAuth()
  const navigate = useNavigate()
  const [carrito, setCarrito] = useState(null)
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)
  // Si quedó un intento sin respuesta, solo se puede reintentar con los mismos datos.
  const [incierto, setIncierto] = useState(Boolean(operacionPendiente('compra')))
  const codigo = sessionStorage.getItem(CODIGO_GUARDADO) || ''

  useEffect(() => {
    api.get('/cart', { params: codigo ? { codigo } : {} })
      .then(({ data }) => setCarrito(data.data))
      .catch((err) => setError(mensajeDeError(err)))
  }, [codigo])

  const confirmar = async () => {
    setEnviando(true)
    setError('')
    try {
      const { data } = await ejecutarOperacion('compra', { codigo: codigo || undefined, total_esperado: carrito.total }, (body) => api.post('/orders', body))
      sessionStorage.removeItem(CODIGO_GUARDADO)
      await actualizarCarrito()
      navigate(`/orders/${data.data.id_compra}`, { replace: true })
    } catch (err) {
      setIncierto(esResultadoIncierto(err))
      setError(esResultadoIncierto(err)
        ? 'No recibimos respuesta del servidor. Reintentá: tu pedido no se va a duplicar.'
        : mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  if (!carrito) return error ? <Mensaje>{error}</Mensaje> : <Cargando />
  if (carrito.items.length === 0 && !incierto) return <Vacio>Tu carrito está vacío. <Link to="/products" className="fuerte">Ver productos</Link></Vacio>

  return (
    <>
      <p className="etiqueta-seccion">Tu compra</p>
      <h1 style={{ marginBottom: 20 }}>Confirmar pedido</h1>
      <Mensaje>{error}</Mensaje>
      <div className="dos-columnas">
        <div>
          <div className="tarjeta">
            <h3 style={{ marginBottom: 8 }}>Tus datos</h3>
            <p>{usuario.nombre} {usuario.apellido}</p>
            <p className="tenue">{usuario.email} {usuario.telefono && `· ${usuario.telefono}`}</p>
          </div>
          <div className="tarjeta">
            <h3 style={{ marginBottom: 8 }}>Entrega</h3>
            <p className="fuerte">Retiro en el local</p>
            <p className="tenue">TeaTime Store, CABA · Lunes a viernes de 8 a 17 hs, sábados de 8 a 15 hs.</p>
          </div>
          <div className="tarjeta">
            <h3 style={{ marginBottom: 8 }}>Pago</h3>
            <p className="fuerte">QR de Mercado Pago</p>
            <p className="tenue">Al confirmar verás el QR. El pedido queda pendiente hasta que el personal verifique el cobro.</p>
          </div>
        </div>
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Resumen</h3>
          {carrito.items.map((i) => (
            <div key={i.id_producto} className="resumen-linea"><span>{i.cantidad} × {i.nombre}</span><span>{moneda(i.importe)}</span></div>
          ))}
          <hr style={{ border: 0, borderTop: '1px solid var(--borde)' }} />
          <Resumen carrito={carrito} />
          <button className="btn btn-bloque" style={{ marginTop: 16 }} disabled={enviando} onClick={confirmar}>
            {enviando ? 'Procesando…' : incierto ? 'Reintentar confirmación' : 'Confirmar pedido'}
          </button>
          {incierto && (
            <button className="btn btn-secundario btn-bloque" style={{ marginTop: 8 }} onClick={() => { descartarOperacion('compra'); navigate('/orders') }}>
              Ver si el pedido ya se registró
            </button>
          )}
        </div>
      </div>
    </>
  )
}

// ===================== Pedidos =====================

export function MisPedidos() {
  const [resultado, setResultado] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/me/orders', { params: { page: pagina, limit: 10 } })
      .then(({ data }) => setResultado(data))
      .catch((err) => setError(mensajeDeError(err)))
  }, [pagina])

  return (
    <>
      <p className="etiqueta-seccion">Mi cuenta</p>
      <h1 style={{ marginBottom: 20 }}>Mis pedidos</h1>
      <Mensaje>{error}</Mensaje>
      {!resultado && !error && <Cargando />}
      {resultado?.data.length === 0 && <Vacio>Todavía no realizaste ningún pedido. <Link to="/products" className="fuerte">Ver productos</Link></Vacio>}
      {resultado?.data.length > 0 && (
        <div className="tarjeta">
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead><tr><th>Pedido</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
              <tbody>
                {resultado.data.map((p) => (
                  <tr key={p.id_compra}>
                    <td className="fuerte"><Link to={`/orders/${p.id_compra}`}>#{numeroPedido(p.id_compra)}</Link></td>
                    <td>{fecha(p.fecha)}</td>
                    <td>{moneda(p.total)}</td>
                    <td><Estado valor={p.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion datos={resultado.pagination} onCambiar={setPagina} />
        </div>
      )}
    </>
  )
}

const PASOS = [['CONFIRMADO', 'Confirmado'], ['EN_PREPARACION', 'En preparación'], ['LISTO_PARA_RETIRO', 'Listo para retirar'], ['ENTREGADO', 'Entregado']]

export function DetallePedido() {
  const { id } = useParams()
  const { actualizarCarrito } = useAuth()
  const [pedido, setPedido] = useState(null)
  const [referencia, setReferencia] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  const cargar = useCallback(() => {
    api.get(`/me/orders/${id}`).then(({ data }) => setPedido(data.data)).catch((err) => setError(mensajeDeError(err)))
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  const avisarPago = async (e) => {
    e.preventDefault()
    setError(''); setExito('')
    try {
      const { data } = await api.post(`/me/orders/${id}/payment-notice`, { referencia })
      setPedido(data.data)
      setExito('Recibimos tu aviso. El personal verificará el cobro para confirmar el pedido.')
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  const cancelar = async () => {
    if (!window.confirm('¿Querés cancelar este pedido?')) return
    setError(''); setExito('')
    try {
      const { data } = await api.post(`/me/orders/${id}/cancel`)
      setPedido(data.data)
      actualizarCarrito()
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  if (!pedido) return error ? <Mensaje>{error}</Mensaje> : <Cargando />

  const indice = PASOS.findIndex(([e]) => e === pedido.estado)

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="etiqueta-seccion" style={{ color: 'var(--tostado)' }}>Pedido realizado el {fecha(pedido.fecha)}</p>
          <h1>Pedido #{numeroPedido(pedido.id_compra)}</h1>
        </div>
        <Estado valor={pedido.estado} />
      </div>
      <Mensaje>{error}</Mensaje>
      <Mensaje tipo="exito">{exito}</Mensaje>

      {pedido.estado !== 'CANCELADO' && (
        <div className="tarjeta pasos" style={{ marginBottom: 16 }}>
          {PASOS.map(([estado, texto], i) => (
            <div key={estado} className={i <= indice ? 'paso-activo' : ''}><div className="paso-circulo">✓</div>{texto}</div>
          ))}
        </div>
      )}

      <div className="dos-columnas">
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 10 }}>Productos</h3>
          <div className="tabla-contenedor">
            <table className="tabla"><tbody>
              {pedido.detalles.map((d) => (
                <tr key={d.id_producto}>
                  <td className="fuerte">{d.producto.nombre}{d.promocion && <div className="tenue">{d.promocion.nombre}</div>}</td>
                  <td>{d.cantidad} × {moneda(d.precio_unitario)}</td>
                  <td className="derecha">{moneda(d.cantidad * d.precio_unitario)}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <div className="resumen-linea" style={{ marginTop: 10 }}><span>Subtotal</span><span>{moneda(pedido.subtotal)}</span></div>
          {pedido.descuento > 0 && <div className="resumen-linea" style={{ color: 'var(--exito)' }}><span>Descuento</span><span>- {moneda(pedido.descuento)}</span></div>}
          <div className="resumen-total"><span>{pedido.pago.estado === 'APROBADO' ? 'Total pagado' : 'Total'}</span><span>{moneda(pedido.total)}</span></div>
        </div>

        <div>
          <div className="tarjeta">
            <h3 style={{ marginBottom: 8 }}>Entrega</h3>
            <span className="badge badge-neutro">Retiro en el local</span>
            <p className="tenue" style={{ marginTop: 8 }}>TeaTime Store, CABA</p>
          </div>

          <div className="tarjeta">
            <h3 style={{ marginBottom: 8 }}>Pago</h3>
            <p style={{ marginBottom: 8 }}>QR de Mercado Pago · <Estado valor={pedido.pago.estado} /></p>
            {pedido.pago.estado === 'PENDIENTE' && pedido.estado === 'PENDIENTE_PAGO' && (
              <>
                {pedido.cobro?.qr_imagen
                  ? <img className="qr" src={pedido.cobro.qr_imagen} alt="QR de Mercado Pago del comercio" />
                  : <Mensaje tipo="aviso">El QR del comercio todavía no está configurado. Consultá el medio de pago con la tienda.</Mensaje>}
                <p className="tenue" style={{ marginBottom: 10 }}>Escaneá el QR y pagá {moneda(pedido.total)}. Tu pedido se confirma cuando el personal verifica el cobro.</p>
                <form onSubmit={avisarPago}>
                  <label htmlFor="referencia">Número de operación de Mercado Pago</label>
                  <input id="referencia" className="input" required value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder={pedido.pago.referencia_externa || ''} />
                  <button className="btn btn-secundario btn-bloque" style={{ marginTop: 8 }}>Ya pagué, avisar a la tienda</button>
                </form>
                {pedido.pago.referencia_externa && <p className="tenue" style={{ marginTop: 8 }}>Operación informada: {pedido.pago.referencia_externa}</p>}
                <button className="btn btn-peligro btn-bloque" style={{ marginTop: 8 }} onClick={cancelar}>Cancelar pedido</button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
