import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { fechaHora, hoyISO, METODOS_PAGO, moneda } from '../../utils/formato'
import { Cargando, Estado, Mensaje, Modal, Paginacion, Vacio } from '../General'
import { GraficoBarras } from './Dashboard'

// ===================== Promociones =====================

export function PromocionesAdmin() {
  const [promociones, setPromociones] = useState(null)
  const [estado, setEstado] = useState('')
  const [error, setError] = useState('')

  const cargar = useCallback(() => {
    api.get('/promotions', { params: estado ? { estado } : {} }).then(({ data }) => setPromociones(data.data)).catch((err) => setError(mensajeDeError(err)))
  }, [estado])

  useEffect(() => { cargar() }, [cargar])

  const eliminar = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.nombre}"?`)) return
    setError('')
    try {
      await api.delete(`/promotions/${p.id_promocion}`)
      cargar()
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  return (
    <>
      <div className="encabezado">
        <div><p className="etiqueta-seccion">Marketing</p><h1>Promociones</h1></div>
        <Link to="/admin/promotions/new" className="btn">+ Nueva promoción</Link>
      </div>
      <div className="chips" style={{ marginBottom: 16 }}>
        {[['', 'Todas'], ['ACTIVA', 'Activas'], ['PROGRAMADA', 'Programadas'], ['FINALIZADA', 'Finalizadas']].map(([v, t]) => (
          <button key={v} className={`chip ${estado === v ? 'chip-activo' : ''}`} onClick={() => setEstado(v)}>{t}</button>
        ))}
      </div>
      <Mensaje>{error}</Mensaje>
      {!promociones ? <Cargando /> : promociones.length === 0 ? <Vacio>No hay promociones.</Vacio> : (
        <div className="grilla-productos" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {promociones.map((p) => (
            <article key={p.id_promocion} className="tarjeta" style={{ marginTop: 0 }}>
              <div className="encabezado" style={{ alignItems: 'flex-start', marginBottom: 8 }}>
                <h3>{p.nombre}</h3>
                <Estado valor={p.estado} />
              </div>
              <p className="fuerte" style={{ marginBottom: 6 }}>{Math.round(p.porcentaje_descuento)}% · {p.codigo ? `Código ${p.codigo}` : 'Automática'}</p>
              <p style={{ marginBottom: 6 }}>{p.descripcion}</p>
              <p className="tenue">{p.fecha_inicio} al {p.fecha_fin} · {p.productos.length} productos</p>
              <div className="acciones" style={{ marginTop: 12 }}>
                <Link to={`/admin/promotions/${p.id_promocion}/edit`} className="btn btn-secundario btn-chico">Editar</Link>
                <button className="btn btn-peligro btn-chico" onClick={() => eliminar(p)}>Eliminar</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}

export function FormularioPromocion() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nombre: '', codigo: '', porcentaje_descuento: '', fecha_inicio: hoyISO(), fecha_fin: '', descripcion: '' })
  const [productos, setProductos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [seleccion, setSeleccion] = useState({ productos: [], categorias: [] })
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/products', { params: { limit: 200 } }).then(({ data }) => setProductos(data.data)).catch((err) => setError(mensajeDeError(err)))
    api.get('/categories').then(({ data }) => setCategorias(data.data)).catch((err) => setError(mensajeDeError(err)))
    if (!id) return
    api.get(`/promotions/${id}`)
      .then(({ data }) => {
        const p = data.data
        setForm({ nombre: p.nombre, codigo: p.codigo || '', porcentaje_descuento: p.porcentaje_descuento, fecha_inicio: p.fecha_inicio, fecha_fin: p.fecha_fin, descripcion: p.descripcion || '' })
        setSeleccion({ productos: p.productos.map((x) => x.id_producto), categorias: [] })
      })
      .catch((err) => setError(mensajeDeError(err)))
  }, [id])

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const alternar = (grupo, valor) => setSeleccion({
    ...seleccion,
    [grupo]: seleccion[grupo].includes(valor) ? seleccion[grupo].filter((x) => x !== valor) : [...seleccion[grupo], valor]
  })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const body = { ...form, ...seleccion }
      if (id) await api.patch(`/promotions/${id}`, body)
      else await api.post('/promotions', body)
      navigate('/admin/promotions')
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  return (
    <>
      <div className="encabezado"><div><p className="etiqueta-seccion">Promociones</p><h1>{id ? 'Editar promoción' : 'Crear promoción'}</h1></div></div>
      <Mensaje>{error}</Mensaje>
      <div className="dos-columnas">
        <form className="tarjeta" style={{ marginTop: 0 }} onSubmit={guardar}>
          <h3 style={{ marginBottom: 12 }}>Datos principales</h3>
          <div className="campo"><label htmlFor="nombre">Nombre de la promoción</label><input id="nombre" name="nombre" className="input" required value={form.nombre} onChange={cambiar} /></div>
          <div className="fila">
            <div className="campo"><label htmlFor="codigo">Código (vacío = automática)</label><input id="codigo" name="codigo" className="input" value={form.codigo} onChange={cambiar} /></div>
            <div className="campo"><label htmlFor="porcentaje_descuento">Descuento (%)</label><input id="porcentaje_descuento" name="porcentaje_descuento" type="number" min="0.01" max="100" step="0.01" className="input" required value={form.porcentaje_descuento} onChange={cambiar} /></div>
          </div>
          <div className="fila">
            <div className="campo"><label htmlFor="fecha_inicio">Inicio</label><input id="fecha_inicio" name="fecha_inicio" type="date" className="input" required value={form.fecha_inicio} onChange={cambiar} /></div>
            <div className="campo"><label htmlFor="fecha_fin">Fin</label><input id="fecha_fin" name="fecha_fin" type="date" className="input" required value={form.fecha_fin} onChange={cambiar} /></div>
          </div>
          <div className="campo"><label htmlFor="descripcion">Descripción</label><textarea id="descripcion" name="descripcion" className="input" value={form.descripcion} onChange={cambiar} /></div>
          <div className="campo">
            <label>Aplica a categorías completas</label>
            <div className="chips">
              {categorias.map((c) => <label key={c.id_categoria} className="check"><input type="checkbox" checked={seleccion.categorias.includes(c.id_categoria)} onChange={() => alternar('categorias', c.id_categoria)} /> {c.nombre}</label>)}
            </div>
            <p className="tenue" style={{ marginTop: 5 }}>Incluye los productos actuales de la categoría; los que se creen después se agregan editando la promoción.</p>
          </div>
          <div className="campo">
            <label>Aplica a productos</label>
            <div className="chips" style={{ maxHeight: 180, overflow: 'auto' }}>
              {productos.map((p) => <label key={p.id_producto} className="check"><input type="checkbox" checked={seleccion.productos.includes(p.id_producto)} onChange={() => alternar('productos', p.id_producto)} /> {p.nombre}</label>)}
            </div>
          </div>
          <div className="acciones">
            <Link to="/admin/promotions" className="btn btn-secundario">Cancelar</Link>
            <button className="btn">{id ? 'Guardar cambios' : 'Publicar promoción'}</button>
          </div>
        </form>
        <div className="tarjeta" style={{ marginTop: 0, background: 'var(--arena)' }}>
          <span className="badge badge-info">Vista previa</span>
          <h2 style={{ color: 'var(--tostado)', margin: '12px 0 6px' }}>{form.nombre || 'Nombre de la promoción'}</h2>
          <p style={{ fontFamily: 'var(--titulos)', fontSize: 34, fontWeight: 700, color: 'var(--texto-fuerte)' }}>{Number(form.porcentaje_descuento) || 0}% OFF</p>
          <p>{form.descripcion}{form.codigo && ` Usá el código ${form.codigo.toUpperCase()}.`}</p>
        </div>
      </div>
    </>
  )
}

// ===================== Usuarios =====================

const ROLES = { administrador: 'Administrador', vendedor: 'Vendedor', cliente: 'Cliente' }

export function Usuarios() {
  const { usuario: actual } = useAuth()
  const [resultado, setResultado] = useState(null)
  const [filtros, setFiltros] = useState({ search: '', rol: '', page: 1 })
  const [edicion, setEdicion] = useState(null)
  const [error, setError] = useState('')

  const cargar = useCallback(() => {
    const consulta = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))
    api.get('/users', { params: consulta }).then(({ data }) => setResultado(data)).catch((err) => setError(mensajeDeError(err)))
  }, [filtros])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    const f = e.target
    const datos = { nombre: f.nombre.value, apellido: f.apellido.value, email: f.email.value, telefono: f.telefono.value, ...(f.contrasena.value && { contrasena: f.contrasena.value }) }
    try {
      if (edicion.id_usuario) await api.patch(`/users/${edicion.id_usuario}`, datos)
      else await api.post('/users', { ...datos, rol: f.rol.value })
      setEdicion(null)
      cargar()
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  const cambiarEstado = async (u) => {
    setError('')
    try {
      await api.patch(`/users/${u.id_usuario}/status`, { activo: !u.activo })
      cargar()
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  return (
    <>
      <div className="encabezado">
        <div><p className="etiqueta-seccion">Equipo</p><h1>Usuarios y roles</h1></div>
        <button className="btn" onClick={() => setEdicion({})}>+ Nuevo usuario</button>
      </div>
      <Mensaje>{error}</Mensaje>
      <div className="tarjeta">
        <form className="filtros" onSubmit={(e) => { e.preventDefault(); setFiltros({ ...filtros, search: e.target.buscar.value, page: 1 }) }}>
          <input name="buscar" className="input" placeholder="Nombre o email" aria-label="Buscar" />
          <select className="input" aria-label="Rol" value={filtros.rol} onChange={(e) => setFiltros({ ...filtros, rol: e.target.value, page: 1 })}>
            <option value="">Todos los roles</option>
            {Object.entries(ROLES).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          <button className="btn btn-secundario">Filtrar</button>
        </form>
        {!resultado ? <Cargando /> : resultado.data.length === 0 ? <Vacio>No hay usuarios con esos criterios.</Vacio> : (
          <>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead><tr><th>Usuario</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {resultado.data.map((u) => (
                    <tr key={u.id_usuario}>
                      <td className="fuerte">{u.nombre} {u.apellido}</td>
                      <td>{u.email}</td>
                      <td>{ROLES[u.rol]}</td>
                      <td>{u.activo ? <span className="badge badge-exito">Activo</span> : <span className="badge badge-neutro">Inactivo</span>}</td>
                      <td className="derecha">
                        <div className="acciones" style={{ justifyContent: 'flex-end' }}>
                          <button className="btn btn-secundario btn-chico" onClick={() => setEdicion(u)}>Editar</button>
                          {u.id_usuario !== actual.id_usuario && <button className="btn btn-secundario btn-chico" onClick={() => cambiarEstado(u)}>{u.activo ? 'Desactivar' : 'Activar'}</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion datos={resultado.pagination} onCambiar={(page) => setFiltros({ ...filtros, page })} />
          </>
        )}
      </div>
      <div className="tarjeta">
        <h3 style={{ marginBottom: 10 }}>Roles y alcance</h3>
        <div className="fila">
          <div><p className="fuerte">Administrador</p><p className="tenue">Gestión del sistema. No opera el POS.</p></div>
          <div><p className="fuerte">Vendedor</p><p className="tenue">POS, caja y movimientos de stock.</p></div>
          <div><p className="fuerte">Cliente</p><p className="tenue">Compras, favoritos y sus pedidos.</p></div>
        </div>
      </div>
      {edicion && (
        <Modal titulo={edicion.id_usuario ? 'Editar usuario' : 'Nuevo usuario'} onCerrar={() => setEdicion(null)}>
          <form onSubmit={guardar}>
            <div className="fila">
              <div className="campo"><label htmlFor="nombre">Nombre</label><input id="nombre" name="nombre" className="input" required defaultValue={edicion.nombre} /></div>
              <div className="campo"><label htmlFor="apellido">Apellido</label><input id="apellido" name="apellido" className="input" required defaultValue={edicion.apellido} /></div>
            </div>
            <div className="campo"><label htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" required defaultValue={edicion.email} /></div>
            <div className="campo"><label htmlFor="telefono">Teléfono</label><input id="telefono" name="telefono" className="input" defaultValue={edicion.telefono} /></div>
            {edicion.id_usuario
              ? <p className="tenue" style={{ marginBottom: 12 }}>Rol: {ROLES[edicion.rol]}. El rol no se modifica para conservar el historial.</p>
              : (
                <div className="campo">
                  <label htmlFor="rol">Rol</label>
                  <select id="rol" name="rol" className="input" defaultValue="vendedor">
                    {Object.entries(ROLES).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                  </select>
                </div>
              )}
            <div className="campo">
              <label htmlFor="contrasena">{edicion.id_usuario ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label>
              <input id="contrasena" name="contrasena" type="password" minLength={8} autoComplete="new-password" className="input" required={!edicion.id_usuario} />
            </div>
            <button className="btn">Guardar</button>
          </form>
        </Modal>
      )}
    </>
  )
}

// ===================== Reportes =====================

const primerDiaDelMes = () => `${hoyISO().slice(0, 7)}-01`

export function Reportes() {
  const [rango, setRango] = useState({ from: primerDiaDelMes(), to: hoyISO() })
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/reports/sales', { params: rango }),
      api.get('/reports/best-sellers', { params: rango }),
      api.get('/reports/stock'),
      api.get('/reports/cash', { params: rango })
    ])
      .then(([ventas, mejores, stock, caja]) => setDatos({ ventas: ventas.data.data, mejores: mejores.data.data, stock: stock.data.data, caja: caja.data.data }))
      .catch((err) => setError(mensajeDeError(err)))
  }, [rango])

  const cambiar = (e) => setRango({ ...rango, [e.target.name]: e.target.value })

  if (!datos) return error ? <Mensaje>{error}</Mensaje> : <Cargando />

  const { ventas, mejores, stock, caja } = datos
  const maximoCategoria = Math.max(...ventas.por_categoria.map((c) => Number(c.total)), 1)

  return (
    <>
      <div className="encabezado">
        <div><p className="etiqueta-seccion">Inteligencia comercial</p><h1>Reportes</h1></div>
        <div className="acciones no-imprimir">
          <div><label htmlFor="from">Desde</label><input id="from" name="from" type="date" className="input" value={rango.from} onChange={cambiar} /></div>
          <div><label htmlFor="to">Hasta</label><input id="to" name="to" type="date" className="input" value={rango.to} onChange={cambiar} /></div>
          <button className="btn" style={{ alignSelf: 'flex-end' }} onClick={() => window.print()}>Exportar PDF</button>
        </div>
      </div>
      <Mensaje>{error}</Mensaje>
      <div className="kpis">
        <div className="kpi"><div className="kpi-titulo">Ingresos del período</div><div className="kpi-valor">{moneda(ventas.ingresos)}</div></div>
        <div className="kpi"><div className="kpi-titulo">Operaciones</div><div className="kpi-valor">{ventas.operaciones}</div></div>
        {ventas.por_canal.map((c) => (
          <div key={c.canal} className="kpi"><div className="kpi-titulo">{c.canal === 'POS' ? 'POS / Caja' : 'Tienda online'}</div><div className="kpi-valor">{moneda(c.total)}</div><span className="tenue">{c.operaciones} operaciones</span></div>
        ))}
      </div>
      <div className="dos-columnas">
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <h3>Ventas por día</h3>
          {ventas.por_dia.length === 0 ? <Vacio>Sin ventas en el período.</Vacio> : <GraficoBarras datos={ventas.por_dia} etiqueta={(d) => String(d.dia).slice(5, 10)} valor={(d) => d.total} />}
        </div>
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 10 }}>Por método de pago</h3>
          {ventas.por_metodo.length === 0 && <Vacio>Sin datos.</Vacio>}
          {ventas.por_metodo.map((m) => <div key={m.metodo} className="resumen-linea"><span>{METODOS_PAGO[m.metodo]}</span><span className="fuerte">{moneda(m.total)}</span></div>)}
        </div>
      </div>
      <div className="dos-columnas" style={{ marginTop: 16 }}>
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 10 }}>Productos más vendidos</h3>
          {mejores.length === 0 ? <Vacio>Sin ventas en el período.</Vacio> : (
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead><tr><th>Producto</th><th>Unidades</th><th className="derecha">Total</th></tr></thead>
                <tbody>{mejores.map((p) => <tr key={p.id_producto}><td className="fuerte">{p.nombre}</td><td>{p.unidades} u.</td><td className="derecha">{moneda(p.total)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <h3 style={{ marginBottom: 10 }}>Por categoría</h3>
          {ventas.por_categoria.length === 0 && <Vacio>Sin datos.</Vacio>}
          {ventas.por_categoria.map((c) => (
            <div key={c.categoria} style={{ marginBottom: 10 }}>
              <div className="resumen-linea" style={{ padding: 0 }}><span>{c.categoria}</span><span className="fuerte">{moneda(c.total)}</span></div>
              <div className="barra-horizontal" style={{ width: `${(Number(c.total) / maximoCategoria) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="tarjeta">
        <h3 style={{ marginBottom: 10 }}>Stock</h3>
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead><tr><th>Producto</th><th>Categoría</th><th>Stock</th><th>Mínimo</th><th className="derecha">Valorizado</th></tr></thead>
            <tbody>{stock.map((p) => <tr key={p.id_producto}><td className="fuerte">{p.sku} · {p.nombre}</td><td>{p.categoria}</td><td>{p.stock} u.</td><td>{p.stock_minimo} u.</td><td className="derecha">{moneda(p.valorizado)}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
      <div className="tarjeta">
        <h3 style={{ marginBottom: 10 }}>Caja</h3>
        {caja.length === 0 ? <Vacio>Sin sesiones en el período.</Vacio> : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead><tr><th>Sesión</th><th>Caja</th><th>Vendedor</th><th>Apertura</th><th>Esperado</th><th>Declarado</th><th>Diferencia</th><th>Estado</th></tr></thead>
              <tbody>
                {caja.map((s) => (
                  <tr key={s.id_sesion}>
                    <td className="fuerte"><Link to={`/admin/registers/sessions/${s.id_sesion}`}>#{s.id_sesion}</Link></td>
                    <td>{s.caja}</td>
                    <td>{s.vendedor}</td>
                    <td>{fechaHora(s.fecha)}</td>
                    <td>{s.monto_esperado != null ? moneda(s.monto_esperado) : '—'}</td>
                    <td>{s.monto_declarado != null ? moneda(s.monto_declarado) : '—'}</td>
                    <td>{s.diferencia != null ? moneda(s.diferencia) : '—'}</td>
                    <td><Estado valor={s.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
