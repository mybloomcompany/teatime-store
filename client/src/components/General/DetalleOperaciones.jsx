import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { fechaHora, METODOS_PAGO, moneda, numeroVenta, TIPOS_MOVIMIENTO } from '../../utils/formato'
import { Cargando, Estado, Mensaje, Vacio } from './Comunes'

// Ticket de una venta POS. Lo usan el POS y Administración.
export function Ticket({ venta, children }) {
  return (
    <div className="dos-columnas">
      <div className="tarjeta" style={{ marginTop: 0 }}>
        <h3 style={{ marginBottom: 2 }}>TeaTime · Tienda principal</h3>
        <p className="tenue" style={{ marginBottom: 12 }}>Venta {numeroVenta(venta.id_venta)} · {fechaHora(venta.fecha)}</p>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th className="derecha">Importe</th></tr></thead>
            <tbody>
              {venta.detalles.map((d) => (
                <tr key={d.id_producto}>
                  <td className="fuerte">{d.producto.nombre}{d.promocion && <div className="tenue" style={{ color: 'var(--exito)' }}>{d.promocion.nombre}</div>}</td>
                  <td>{d.cantidad}</td>
                  <td>{Number(d.precio_unitario) < Number(d.precio_lista) && <s className="tenue">{moneda(d.precio_lista)} </s>}{moneda(d.precio_unitario)}</td>
                  <td className="derecha">{moneda(d.cantidad * d.precio_unitario)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="resumen-linea" style={{ marginTop: 10 }}><span>Subtotal</span><span>{moneda(venta.subtotal)}</span></div>
        {venta.descuento_total > 0 && <div className="resumen-linea" style={{ color: 'var(--exito)' }}><span>Descuentos</span><span>- {moneda(venta.descuento_total)}</span></div>}
        <div className="resumen-total"><span>TOTAL</span><span>{moneda(venta.total)}</span></div>
        {venta.nota && <p className="tenue" style={{ marginTop: 10 }}>Nota: {venta.nota}</p>}
      </div>
      <div className="tarjeta" style={{ marginTop: 0 }}>
        <h3 style={{ marginBottom: 10 }}>Datos de operación</h3>
        <div className="resumen-linea"><span>Estado</span><Estado valor={venta.estado} /></div>
        <div className="resumen-linea"><span>Cajero</span><span className="fuerte">{venta.vendedor?.nombre} {venta.vendedor?.apellido}</span></div>
        <div className="resumen-linea"><span>Caja</span><span className="fuerte">{venta.sesion?.caja?.nombre}</span></div>
        <div className="resumen-linea"><span>Método</span><span className="fuerte">{METODOS_PAGO[venta.pago?.metodo]}</span></div>
        {venta.pago?.monto_recibido != null && <div className="resumen-linea"><span>Recibido</span><span className="fuerte">{moneda(venta.pago.monto_recibido)}</span></div>}
        {venta.vuelto != null && <div className="resumen-linea"><span>Vuelto</span><span className="fuerte">{moneda(venta.vuelto)}</span></div>}
        {venta.pago?.referencia_externa && <div className="resumen-linea"><span>Referencia</span><span className="fuerte">{venta.pago.referencia_externa}</span></div>}
        {children}
      </div>
    </div>
  )
}

// Detalle y arqueo de una sesión de caja.
export function ResumenSesion({ sesion, rutaVenta }) {
  const cerrada = sesion.estado === 'CERRADA'
  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="kpi-titulo">Monto inicial</div><div className="kpi-valor">{moneda(sesion.monto_inicial)}</div></div>
        <div className="kpi"><div className="kpi-titulo">Efectivo esperado</div><div className="kpi-valor">{moneda(sesion.efectivo_esperado)}</div></div>
        <div className="kpi"><div className="kpi-titulo">Total vendido</div><div className="kpi-valor">{moneda(sesion.total_ventas)}</div><span className="tenue">{sesion.cantidad_ventas} ventas · {sesion.cantidad_anuladas} anuladas</span></div>
        {cerrada && (
          <div className="kpi">
            <div className="kpi-titulo">Diferencia de arqueo</div>
            <div className="kpi-valor" style={{ color: Number(sesion.diferencia) === 0 ? 'var(--exito)' : 'var(--error)' }}>{moneda(sesion.diferencia)}</div>
            <span className="tenue">Declarado: {moneda(sesion.monto_declarado)}</span>
          </div>
        )}
      </div>

      <div className="dos-columnas">
        <div>
          <div className="tarjeta">
            <h3 style={{ marginBottom: 10 }}>Movimientos de caja</h3>
            {sesion.movimientos.length === 0 ? <Vacio>Sin movimientos de dinero.</Vacio> : (
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead><tr><th>Fecha</th><th>Tipo</th><th>Detalle</th><th className="derecha">Monto</th></tr></thead>
                  <tbody>
                    {sesion.movimientos.map((m) => {
                      const suma = ['INGRESO', 'VENTA_EFECTIVO'].includes(m.tipo)
                      return (
                        <tr key={m.id_movimiento_caja}>
                          <td>{fechaHora(m.fecha)}</td>
                          <td>{TIPOS_MOVIMIENTO[m.tipo]}</td>
                          <td className="tenue">{m.descripcion}</td>
                          <td className="derecha fuerte" style={{ color: suma ? 'var(--exito)' : 'var(--error)' }}>{suma ? '+' : '-'} {moneda(m.monto)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="tarjeta">
            <h3 style={{ marginBottom: 10 }}>Ventas de la sesión</h3>
            {sesion.ventas.length === 0 ? <Vacio>Sin ventas registradas.</Vacio> : (
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead><tr><th>Venta</th><th>Hora</th><th>Método</th><th>Total</th><th>Estado</th></tr></thead>
                  <tbody>
                    {sesion.ventas.map((v) => (
                      <tr key={v.id_venta}>
                        <td className="fuerte"><Link to={rutaVenta(v.id_venta)}>{numeroVenta(v.id_venta)}</Link></td>
                        <td>{fechaHora(v.fecha)}</td>
                        <td>{METODOS_PAGO[v.pago?.metodo]}</td>
                        <td>{moneda(v.total)}</td>
                        <td><Estado valor={v.estado} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 10 }}>Resumen</h3>
          <div className="resumen-linea"><span>Apertura</span><span>{fechaHora(sesion.fecha_apertura)}</span></div>
          {cerrada && <div className="resumen-linea"><span>Cierre</span><span>{fechaHora(sesion.fecha_cierre)}</span></div>}
          <div className="resumen-linea"><span>Efectivo</span><span>{moneda(sesion.ventas_por_metodo.EFECTIVO)}</span></div>
          <div className="resumen-linea"><span>Tarjeta</span><span>{moneda(sesion.ventas_por_metodo.TARJETA)}</span></div>
          <div className="resumen-linea"><span>QR Mercado Pago</span><span>{moneda(sesion.ventas_por_metodo.MERCADO_PAGO_QR)}</span></div>
          <div className="resumen-linea"><span>Ingresos manuales</span><span>{moneda(sesion.ingresos)}</span></div>
          <div className="resumen-linea"><span>Egresos manuales</span><span>{moneda(sesion.egresos)}</span></div>
          {sesion.observacion && <p className="tenue" style={{ marginTop: 8 }}>{sesion.observacion}</p>}
        </div>
      </div>
    </>
  )
}

export function SesionPorId({ id, rutaVenta }) {
  const [sesion, setSesion] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/pos/sessions/${id}`).then(({ data }) => setSesion(data.data)).catch((err) => setError(mensajeDeError(err)))
  }, [id])

  if (!sesion) return error ? <Mensaje>{error}</Mensaje> : <Cargando />

  return (
    <>
      <div className="encabezado">
        <div>
          <p className="etiqueta-seccion">Sesión #{sesion.id_sesion} · {sesion.caja?.nombre} · {sesion.vendedor?.nombre} {sesion.vendedor?.apellido}</p>
          <h1>Arqueo de caja</h1>
        </div>
        <div className="acciones no-imprimir">
          <Estado valor={sesion.estado} />
          <button className="btn btn-secundario btn-chico" onClick={() => window.print()}>Imprimir</button>
        </div>
      </div>
      <ResumenSesion sesion={sesion} rutaVenta={rutaVenta} />
    </>
  )
}
