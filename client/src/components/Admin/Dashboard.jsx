import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { moneda, numeroPedido } from '../../utils/formato'
import { Cargando, Estado, Mensaje, Vacio } from '../General'

const CANALES = { ONLINE: ['Tienda online', 'var(--verde)'], POS: ['POS / Caja', 'var(--tostado)'] }

export function GraficoBarras({ datos, etiqueta, valor }) {
  const maximo = Math.max(...datos.map((d) => Number(valor(d))), 1)
  return (
    <div className="barras" role="img" aria-label="Gráfico de ventas">
      {datos.map((d) => (
        <div key={etiqueta(d)} className="barra-col" title={`${etiqueta(d)}: ${moneda(valor(d))}`}>
          <div className="barra" style={{ height: `${(Number(valor(d)) / maximo) * 85}%` }} />
          {etiqueta(d)}
        </div>
      ))}
    </div>
  )
}

function Dashboard() {
  const [d, setD] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/dashboard/summary').then(({ data }) => setD(data.data)).catch((err) => setError(mensajeDeError(err)))
  }, [])

  if (!d) return error ? <Mensaje>{error}</Mensaje> : <Cargando />

  const anterior = Number(d.ventas_mes_anterior)
  const variacion = anterior > 0 ? ((Number(d.ventas_mes) - anterior) / anterior) * 100 : null
  const totalCanales = d.ventas_por_canal.reduce((s, c) => s + Number(c.total), 0)
  const online = d.ventas_por_canal.find((c) => c.canal === 'ONLINE')
  const porcentajeOnline = totalCanales ? (Number(online?.total || 0) / totalCanales) * 100 : 0

  return (
    <>
      <div className="encabezado"><div><p className="etiqueta-seccion">Resumen operativo</p><h1>Dashboard</h1></div></div>
      <div className="kpis">
        <div className="kpi">
          <div className="kpi-titulo">Ventas del mes</div>
          <div className="kpi-valor">{moneda(d.ventas_mes)}</div>
          {variacion !== null
            ? <span className="tenue" style={{ color: variacion >= 0 ? 'var(--exito)' : 'var(--error)' }}>{variacion >= 0 ? '↗' : '↘'} {Math.abs(variacion).toFixed(1)}% vs. mes anterior</span>
            : <span className="tenue">Sin ventas el mes anterior</span>}
        </div>
        <div className="kpi"><div className="kpi-titulo">Pedidos del mes</div><div className="kpi-valor">{d.pedidos_mes}</div><span className="tenue">{d.pedidos_pendientes} pendientes</span></div>
        <div className="kpi"><div className="kpi-titulo">Productos activos</div><div className="kpi-valor">{d.productos_activos}</div><span className="tenue">{d.clientes} clientes registrados</span></div>
        <div className="kpi"><div className="kpi-titulo">Stock crítico</div><div className="kpi-valor">{d.stock_critico}</div><span className="tenue" style={{ color: d.stock_critico ? 'var(--error)' : undefined }}>productos</span></div>
      </div>

      <div className="dos-columnas">
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <h3>Ventas por mes</h3>
          <p className="tenue">Ingresos · últimos 12 meses</p>
          {d.ventas_por_mes.length === 0 ? <Vacio>Todavía no hay ventas.</Vacio> : <GraficoBarras datos={d.ventas_por_mes} etiqueta={(x) => x.mes.slice(2)} valor={(x) => x.total} />}
        </div>
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 12 }}>Ventas por canal</h3>
          <div role="img" aria-label="Distribución de ventas por canal" style={{ width: 130, height: 130, margin: '0 auto 14px', borderRadius: '50%', display: 'grid', placeItems: 'center', background: totalCanales ? `conic-gradient(var(--verde) 0 ${porcentajeOnline}%, var(--tostado) ${porcentajeOnline}% 100%)` : 'var(--borde)' }}>
            <div style={{ width: 86, height: 86, borderRadius: '50%', background: 'white', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 12 }}>{moneda(totalCanales)}</div>
          </div>
          {Object.entries(CANALES).map(([canal, [nombre, color]]) => {
            const fila = d.ventas_por_canal.find((c) => c.canal === canal)
            return (
              <div key={canal} className="resumen-linea">
                <span><span style={{ display: 'inline-block', width: 10, height: 10, marginRight: 8, borderRadius: 3, background: color }} />{nombre}</span>
                <span className="fuerte">{totalCanales ? Math.round((Number(fila?.total || 0) / totalCanales) * 100) : 0}%</span>
              </div>
            )
          })}
          <Link to="/admin/reports" className="btn btn-secundario btn-bloque" style={{ marginTop: 10 }}>→ Ver reporte completo</Link>
        </div>
      </div>

      <div className="dos-columnas" style={{ marginTop: 16 }}>
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <div className="encabezado" style={{ alignItems: 'center', marginBottom: 10 }}>
            <h3>Pedidos recientes</h3>
            <Link to="/admin/orders" className="btn btn-secundario btn-chico">Ver todos</Link>
          </div>
          {d.pedidos_recientes.length === 0 ? <Vacio>Todavía no hay pedidos.</Vacio> : (
            <div className="tabla-contenedor">
              <table className="tabla"><tbody>
                {d.pedidos_recientes.map((p) => (
                  <tr key={p.id_compra}>
                    <td className="fuerte"><Link to={`/admin/orders/${p.id_compra}`}>#{numeroPedido(p.id_compra)}</Link></td>
                    <td>{p.cliente}</td>
                    <td>{moneda(p.total)}</td>
                    <td><Estado valor={p.estado} /></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 10 }}>Stock bajo</h3>
          {d.stock_bajo.length === 0 && <Vacio>Sin alertas de stock.</Vacio>}
          {d.stock_bajo.map((p) => (
            <div key={p.id_producto} className="resumen-linea"><span>{p.nombre}</span><span className="badge badge-error">{p.stock} u.</span></div>
          ))}
          <Link to="/admin/stock" className="btn btn-bloque" style={{ marginTop: 10 }}>Gestionar stock</Link>
        </div>
      </div>
    </>
  )
}

export default Dashboard
