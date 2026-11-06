import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { moneda } from '../../utils/formato'
import { ejecutarOperacion, esResultadoIncierto, operacionPendiente } from '../../utils/operacion'
import { Cargando, Mensaje, Vacio } from '../General'
import { leerTicket, vaciarTicket } from './ticket'

const METODOS = [
  ['EFECTIVO', 'Efectivo', 'Ingresá el monto recibido y calculá el cambio.'],
  ['TARJETA', 'Tarjeta', 'Débito o crédito en la terminal del local. Confirmá al aprobarse.'],
  ['MERCADO_PAGO_QR', 'QR Mercado Pago', 'El cliente escanea el QR. Confirmá al ver el cobro acreditado.']
]

function Cobro() {
  const navigate = useNavigate()
  const [ticket] = useState(leerTicket)
  const [calculo, setCalculo] = useState(null)
  const [cobroMp, setCobroMp] = useState(null)
  const pendiente = operacionPendiente('venta')
  const [metodo, setMetodo] = useState(pendiente?.datos.metodo || 'EFECTIVO')
  const [recibido, setRecibido] = useState(pendiente?.datos.monto_recibido ? String(pendiente.datos.monto_recibido) : '')
  const [confirmado, setConfirmado] = useState(Boolean(pendiente?.datos.confirmado_manual))
  const [referencia, setReferencia] = useState(pendiente?.datos.referencia || '')
  // Si un intento quedó sin respuesta, no se pueden cambiar los datos: se reintenta igual.
  const [incierto, setIncierto] = useState(Boolean(pendiente))
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(pendiente ? 'El último cobro quedó sin respuesta. Reintentá: la venta no se va a duplicar.' : '')

  useEffect(() => {
    if (!ticket.items.length) return
    api.post('/pos/quote', {
      items: ticket.items.map(({ id_producto, cantidad }) => ({ id_producto, cantidad })),
      codigo: ticket.codigo || undefined,
      descuento_porcentaje: ticket.descuento_porcentaje
    })
      .then(({ data }) => setCalculo(data.data))
      .catch((err) => setError(mensajeDeError(err)))
    api.get('/pos/payment-info').then(({ data }) => setCobroMp(data.data)).catch(() => {})
  }, [ticket])

  if (!ticket.items.length) return <Vacio>No hay un ticket para cobrar. <Link to="/pos" className="fuerte">Volver a la venta</Link></Vacio>
  if (!calculo) return error ? <Mensaje>{error}</Mensaje> : <Cargando />

  const total = calculo.total
  const montoRecibido = Number(recibido) || 0
  const vuelto = montoRecibido - total
  const puedeConfirmar = metodo === 'EFECTIVO' ? montoRecibido >= total : confirmado

  const teclear = (tecla) => {
    if (incierto) return
    if (tecla === 'borrar') return setRecibido(recibido.slice(0, -1))
    setRecibido(recibido + tecla)
  }

  const confirmar = async () => {
    setEnviando(true)
    setError('')
    const datos = {
      items: ticket.items.map(({ id_producto, cantidad }) => ({ id_producto, cantidad })),
      codigo: ticket.codigo || undefined,
      descuento_porcentaje: ticket.descuento_porcentaje,
      nota: ticket.nota || undefined,
      metodo,
      total_esperado: total,
      ...(metodo === 'EFECTIVO'
        ? { monto_recibido: montoRecibido }
        : { confirmado_manual: confirmado, referencia: referencia.trim() || undefined })
    }
    try {
      const { data } = await ejecutarOperacion('venta', datos, (body) => api.post('/pos/sales', body))
      vaciarTicket()
      navigate(`/pos/ticket/${data.data.id_venta}?nueva=1`, { replace: true })
    } catch (err) {
      const dudoso = esResultadoIncierto(err)
      setIncierto(dudoso)
      setError(dudoso ? 'Sin respuesta del servidor. Reintentá: la venta no se va a duplicar.' : mensajeDeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="etiqueta-seccion">Total a cobrar</p>
          <h1>{moneda(total)}</h1>
        </div>
        <span className="badge badge-info">{ticket.items.length} productos</span>
      </div>
      <Mensaje>{error}</Mensaje>
      <div className="pos-cobro">
        <div>
          {METODOS.map(([valor, nombre, ayuda]) => (
            <button key={valor} className={`metodo ${metodo === valor ? 'metodo-activo' : ''}`} disabled={incierto} onClick={() => { setMetodo(valor); setConfirmado(false) }}>
              <span className="fuerte">{nombre}</span><br />
              <span className="tenue">{ayuda}</span>
            </button>
          ))}

          {metodo === 'EFECTIVO' && (
            <div className="tarjeta">
              <h3 style={{ marginBottom: 10 }}>Datos del efectivo</h3>
              <div className="fila">
                <div className="campo">
                  <label htmlFor="recibido">Monto recibido</label>
                  <input id="recibido" className="input" type="number" min="0" disabled={incierto} value={recibido} onChange={(e) => setRecibido(e.target.value)} />
                </div>
                <div className="campo">
                  <label>Vuelto</label>
                  <div className="input">{moneda(vuelto > 0 ? vuelto : 0)}</div>
                </div>
              </div>
              {recibido && vuelto < 0 && <Mensaje tipo="aviso">Faltan {moneda(-vuelto)} para cubrir el total.</Mensaje>}
            </div>
          )}

          {metodo !== 'EFECTIVO' && (
            <div className="tarjeta">
              <h3 style={{ marginBottom: 10 }}>{metodo === 'TARJETA' ? 'Cobro con tarjeta' : 'Cobro con QR'}</h3>
              {metodo === 'MERCADO_PAGO_QR' && (
                cobroMp?.qr_imagen
                  ? <img className="qr" src={cobroMp.qr_imagen} alt="QR de Mercado Pago del comercio" />
                  : <Mensaje tipo="aviso">El QR del comercio no está configurado en el sistema. Usá el QR impreso del local.</Mensaje>
              )}
              <div className="campo">
                <label htmlFor="referencia">Número de operación (opcional)</label>
                <input id="referencia" className="input" disabled={incierto} value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              </div>
              <label className="check">
                <input type="checkbox" disabled={incierto} checked={confirmado} onChange={(e) => setConfirmado(e.target.checked)} />
                Confirmo que recibí el pago de {moneda(total)}
              </label>
            </div>
          )}
        </div>

        <div>
          {metodo === 'EFECTIVO' && (
            <div className="tarjeta" style={{ background: 'var(--arena)' }}>
              <p className="derecha" style={{ fontFamily: 'var(--titulos)', fontSize: 26, fontWeight: 700, marginBottom: 10 }}>{moneda(montoRecibido)}</p>
              <div className="teclado">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'].map((t) => <button key={t} disabled={incierto} onClick={() => teclear(t)}>{t}</button>)}
                <button disabled={incierto} style={{ background: '#fee2e2', color: 'var(--error)' }} aria-label="Borrar" onClick={() => teclear('borrar')}>⌫</button>
              </div>
            </div>
          )}
          <div className="tarjeta">
            <h3 style={{ marginBottom: 10 }}>Acciones de cobro</h3>
            {metodo === 'EFECTIVO' && (
              <>
                <div className="resumen-linea"><span>Recibido</span><span className="fuerte">{moneda(montoRecibido)}</span></div>
                <div className="resumen-linea" style={{ color: 'var(--exito)', fontWeight: 700, fontSize: 17 }}><span>Cambio</span><span>{moneda(vuelto > 0 ? vuelto : 0)}</span></div>
              </>
            )}
            <button className="btn btn-bloque" style={{ marginTop: 10 }} disabled={enviando || !puedeConfirmar} onClick={confirmar}>
              {enviando ? 'Procesando…' : incierto ? 'Reintentar cobro' : 'Confirmar cobro'}
            </button>
            {!incierto && <Link to="/pos" className="btn btn-secundario btn-bloque" style={{ marginTop: 8 }}>Volver al ticket</Link>}
          </div>
        </div>
      </div>
    </>
  )
}

export default Cobro
