import { useCallback, useEffect, useState } from 'react'
import api, { mensajeDeError } from '../../api/axios'
import { fechaHora, TIPOS_MOVIMIENTO } from '../../utils/formato'
import { descartarOperacion, ejecutarOperacion, esResultadoIncierto } from '../../utils/operacion'
import { Cargando, Estado, Mensaje, Modal, Paginacion, Vacio } from './Comunes'

const ACCIONES = {
  entry: ['Ingreso de mercadería', 'Cantidad que ingresa'],
  exit: ['Egreso de mercadería', 'Cantidad que sale'],
  adjustment: ['Ajuste por conteo', 'Stock contado'],
  loss: ['Pérdida', 'Cantidad perdida'],
  damaged: ['Producto dañado', 'Cantidad dañada']
}

function FormularioMovimiento({ productoInicial, onCerrar, onGuardado }) {
  const [productos, setProductos] = useState([])
  const [form, setForm] = useState({ accion: 'entry', id_producto: productoInicial || '', cantidad: '', observacion: '' })
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    api.get('/stock?limit=200').then(({ data }) => setProductos(data.data)).catch((err) => setError(mensajeDeError(err)))
  }, [])

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const enviar = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError('')
    const { accion, ...datos } = form
    try {
      await ejecutarOperacion('movimiento', datos, (body) => api.post(`/stock/${accion}`, body))
      onGuardado()
    } catch (err) {
      setError(esResultadoIncierto(err) ? 'Sin respuesta del servidor. Reintentá: el movimiento no se va a duplicar.' : mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  const cerrar = () => { descartarOperacion('movimiento'); onCerrar() }

  return (
    <Modal titulo="Registrar movimiento" onCerrar={cerrar}>
      <form onSubmit={enviar}>
        <Mensaje>{error}</Mensaje>
        <div className="campo">
          <label htmlFor="accion">Tipo de movimiento</label>
          <select id="accion" name="accion" className="input" value={form.accion} onChange={cambiar}>
            {Object.entries(ACCIONES).map(([valor, [texto]]) => <option key={valor} value={valor}>{texto}</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="id_producto">Producto</label>
          <select id="id_producto" name="id_producto" className="input" required value={form.id_producto} onChange={cambiar}>
            <option value="">Seleccionar…</option>
            {productos.map((p) => <option key={p.id_producto} value={p.id_producto}>{p.sku} · {p.nombre} (stock {p.stock})</option>)}
          </select>
        </div>
        <div className="campo">
          <label htmlFor="cantidad">{ACCIONES[form.accion][1]}</label>
          <input id="cantidad" name="cantidad" type="number" min={form.accion === 'adjustment' ? 0 : 1} step="1" className="input" required value={form.cantidad} onChange={cambiar} />
        </div>
        <div className="campo">
          <label htmlFor="observacion">Motivo{form.accion === 'entry' ? ' (opcional)' : ''}</label>
          <textarea id="observacion" name="observacion" className="input" required={form.accion !== 'entry'} value={form.observacion} onChange={cambiar} />
        </div>
        <div className="acciones">
          <button className="btn" disabled={enviando}>{enviando ? 'Guardando…' : 'Registrar'}</button>
          <button type="button" className="btn btn-secundario" onClick={cerrar}>Cancelar</button>
        </div>
      </form>
    </Modal>
  )
}

function PanelStock() {
  const [vista, setVista] = useState('stock')
  const [resumen, setResumen] = useState(null)
  const [stock, setStock] = useState(null)
  const [movimientos, setMovimientos] = useState(null)
  const [filtros, setFiltros] = useState({ search: '', estado: '', page: 1 })
  const [paginaMov, setPaginaMov] = useState(1)
  const [modal, setModal] = useState(null)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    try {
      const [r, s, m] = await Promise.all([
        api.get('/stock/summary'),
        api.get('/stock', { params: filtros }),
        api.get('/stock/movements', { params: { page: paginaMov } })
      ])
      setResumen(r.data.data)
      setStock(s.data)
      setMovimientos(m.data)
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }, [filtros, paginaMov])

  useEffect(() => { cargar() }, [cargar])

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="etiqueta-seccion">Inventario</p>
          <h1>Stock y movimientos</h1>
        </div>
        <button className="btn" onClick={() => setModal({})}>+ Registrar movimiento</button>
      </div>
      <Mensaje>{error}</Mensaje>
      {resumen && (
        <div className="kpis">
          <div className="kpi"><div className="kpi-titulo">Existencias totales</div><div className="kpi-valor">{resumen.existencias} u.</div></div>
          <div className="kpi"><div className="kpi-titulo">Entradas del mes</div><div className="kpi-valor">{resumen.entradas} u.</div></div>
          <div className="kpi"><div className="kpi-titulo">Salidas del mes</div><div className="kpi-valor">{resumen.salidas} u.</div></div>
          <div className="kpi"><div className="kpi-titulo">Stock crítico</div><div className="kpi-valor">{resumen.criticos} SKU</div>{resumen.criticos > 0 && <span className="badge badge-error">Requiere atención</span>}</div>
        </div>
      )}
      <div className="tarjeta">
        <div className="chips" style={{ marginBottom: 14 }}>
          <button className={`chip ${vista === 'stock' ? 'chip-activo' : ''}`} onClick={() => setVista('stock')}>Stock actual</button>
          <button className={`chip ${vista === 'movimientos' ? 'chip-activo' : ''}`} onClick={() => setVista('movimientos')}>Historial de movimientos</button>
        </div>

        {vista === 'stock' && (
          <>
            <form className="filtros" onSubmit={(e) => { e.preventDefault(); setFiltros({ ...filtros, search: e.target.buscar.value, page: 1 }) }}>
              <input name="buscar" className="input" placeholder="Buscar por producto o SKU" aria-label="Buscar" defaultValue={filtros.search} />
              <select className="input" aria-label="Estado" value={filtros.estado} onChange={(e) => setFiltros({ ...filtros, estado: e.target.value, page: 1 })}>
                <option value="">Todos los estados</option>
                <option value="bajo">Stock bajo</option>
                <option value="agotado">Agotados</option>
              </select>
              <button className="btn btn-secundario">Filtrar</button>
            </form>
            {!stock ? <Cargando /> : stock.data.length === 0 ? <Vacio>No hay productos con esos criterios.</Vacio> : (
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead><tr><th>Producto</th><th>Stock</th><th>Mínimo</th><th>Entradas mes</th><th>Salidas mes</th><th>Estado</th><th></th></tr></thead>
                  <tbody>
                    {stock.data.map((p) => (
                      <tr key={p.id_producto}>
                        <td className="fuerte">{p.sku} · {p.nombre}</td>
                        <td>{p.stock} u.</td>
                        <td>{p.stock_minimo} u.</td>
                        <td>+{p.entradas_mes}</td>
                        <td>-{p.salidas_mes}</td>
                        <td><Estado valor={p.estado} /></td>
                        <td className="derecha"><button className="btn btn-secundario btn-chico" onClick={() => setModal({ producto: p.id_producto })}>Movimiento</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Paginacion datos={stock?.pagination} onCambiar={(page) => setFiltros({ ...filtros, page })} />
          </>
        )}

        {vista === 'movimientos' && (
          !movimientos ? <Cargando /> : movimientos.data.length === 0 ? <Vacio>Todavía no hay movimientos.</Vacio> : (
            <>
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Saldo</th><th>Usuario</th><th>Detalle</th></tr></thead>
                  <tbody>
                    {movimientos.data.map((m) => (
                      <tr key={m.id_movimiento}>
                        <td>{fechaHora(m.fecha)}</td>
                        <td className="fuerte">{m.producto?.nombre}</td>
                        <td>{TIPOS_MOVIMIENTO[m.tipo] || m.tipo}</td>
                        <td style={{ color: m.cantidad > 0 ? 'var(--exito)' : 'var(--error)', fontWeight: 600 }}>{m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}</td>
                        <td>{m.stock_resultante}</td>
                        <td>{m.usuario?.nombre} {m.usuario?.apellido}</td>
                        <td className="tenue">{m.observacion || (m.id_venta && `Venta #${m.id_venta}`) || (m.id_compra && `Pedido #${m.id_compra}`) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Paginacion datos={movimientos.pagination} onCambiar={setPaginaMov} />
            </>
          )
        )}
      </div>

      {modal && <FormularioMovimiento productoInicial={modal.producto} onCerrar={() => setModal(null)} onGuardado={() => { setModal(null); cargar() }} />}
    </>
  )
}

export default PanelStock
