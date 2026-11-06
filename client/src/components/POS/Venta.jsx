import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { moneda } from '../../utils/formato'
import { Cantidad, Cargando, Estado, Icono, Mensaje, Modal, Paginacion, Vacio } from '../General'
import { leerTicket, guardarTicket, TICKET_VACIO } from './ticket'

function Venta() {
  const navigate = useNavigate()
  const [productos, setProductos] = useState(null)
  const [paginacion, setPaginacion] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [filtro, setFiltro] = useState({ search: '', category: '', promo: '', page: 1 })
  const [busqueda, setBusqueda] = useState('')
  const [ticket, setTicket] = useState(leerTicket)
  const [calculo, setCalculo] = useState(null)
  const [modal, setModal] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategorias(data.data)).catch((err) => setError(mensajeDeError(err)))
  }, [])

  useEffect(() => {
    const params = { limit: 12, page: filtro.page, ...(filtro.search && { search: filtro.search }), ...(filtro.category && { category: filtro.category }), ...(filtro.promo && { promo: 1 }) }
    api.get('/products', { params })
      .then(({ data }) => { setProductos(data.data); setPaginacion(data.pagination) })
      .catch((err) => setError(mensajeDeError(err)))
  }, [filtro])

  // El servidor calcula el ticket: es la misma regla que se usa al registrar la venta.
  useEffect(() => {
    guardarTicket(ticket)
    if (!ticket.items.length) { setCalculo(null); return }
    api.post('/pos/quote', {
      items: ticket.items.map(({ id_producto, cantidad }) => ({ id_producto, cantidad })),
      codigo: ticket.codigo || undefined,
      descuento_porcentaje: ticket.descuento_porcentaje
    })
      .then(({ data }) => { setCalculo(data.data); setError('') })
      .catch((err) => {
        setError(mensajeDeError(err))
        if (ticket.codigo) setTicket((t) => ({ ...t, codigo: '' }))
      })
  }, [ticket])

  const agregar = (producto) => {
    const existente = ticket.items.find((i) => i.id_producto === producto.id_producto)
    if ((existente?.cantidad || 0) >= producto.stock) return setError(`Solo hay ${producto.stock} unidades de ${producto.nombre}`)
    setError('')
    setTicket({
      ...ticket,
      items: existente
        ? ticket.items.map((i) => (i === existente ? { ...i, cantidad: i.cantidad + 1 } : i))
        : [...ticket.items, { id_producto: producto.id_producto, cantidad: 1, stock: producto.stock }]
    })
  }

  const cambiarCantidad = (id, cantidad) => setTicket({ ...ticket, items: ticket.items.map((i) => (i.id_producto === id ? { ...i, cantidad } : i)) })
  const quitar = (id) => setTicket({ ...ticket, items: ticket.items.filter((i) => i.id_producto !== id) })

  const buscar = async (e) => {
    e.preventDefault()
    const texto = busqueda.trim()
    // Con un lector de códigos, un SKU exacto se agrega directo al ticket.
    if (texto) {
      const { data } = await api.get('/products', { params: { search: texto, limit: 5 } })
      const exacto = data.data.find((p) => p.sku.toLowerCase() === texto.toLowerCase())
      if (exacto && exacto.stock > 0) { agregar(exacto); setBusqueda(''); return }
    }
    setFiltro({ ...filtro, search: texto, page: 1 })
  }

  return (
    <div className="pos-venta">
      <div>
        <form className="acciones" style={{ marginBottom: 14 }} onSubmit={buscar}>
          <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Nombre, SKU o código de barras..." aria-label="Buscar producto" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <button className="btn btn-secundario">Buscar</button>
        </form>
        <div className="chips">
          <button className={`chip ${!filtro.category && !filtro.promo ? 'chip-activo' : ''}`} onClick={() => setFiltro({ ...filtro, category: '', promo: '', page: 1 })}>Todos</button>
          {categorias.map((c) => (
            <button key={c.id_categoria} className={`chip ${filtro.category === c.id_categoria ? 'chip-activo' : ''}`} onClick={() => setFiltro({ ...filtro, category: c.id_categoria, promo: '', page: 1 })}>{c.nombre}</button>
          ))}
          <button className={`chip ${filtro.promo ? 'chip-activo' : ''}`} onClick={() => setFiltro({ ...filtro, promo: '1', category: '', page: 1 })}>Promociones</button>
        </div>

        {!productos ? <Cargando /> : productos.length === 0 ? <Vacio>No se encontraron productos.</Vacio> : (
          <div className="grilla-pos">
            {productos.map((p) => {
              const enTicket = ticket.items.some((i) => i.id_producto === p.id_producto)
              const stockBajo = p.stock > 0 && p.stock <= p.stock_minimo
              return (
                <article key={p.id_producto} className="tarjeta-pos">
                  <img className="producto-imagen" src={p.imagen || '/favicon.svg'} alt="" loading="lazy" />
                  <h4>{p.nombre}</h4>
                  <p className="tenue">{[p.peso, `SKU ${p.sku}`].filter(Boolean).join(' · ')}</p>
                  <div className="resumen-linea" style={{ alignItems: 'center' }}>
                    <span className="precio" style={{ fontSize: 14 }}>{moneda(p.precio_unitario)}</span>
                    {p.stock === 0
                      ? <Estado valor="AGOTADO" />
                      : <span style={{ fontSize: 11, color: stockBajo ? 'var(--aviso)' : 'var(--exito)' }}>{stockBajo ? `Últimas ${p.stock}` : `${p.stock} disp.`}</span>}
                  </div>
                  <button className={`btn btn-chico ${enTicket ? 'btn-secundario' : 'btn-tostado'}`} disabled={p.stock === 0} onClick={() => agregar(p)}>
                    {p.stock === 0 ? 'No disponible' : enTicket ? '+ Sumar otro' : '+ Agregar'}
                  </button>
                </article>
              )
            })}
          </div>
        )}
        <Paginacion datos={paginacion} onCambiar={(page) => setFiltro({ ...filtro, page })} />
      </div>

      <aside>
        <div className="tarjeta">
          <div className="encabezado" style={{ alignItems: 'center', marginBottom: 8 }}>
            <h2>Ticket</h2>
            <span className="badge badge-info">{ticket.items.length ? 'Venta en curso' : 'Sin productos'}</span>
          </div>
          <Mensaje>{error}</Mensaje>
          {!ticket.items.length && <Vacio>Agregá productos para iniciar la venta.</Vacio>}
          {calculo?.lineas.map((l) => (
            <div key={l.id_producto} className="linea-ticket">
              <div>
                <p className="fuerte">{l.nombre}</p>
                <p className="tenue">{moneda(l.precio_unitario)} c/u</p>
                {l.promocion && <p style={{ color: 'var(--exito)', fontSize: 11, fontWeight: 600 }}>{l.promocion.nombre} -{Math.round(l.promocion.porcentaje)}%</p>}
              </div>
              <Cantidad valor={l.cantidad} maximo={l.stock} onCambiar={(c) => cambiarCantidad(l.id_producto, c)} />
              <span className="fuerte">{moneda(l.importe)}</span>
              <button className="btn btn-icono btn-chico" style={{ background: '#fee2e2', color: 'var(--error)' }} aria-label={`Quitar ${l.nombre}`} onClick={() => quitar(l.id_producto)}><Icono nombre="basura" tam={15} /></button>
            </div>
          ))}
          {ticket.items.length > 0 && (
            <div className="acciones" style={{ marginTop: 12 }}>
              <button className="btn btn-secundario btn-chico" onClick={() => setModal('nota')}>{ticket.nota ? 'Editar nota' : 'Agregar nota'}</button>
              <button className="btn btn-secundario btn-chico" onClick={() => setModal('descuento')}>Descuento</button>
              <button className="btn btn-peligro btn-chico" onClick={() => setTicket(TICKET_VACIO)}>Vaciar ticket</button>
            </div>
          )}
        </div>

        <div className="tarjeta">
          <h3 style={{ marginBottom: 10 }}>Resumen</h3>
          <div className="resumen-linea"><span>Subtotal</span><span className="fuerte">{moneda(calculo?.subtotal)}</span></div>
          {calculo?.descuento_promociones > 0 && <div className="resumen-linea" style={{ color: 'var(--exito)' }}><span>Promociones{ticket.codigo ? ` (${ticket.codigo})` : ''}</span><span>- {moneda(calculo.descuento_promociones)}</span></div>}
          {calculo?.descuento_manual > 0 && <div className="resumen-linea" style={{ color: 'var(--exito)' }}><span>Descuento ({ticket.descuento_porcentaje}%)</span><span>- {moneda(calculo.descuento_manual)}</span></div>}
          <div className="resumen-total"><span>TOTAL</span><span>{moneda(calculo?.total)}</span></div>
          <button className="btn btn-tostado btn-bloque" style={{ marginTop: 14 }} disabled={!calculo?.lineas.length} onClick={() => navigate('/pos/payment')}>
            Cobrar {moneda(calculo?.total)}
          </button>
        </div>
      </aside>

      {modal === 'nota' && (
        <Modal titulo="Nota del ticket" onCerrar={() => setModal(null)}>
          <form onSubmit={(e) => { e.preventDefault(); setTicket({ ...ticket, nota: e.target.nota.value }); setModal(null) }}>
            <textarea name="nota" className="input" aria-label="Nota" defaultValue={ticket.nota} />
            <button className="btn" style={{ marginTop: 10 }}>Guardar</button>
          </form>
        </Modal>
      )}
      {modal === 'descuento' && (
        <Modal titulo="Descuentos permitidos" onCerrar={() => setModal(null)}>
          <form onSubmit={(e) => {
            e.preventDefault()
            setTicket({ ...ticket, descuento_porcentaje: Number(e.target.porcentaje.value) || 0, codigo: e.target.codigo.value.trim().toUpperCase() })
            setModal(null)
          }}>
            <div className="campo">
              <label htmlFor="porcentaje">Descuento manual (máximo 10%)</label>
              <input id="porcentaje" name="porcentaje" type="number" min="0" max="10" step="0.5" className="input" defaultValue={ticket.descuento_porcentaje} />
            </div>
            <div className="campo">
              <label htmlFor="codigo">Código promocional</label>
              <input id="codigo" name="codigo" className="input" defaultValue={ticket.codigo} />
            </div>
            <button className="btn">Aplicar</button>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default Venta
