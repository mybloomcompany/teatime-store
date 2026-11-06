import { useCallback, useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { fecha, fechaHora, METODOS_PAGO, moneda, numeroPedido, numeroVenta } from '../../utils/formato'
import { Cargando, Estado, Mensaje, Paginacion, Vacio } from '../General'
import { SesionPorId, Ticket } from '../General/DetalleOperaciones'
import PanelStock from '../General/PanelStock'

export const Stock = () => <PanelStock />

// ===================== Pedidos =====================

const SIGUIENTE = {
  CONFIRMADO: ['EN_PREPARACION', 'Pasar a preparación'],
  EN_PREPARACION: ['LISTO_PARA_RETIRO', 'Marcar listo para retirar'],
  LISTO_PARA_RETIRO: ['ENTREGADO', 'Marcar como entregado']
}

export function Pedidos() {
  const [params] = useSearchParams()
  const [resultado, setResultado] = useState(null)
  const [filtros, setFiltros] = useState({ search: '', estado: params.get('estado') || '', page: 1 })
  const [error, setError] = useState('')

  useEffect(() => {
    const consulta = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))
    api.get('/orders', { params: consulta }).then(({ data }) => setResultado(data)).catch((err) => setError(mensajeDeError(err)))
  }, [filtros])

  return (
    <>
      <div className="encabezado"><div><p className="etiqueta-seccion">Operación Ecommerce</p><h1>Pedidos</h1></div></div>
      <Mensaje>{error}</Mensaje>
      <div className="tarjeta">
        <form className="filtros" onSubmit={(e) => { e.preventDefault(); setFiltros({ ...filtros, search: e.target.buscar.value, page: 1 }) }}>
          <input name="buscar" className="input" placeholder="Buscar por cliente" aria-label="Buscar" />
          <select className="input" aria-label="Estado" value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value, page: 1 })}>
            <option value="">Todos los estados</option>
            <option value="PENDIENTE_PAGO">Pendiente de pago</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="EN_PREPARACION">En preparación</option>
            <option value="LISTO_PARA_RETIRO">Listo para retirar</option>
            <option value="ENTREGADO">Entregado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
          <button className="btn">Filtrar</button>
        </form>
        {!resultado ? <Cargando /> : resultado.data.length === 0 ? <Vacio>No hay pedidos con esos criterios.</Vacio> : (
          <>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead><tr><th>Pedido</th><th>Cliente</th><th>Fecha</th><th>Total</th><th>Pago</th><th>Estado</th></tr></thead>
                <tbody>
                  {resultado.data.map((p) => (
                    <tr key={p.id_compra}>
                      <td className="fuerte"><Link to={`/admin/orders/${p.id_compra}`}>#{numeroPedido(p.id_compra)}</Link></td>
                      <td>{p.cliente?.nombre} {p.cliente?.apellido}</td>
                      <td>{fechaHora(p.fecha)}</td>
                      <td>{moneda(p.total)}</td>
                      <td><Estado valor={p.pago?.estado} /></td>
                      <td><Estado valor={p.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion datos={resultado.pagination} onCambiar={(page) => setFiltros({ ...filtros, page })} />
          </>
        )}
      </div>
    </>
  )
}

export function PedidoAdmin() {
  const { id } = useParams()
  const [pedido, setPedido] = useState(null)
  const [referencia, setReferencia] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/orders/${id}`).then(({ data }) => setPedido(data.data)).catch((err) => setError(mensajeDeError(err)))
  }, [id])

  const accion = async (peticion, confirmacion) => {
    if (confirmacion && !window.confirm(confirmacion)) return
    setError('')
    try {
      const { data } = await peticion()
      setPedido(data.data)
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  if (!pedido) return error ? <Mensaje>{error}</Mensaje> : <Cargando />

  const siguiente = SIGUIENTE[pedido.estado]
  const pendiente = pedido.estado === 'PENDIENTE_PAGO'

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="etiqueta-seccion">Pedidos / {fecha(pedido.fecha)}</p>
          <h1>Pedido #{numeroPedido(pedido.id_compra)}</h1>
        </div>
        <div className="acciones no-imprimir">
          <Estado valor={pedido.estado} />
          <button className="btn btn-secundario btn-chico" onClick={() => window.print()}>Imprimir</button>
        </div>
      </div>
      <Mensaje>{error}</Mensaje>
      <div className="dos-columnas">
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 10 }}>Detalle del pedido</h3>
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
          <div className="resumen-total"><span>Total</span><span>{moneda(pedido.total)}</span></div>
        </div>
        <div>
          <div className="tarjeta">
            <h3 style={{ marginBottom: 8 }}>Cliente</h3>
            <p className="fuerte">{pedido.cliente.nombre} {pedido.cliente.apellido}</p>
            <p className="tenue">{pedido.cliente.email}</p>
            <p className="tenue">{pedido.cliente.telefono}</p>
            <p style={{ marginTop: 8 }}><span className="badge badge-neutro">Retiro en el local</span></p>
          </div>
          <div className="tarjeta no-imprimir">
            <h3 style={{ marginBottom: 8 }}>Pago</h3>
            <div className="resumen-linea"><span>{METODOS_PAGO[pedido.pago.metodo]}</span><Estado valor={pedido.pago.estado} /></div>
            {pedido.pago.referencia_externa && <div className="resumen-linea"><span>Operación</span><span className="fuerte">{pedido.pago.referencia_externa}</span></div>}
            {pedido.pago.fecha_confirmacion && <div className="resumen-linea"><span>Confirmado</span><span>{fechaHora(pedido.pago.fecha_confirmacion)}</span></div>}
            {pendiente && (
              <>
                <Mensaje tipo="aviso">Confirmá solo después de verificar la acreditación en Mercado Pago.</Mensaje>
                <div className="campo">
                  <label htmlFor="referencia">Número de operación (opcional)</label>
                  <input id="referencia" className="input" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
                </div>
                <button className="btn btn-bloque" onClick={() => accion(() => api.post(`/orders/${id}/payment/confirm`, { referencia: referencia || undefined }), `¿Confirmás que recibiste ${moneda(pedido.total)}?`)}>Confirmar pago recibido</button>
                <button className="btn btn-peligro btn-bloque" style={{ marginTop: 8 }} onClick={() => accion(() => api.post(`/orders/${id}/payment/reject`), 'Se cancelará el pedido y se repondrá el stock. ¿Continuar?')}>Rechazar pago</button>
              </>
            )}
          </div>
          {!pendiente && !['ENTREGADO', 'CANCELADO'].includes(pedido.estado) && (
            <div className="tarjeta no-imprimir">
              <h3 style={{ marginBottom: 8 }}>Estado</h3>
              {siguiente && <button className="btn btn-bloque" onClick={() => accion(() => api.patch(`/orders/${id}/status`, { estado: siguiente[0] }))}>{siguiente[1]}</button>}
              <button className="btn btn-peligro btn-bloque" style={{ marginTop: 8 }} onClick={() => accion(() => api.patch(`/orders/${id}/status`, { estado: 'CANCELADO' }), 'Se cancelará el pedido y se repondrá el stock. La devolución del dinero se gestiona aparte. ¿Continuar?')}>Cancelar pedido</button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ===================== Ventas de ambos canales =====================

export function Ventas() {
  const [resultado, setResultado] = useState(null)
  const [filtros, setFiltros] = useState({ channel: '', metodo: '', estado: '', from: '', to: '', page: 1 })
  const [error, setError] = useState('')

  useEffect(() => {
    const consulta = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))
    api.get('/sales', { params: consulta }).then(({ data }) => setResultado(data)).catch((err) => setError(mensajeDeError(err)))
  }, [filtros])

  const cambiar = (e) => setFiltros({ ...filtros, [e.target.name]: e.target.value, page: 1 })

  return (
    <>
      <div className="encabezado"><div><p className="etiqueta-seccion">Canales online y POS</p><h1>Ventas</h1></div></div>
      <Mensaje>{error}</Mensaje>
      <div className="tarjeta">
        <div className="filtros">
          <select name="channel" className="input" aria-label="Canal" value={filtros.channel} onChange={cambiar}>
            <option value="">Todos los canales</option>
            <option value="ONLINE">Tienda online</option>
            <option value="POS">POS</option>
          </select>
          <select name="metodo" className="input" aria-label="Método" value={filtros.metodo} onChange={cambiar}>
            <option value="">Todos los métodos</option>
            {Object.entries(METODOS_PAGO).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          <div><label htmlFor="from">Desde</label><input id="from" name="from" type="date" className="input" value={filtros.from} onChange={cambiar} /></div>
          <div><label htmlFor="to">Hasta</label><input id="to" name="to" type="date" className="input" value={filtros.to} onChange={cambiar} /></div>
        </div>
        {!resultado ? <Cargando /> : resultado.data.length === 0 ? <Vacio>No hay ventas con esos criterios.</Vacio> : (
          <>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead><tr><th>Operación</th><th>Canal</th><th>Persona</th><th>Fecha</th><th>Método</th><th>Total</th><th>Estado</th></tr></thead>
                <tbody>
                  {resultado.data.map((v) => (
                    <tr key={`${v.canal}-${v.id}`}>
                      <td className="fuerte">
                        {v.canal === 'POS'
                          ? <Link to={`/admin/sales/pos/${v.id}`}>{numeroVenta(v.id)}</Link>
                          : <Link to={`/admin/orders/${v.id}`}>#{numeroPedido(v.id)}</Link>}
                      </td>
                      <td>{v.canal === 'POS' ? 'POS' : 'Tienda online'}</td>
                      <td>{v.persona}</td>
                      <td>{fechaHora(v.fecha)}</td>
                      <td>{METODOS_PAGO[v.metodo]}</td>
                      <td>{moneda(v.total)}</td>
                      <td><Estado valor={v.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion datos={resultado.pagination} onCambiar={(page) => setFiltros({ ...filtros, page })} />
          </>
        )}
      </div>
    </>
  )
}

export function DetalleVentaAdmin() {
  const { id } = useParams()
  const [venta, setVenta] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/pos/sales/${id}/ticket`).then(({ data }) => setVenta(data.data)).catch((err) => setError(mensajeDeError(err)))
  }, [id])

  if (!venta) return error ? <Mensaje>{error}</Mensaje> : <Cargando />

  return (
    <>
      <div className="encabezado"><div><p className="etiqueta-seccion">Ventas / POS</p><h1>Venta {numeroVenta(venta.id_venta)}</h1></div></div>
      <Ticket venta={venta}>
        <p className="tenue" style={{ marginTop: 12 }}>Las anulaciones las realiza el vendedor desde el POS.</p>
      </Ticket>
    </>
  )
}

// ===================== Cajas y sesiones =====================

export function Cajas() {
  const [cajas, setCajas] = useState(null)
  const [sesiones, setSesiones] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([api.get('/pos/registers'), api.get('/pos/sessions', { params: { page: pagina } })])
      setCajas(c.data.data)
      setSesiones(s.data)
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }, [pagina])

  useEffect(() => { cargar() }, [cargar])

  const crear = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post('/pos/registers', { nombre })
      setNombre('')
      cargar()
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  const alternar = async (caja) => {
    setError('')
    try {
      await api.patch(`/pos/registers/${caja.id_caja}`, { activa: !caja.activa })
      cargar()
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  return (
    <>
      <div className="encabezado"><div><p className="etiqueta-seccion">Punto de venta</p><h1>Cajas y sesiones</h1></div></div>
      <Mensaje>{error}</Mensaje>
      <div className="dos-columnas" style={{ gridTemplateColumns: 'minmax(280px, 1fr) minmax(0, 2fr)' }}>
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 10 }}>Cajas</h3>
          <form className="acciones" style={{ marginBottom: 12 }} onSubmit={crear}>
            <input className="input" style={{ flex: 1 }} placeholder="Nombre de la caja" aria-label="Nombre de la caja" required value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <button className="btn">Crear</button>
          </form>
          {!cajas ? <Cargando /> : cajas.map((c) => (
            <div key={c.id_caja} className="resumen-linea" style={{ alignItems: 'center' }}>
              <div>
                <p className="fuerte">{c.nombre}</p>
                <p className="tenue">{c.sesiones?.[0] ? `Abierta por ${c.sesiones[0].vendedor?.nombre}` : c.activa ? 'Disponible' : 'Inactiva'}</p>
              </div>
              <button className="btn btn-secundario btn-chico" onClick={() => alternar(c)}>{c.activa ? 'Desactivar' : 'Activar'}</button>
            </div>
          ))}
        </div>
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 10 }}>Historial de sesiones</h3>
          {!sesiones ? <Cargando /> : sesiones.data.length === 0 ? <Vacio>Todavía no hay sesiones.</Vacio> : (
            <>
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead><tr><th>Sesión</th><th>Caja</th><th>Vendedor</th><th>Apertura</th><th>Diferencia</th><th>Estado</th></tr></thead>
                  <tbody>
                    {sesiones.data.map((s) => (
                      <tr key={s.id_sesion}>
                        <td className="fuerte"><Link to={`/admin/registers/sessions/${s.id_sesion}`}>#{s.id_sesion}</Link></td>
                        <td>{s.caja?.nombre}</td>
                        <td>{s.vendedor?.nombre} {s.vendedor?.apellido}</td>
                        <td>{fechaHora(s.fecha_apertura)}</td>
                        <td>{s.diferencia != null ? moneda(s.diferencia) : '—'}</td>
                        <td><Estado valor={s.estado} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginacion datos={sesiones.pagination} onCambiar={setPagina} />
            </>
          )}
        </div>
      </div>
    </>
  )
}

export function DetalleSesionAdmin() {
  const { id } = useParams()
  return <SesionPorId id={id} rutaVenta={(v) => `/admin/sales/pos/${v}`} />
}
