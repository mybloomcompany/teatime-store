import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { fechaHora, METODOS_PAGO, moneda, numeroVenta } from '../../utils/formato'
import { descartarOperacion, ejecutarOperacion, esResultadoIncierto } from '../../utils/operacion'
import { Cargando, Estado, Mensaje, Modal, Paginacion, Vacio } from '../General'
import { ResumenSesion, SesionPorId, Ticket } from '../General/DetalleOperaciones'
import PanelStock from '../General/PanelStock'

// ===================== Apertura de caja =====================

export function AperturaCaja() {
  const { sesion, recargarSesion } = useOutletContext()
  const navigate = useNavigate()
  const [cajas, setCajas] = useState(null)
  const [idCaja, setIdCaja] = useState('')
  const [monto, setMonto] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/pos/registers').then(({ data }) => setCajas(data.data)).catch((err) => setError(mensajeDeError(err)))
  }, [])

  if (sesion) return <Navigate to="/pos" replace />

  const abrir = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post(`/pos/registers/${idCaja}/open`, { monto_inicial: monto })
      await recargarSesion()
      navigate('/pos')
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  return (
    <form className="tarjeta formulario-cuenta" onSubmit={abrir}>
      <h1 style={{ marginBottom: 6 }}>Apertura de caja</h1>
      <p className="tenue" style={{ marginBottom: 16 }}>Debés abrir una caja para registrar ventas.</p>
      <Mensaje>{error}</Mensaje>
      <div className="campo">
        <label htmlFor="caja">Caja</label>
        <select id="caja" className="input" required value={idCaja} onChange={(e) => setIdCaja(e.target.value)}>
          <option value="">Seleccionar…</option>
          {cajas?.map((c) => {
            const ocupada = c.sesiones?.[0]
            return <option key={c.id_caja} value={c.id_caja} disabled={Boolean(ocupada)}>{c.nombre}{ocupada ? ` (abierta por ${ocupada.vendedor?.nombre})` : ''}</option>
          })}
        </select>
      </div>
      <div className="campo">
        <label htmlFor="monto">Efectivo inicial</label>
        <input id="monto" type="number" min="0" step="0.01" className="input" required value={monto} onChange={(e) => setMonto(e.target.value)} />
      </div>
      <button className="btn btn-bloque">Abrir caja</button>
    </form>
  )
}

// ===================== Ticket =====================

export function TicketVenta() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { recargarSesion } = useOutletContext()
  const [venta, setVenta] = useState(null)
  const [error, setError] = useState('')
  const [anulando, setAnulando] = useState(false)
  const esNueva = params.get('nueva') === '1'

  useEffect(() => {
    api.get(`/pos/sales/${id}/ticket`).then(({ data }) => setVenta(data.data)).catch((err) => setError(mensajeDeError(err)))
  }, [id])

  const anular = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const { data } = await api.post(`/pos/sales/${id}/cancel`, { motivo: e.target.motivo.value })
      setVenta(data.data)
      setAnulando(false)
      recargarSesion()
    } catch (err) {
      setError(mensajeDeError(err))
      setAnulando(false)
    }
  }

  if (!venta) return error ? <Mensaje>{error}</Mensaje> : <Cargando />

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="etiqueta-seccion">{esNueva && venta.estado === 'COMPLETADA' ? 'Venta completada' : 'Detalle de venta'}</p>
          <h1>Venta {numeroVenta(venta.id_venta)}</h1>
        </div>
      </div>
      {esNueva && venta.estado === 'COMPLETADA' && <Mensaje tipo="exito">El cobro fue registrado correctamente.</Mensaje>}
      <Mensaje>{error}</Mensaje>
      <Ticket venta={venta}>
        <div className="no-imprimir" style={{ marginTop: 14 }}>
          <button className="btn btn-bloque" onClick={() => window.print()}>Imprimir ticket</button>
          <Link to="/pos" className="btn btn-secundario btn-bloque" style={{ marginTop: 8 }}>+ Nueva venta</Link>
          {venta.estado === 'COMPLETADA' && venta.sesion?.estado === 'ABIERTA' && (
            <button className="btn btn-peligro btn-bloque" style={{ marginTop: 8 }} onClick={() => setAnulando(true)}>Anular venta</button>
          )}
        </div>
      </Ticket>
      {anulando && (
        <Modal titulo={`Anular venta ${numeroVenta(venta.id_venta)}`} onCerrar={() => setAnulando(false)}>
          <form onSubmit={anular}>
            <p style={{ marginBottom: 10 }}>Se repondrá el stock y, si fue en efectivo, se descontará de la caja.</p>
            <div className="campo">
              <label htmlFor="motivo">Motivo</label>
              <input id="motivo" name="motivo" className="input" required />
            </div>
            <div className="acciones">
              <button className="btn btn-peligro">Confirmar anulación</button>
              <button type="button" className="btn btn-secundario" onClick={() => setAnulando(false)}>Volver</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

// ===================== Historial de ventas =====================

export function HistorialVentas() {
  const [resultado, setResultado] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [estado, setEstado] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/pos/sales', { params: { page: pagina, ...(estado && { estado }) } })
      .then(({ data }) => setResultado(data))
      .catch((err) => setError(mensajeDeError(err)))
  }, [pagina, estado])

  return (
    <>
      <div className="encabezado">
        <div><p className="etiqueta-seccion">Punto de venta</p><h1>Historial de ventas</h1></div>
        <select className="input" style={{ width: 'auto' }} aria-label="Estado" value={estado} onChange={(e) => { setEstado(e.target.value); setPagina(1) }}>
          <option value="">Todas</option>
          <option value="COMPLETADA">Cobradas</option>
          <option value="ANULADA">Anuladas</option>
        </select>
      </div>
      <Mensaje>{error}</Mensaje>
      <div className="tarjeta">
        {!resultado ? <Cargando /> : resultado.data.length === 0 ? <Vacio>Todavía no registraste ventas.</Vacio> : (
          <>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead><tr><th>Operación</th><th>Fecha</th><th>Caja</th><th>Método</th><th>Total</th><th>Estado</th></tr></thead>
                <tbody>
                  {resultado.data.map((v) => (
                    <tr key={v.id_venta}>
                      <td className="fuerte"><Link to={`/pos/ticket/${v.id_venta}`}>{numeroVenta(v.id_venta)}</Link></td>
                      <td>{fechaHora(v.fecha)}</td>
                      <td>{v.sesion?.caja?.nombre}</td>
                      <td>{METODOS_PAGO[v.pago?.metodo]}</td>
                      <td>{moneda(v.total)}</td>
                      <td><Estado valor={v.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion datos={resultado.pagination} onCambiar={setPagina} />
          </>
        )}
      </div>
    </>
  )
}

// ===================== Caja actual =====================

function MovimientoCaja({ idSesion, onCerrar, onGuardado }) {
  const [form, setForm] = useState({ tipo: 'INGRESO', monto: '', descripcion: '' })
  const [error, setError] = useState('')

  const cerrar = () => { descartarOperacion('caja'); onCerrar() }

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await ejecutarOperacion('caja', form, (body) => api.post(`/pos/sessions/${idSesion}/movements`, body))
      onGuardado()
    } catch (err) {
      setError(esResultadoIncierto(err) ? 'Sin respuesta del servidor. Reintentá: el movimiento no se va a duplicar.' : mensajeDeError(err))
    }
  }

  return (
    <Modal titulo="Ingreso o egreso de caja" onCerrar={cerrar}>
      <form onSubmit={enviar}>
        <Mensaje>{error}</Mensaje>
        <div className="campo">
          <label htmlFor="tipo">Tipo</label>
          <select id="tipo" className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            <option value="INGRESO">Ingreso de dinero</option>
            <option value="EGRESO">Egreso de dinero</option>
          </select>
        </div>
        <div className="campo">
          <label htmlFor="monto">Monto</label>
          <input id="monto" type="number" min="0.01" step="0.01" className="input" required value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor="descripcion">Motivo</label>
          <input id="descripcion" className="input" required value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
        </div>
        <button className="btn">Registrar</button>
      </form>
    </Modal>
  )
}

export function CajaActual() {
  const { sesion, recargarSesion } = useOutletContext()
  const navigate = useNavigate()
  const [modal, setModal] = useState(null)
  const [declarado, setDeclarado] = useState('')
  const [observacion, setObservacion] = useState('')
  const [error, setError] = useState('')

  const actualizar = useCallback(() => { recargarSesion() }, [recargarSesion])
  useEffect(() => { actualizar() }, [actualizar])

  if (!sesion) return <Cargando />

  const diferencia = (Number(declarado) || 0) - Number(sesion.efectivo_esperado)

  const cerrar = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await api.post(`/pos/sessions/${sesion.id_sesion}/close`, { monto_declarado: declarado, observacion })
      sessionStorage.removeItem('pos_ticket')
      const id = sesion.id_sesion
      await recargarSesion()
      navigate(`/pos/cash/${id}`, { replace: true })
    } catch (err) {
      setError(mensajeDeError(err))
      setModal(null)
    }
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="etiqueta-seccion">{sesion.caja?.nombre} · Sesión #{sesion.id_sesion}</p>
          <h1>Estado de caja</h1>
        </div>
        <div className="acciones">
          <button className="btn btn-secundario" onClick={() => setModal('movimiento')}>Ingreso / egreso</button>
          <button className="btn btn-peligro" onClick={() => setModal('cierre')}>Cerrar caja</button>
        </div>
      </div>
      <Mensaje>{error}</Mensaje>
      <ResumenSesion sesion={sesion} rutaVenta={(id) => `/pos/ticket/${id}`} />

      {modal === 'movimiento' && <MovimientoCaja idSesion={sesion.id_sesion} onCerrar={() => setModal(null)} onGuardado={() => { setModal(null); actualizar() }} />}
      {modal === 'cierre' && (
        <Modal titulo="Cierre y arqueo de caja" onCerrar={() => setModal(null)}>
          <form onSubmit={cerrar}>
            <div className="resumen-linea"><span>Efectivo esperado</span><span className="fuerte">{moneda(sesion.efectivo_esperado)}</span></div>
            <div className="campo" style={{ marginTop: 10 }}>
              <label htmlFor="declarado">Efectivo contado</label>
              <input id="declarado" type="number" min="0" step="0.01" className="input" required value={declarado} onChange={(e) => setDeclarado(e.target.value)} />
            </div>
            {declarado !== '' && (
              <div className="resumen-linea" style={{ fontWeight: 700, color: diferencia === 0 ? 'var(--exito)' : 'var(--error)' }}>
                <span>Diferencia</span><span>{moneda(diferencia)}</span>
              </div>
            )}
            <div className="campo" style={{ marginTop: 10 }}>
              <label htmlFor="observacion">Observación</label>
              <textarea id="observacion" className="input" value={observacion} onChange={(e) => setObservacion(e.target.value)} />
            </div>
            <div className="acciones">
              <button className="btn btn-peligro">Confirmar cierre</button>
              <button type="button" className="btn btn-secundario" onClick={() => setModal(null)}>Volver</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

// ===================== Sesiones y stock =====================

export function HistorialCaja() {
  const [resultado, setResultado] = useState(null)
  const [pagina, setPagina] = useState(1)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/pos/sessions', { params: { page: pagina } }).then(({ data }) => setResultado(data)).catch((err) => setError(mensajeDeError(err)))
  }, [pagina])

  return (
    <>
      <div className="encabezado"><div><p className="etiqueta-seccion">Caja</p><h1>Mis sesiones</h1></div></div>
      <Mensaje>{error}</Mensaje>
      <div className="tarjeta">
        {!resultado ? <Cargando /> : resultado.data.length === 0 ? <Vacio>Todavía no abriste ninguna caja.</Vacio> : (
          <>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead><tr><th>Sesión</th><th>Caja</th><th>Apertura</th><th>Cierre</th><th>Esperado</th><th>Declarado</th><th>Diferencia</th><th>Estado</th></tr></thead>
                <tbody>
                  {resultado.data.map((s) => (
                    <tr key={s.id_sesion}>
                      <td className="fuerte"><Link to={`/pos/cash/${s.id_sesion}`}>#{s.id_sesion}</Link></td>
                      <td>{s.caja?.nombre}</td>
                      <td>{fechaHora(s.fecha_apertura)}</td>
                      <td>{fechaHora(s.fecha_cierre)}</td>
                      <td>{s.monto_esperado != null ? moneda(s.monto_esperado) : '—'}</td>
                      <td>{s.monto_declarado != null ? moneda(s.monto_declarado) : '—'}</td>
                      <td>{s.diferencia != null ? moneda(s.diferencia) : '—'}</td>
                      <td><Estado valor={s.estado} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion datos={resultado.pagination} onCambiar={setPagina} />
          </>
        )}
      </div>
    </>
  )
}

export function DetalleSesionPos() {
  const { id } = useParams()
  return <SesionPorId id={id} rutaVenta={(v) => `/pos/ticket/${v}`} />
}

export const StockPos = () => <PanelStock />
