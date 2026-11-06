import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { moneda } from '../../utils/formato'
import { Cargando, Estado, Mensaje, Modal, Paginacion, Vacio } from '../General'

// ===================== Productos =====================

export function Productos() {
  const [resultado, setResultado] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [filtros, setFiltros] = useState({ search: '', category: '', status: 'todos', page: 1 })
  const [error, setError] = useState('')

  const cargar = useCallback(() => {
    const params = Object.fromEntries(Object.entries({ ...filtros, limit: 15 }).filter(([, v]) => v))
    api.get('/products', { params }).then(({ data }) => setResultado(data)).catch((err) => setError(mensajeDeError(err)))
  }, [filtros])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => { api.get('/categories').then(({ data }) => setCategorias(data.data)).catch(() => {}) }, [])

  const cambiarEstado = async (p) => {
    setError('')
    try {
      await api.patch(`/products/${p.id_producto}`, { activo: !p.activo })
      cargar()
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  const estadoStock = (p) => (p.stock === 0 ? 'AGOTADO' : p.stock <= p.stock_minimo ? 'BAJO' : 'DISPONIBLE')

  return (
    <>
      <div className="encabezado"><div><p className="etiqueta-seccion">Catálogo</p><h1>Productos</h1></div></div>
      <Mensaje>{error}</Mensaje>
      <div className="tarjeta">
        <form className="filtros" onSubmit={(e) => { e.preventDefault(); setFiltros({ ...filtros, search: e.target.buscar.value, page: 1 }) }}>
          <input name="buscar" className="input" placeholder="Producto o SKU..." aria-label="Buscar" />
          <select className="input" aria-label="Categoría" value={filtros.category} onChange={(e) => setFiltros({ ...filtros, category: e.target.value, page: 1 })}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
          </select>
          <select className="input" aria-label="Estado" value={filtros.status} onChange={(e) => setFiltros({ ...filtros, status: e.target.value, page: 1 })}>
            <option value="todos">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
          <button className="btn btn-secundario">Filtrar</button>
        </form>
        {!resultado ? <Cargando /> : resultado.data.length === 0 ? <Vacio>No hay productos con esos criterios.</Vacio> : (
          <>
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead><tr><th>Producto</th><th>SKU</th><th>Categoría</th><th>Stock</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {resultado.data.map((p) => (
                    <tr key={p.id_producto} style={{ opacity: p.activo ? 1 : 0.55 }}>
                      <td className="fuerte"><div className="acciones" style={{ flexWrap: 'nowrap' }}><img className="miniatura" src={p.imagen || '/favicon.svg'} alt="" />{p.nombre}</div></td>
                      <td>{p.sku}</td>
                      <td>{p.categoria?.nombre}</td>
                      <td>{p.stock} u.</td>
                      <td>{moneda(p.precio_lista)}</td>
                      <td>{p.activo ? <Estado valor={estadoStock(p)} /> : <span className="badge badge-neutro">Inactivo</span>}</td>
                      <td>
                        <div className="acciones" style={{ flexWrap: 'nowrap' }}>
                          <Link className="btn btn-secundario btn-chico" to={`/admin/products/${p.id_producto}/edit`}>Editar</Link>
                          <button className="btn btn-secundario btn-chico" onClick={() => cambiarEstado(p)}>{p.activo ? 'Desactivar' : 'Activar'}</button>
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
    </>
  )
}

const VACIO = { nombre: '', sku: '', id_categoria: '', marca: '', precio: '', stock_inicial: '', stock_minimo: '', presentacion: '', peso: '', imagen: '', descripcion: '', sabores: [], activo: true }

export function FormularioProducto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState(VACIO)
  const [stockActual, setStockActual] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [sabores, setSabores] = useState([])
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(Boolean(id))

  useEffect(() => {
    api.get('/categories').then(({ data }) => setCategorias(data.data)).catch((err) => setError(mensajeDeError(err)))
    api.get('/flavors').then(({ data }) => setSabores(data.data)).catch((err) => setError(mensajeDeError(err)))
    if (!id) return
    api.get(`/products/${id}`)
      .then(({ data }) => {
        const p = data.data
        setStockActual(p.stock)
        setForm({
          nombre: p.nombre, sku: p.sku, id_categoria: p.id_categoria, marca: p.marca || '', precio: p.precio_lista,
          stock_inicial: '', stock_minimo: p.stock_minimo, presentacion: p.presentacion || '', peso: p.peso || '',
          imagen: p.imagen || '', descripcion: p.descripcion || '', sabores: p.sabores.map((s) => s.id_sabor), activo: p.activo
        })
      })
      .catch((err) => setError(mensajeDeError(err)))
      .finally(() => setCargando(false))
  }, [id])

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const alternarSabor = (idSabor) => setForm({
    ...form,
    sabores: form.sabores.includes(idSabor) ? form.sabores.filter((s) => s !== idSabor) : [...form.sabores, idSabor]
  })

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (id) {
        // El stock no se edita acá: cambia solo mediante movimientos.
        const datos = { ...form }
        delete datos.stock_inicial
        await api.patch(`/products/${id}`, datos)
      } else {
        await api.post('/products', form)
      }
      navigate('/admin/products')
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  if (cargando) return <Cargando />

  return (
    <>
      <div className="encabezado"><div><p className="etiqueta-seccion">Catálogo / Productos</p><h1>{id ? `Editar ${form.nombre}` : 'Nuevo producto'}</h1></div></div>
      <Mensaje>{error}</Mensaje>
      <form className="tarjeta" onSubmit={guardar}>
        <div className="fila">
          <div className="campo"><label htmlFor="nombre">Nombre</label><input id="nombre" name="nombre" className="input" required value={form.nombre} onChange={cambiar} /></div>
          <div className="campo"><label htmlFor="sku">SKU</label><input id="sku" name="sku" className="input" required value={form.sku} onChange={cambiar} /></div>
        </div>
        <div className="fila">
          <div className="campo">
            <label htmlFor="id_categoria">Categoría</label>
            <select id="id_categoria" name="id_categoria" className="input" required value={form.id_categoria} onChange={cambiar}>
              <option value="">Seleccionar…</option>
              {categorias.map((c) => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
            </select>
          </div>
          <div className="campo"><label htmlFor="marca">Marca</label><input id="marca" name="marca" className="input" value={form.marca} onChange={cambiar} /></div>
        </div>
        <div className="fila">
          <div className="campo"><label htmlFor="precio">Precio</label><input id="precio" name="precio" type="number" min="0.01" step="0.01" className="input" required value={form.precio} onChange={cambiar} /></div>
          {id
            ? <div className="campo"><label>Stock actual</label><div className="input">{stockActual} u. <Link className="tenue" to="/admin/stock">(se cambia desde Stock)</Link></div></div>
            : <div className="campo"><label htmlFor="stock_inicial">Stock inicial</label><input id="stock_inicial" name="stock_inicial" type="number" min="0" step="1" className="input" value={form.stock_inicial} onChange={cambiar} /></div>}
          <div className="campo"><label htmlFor="stock_minimo">Stock mínimo</label><input id="stock_minimo" name="stock_minimo" type="number" min="0" step="1" className="input" value={form.stock_minimo} onChange={cambiar} /></div>
        </div>
        <div className="fila">
          <div className="campo"><label htmlFor="presentacion">Presentación</label><input id="presentacion" name="presentacion" className="input" placeholder="Hebras, Saquitos, Lata…" value={form.presentacion} onChange={cambiar} /></div>
          <div className="campo"><label htmlFor="peso">Peso o contenido</label><input id="peso" name="peso" className="input" placeholder="40 g" value={form.peso} onChange={cambiar} /></div>
        </div>
        <div className="campo"><label htmlFor="imagen">URL de la imagen</label><input id="imagen" name="imagen" className="input" placeholder="/img/matcha.jpg" value={form.imagen} onChange={cambiar} /></div>
        <div className="campo">
          <label>Sabores y variedades</label>
          <div className="chips">
            {sabores.map((s) => (
              <button type="button" key={s.id_sabor} className={`chip ${form.sabores.includes(s.id_sabor) ? 'chip-activo' : ''}`} aria-pressed={form.sabores.includes(s.id_sabor)} onClick={() => alternarSabor(s.id_sabor)}>{s.nombre}</button>
            ))}
          </div>
        </div>
        <div className="campo"><label htmlFor="descripcion">Descripción</label><textarea id="descripcion" name="descripcion" className="input" value={form.descripcion} onChange={cambiar} /></div>
        {id && <label className="check" style={{ marginBottom: 14 }}><input type="checkbox" name="activo" checked={form.activo} onChange={cambiar} /> Producto activo</label>}
        <div className="acciones">
          <Link to="/admin/products" className="btn btn-secundario">Cancelar</Link>
          <button className="btn">{id ? 'Guardar cambios' : 'Publicar producto'}</button>
        </div>
      </form>
    </>
  )
}

// ===================== Categorías y sabores =====================

// Pantalla simple de alta, edición y baja para datos de un solo nombre.
function ListaSimple({ titulo, etiqueta, ruta, idCampo, conDescripcion }) {
  const [items, setItems] = useState(null)
  const [edicion, setEdicion] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  const cargar = useCallback(() => {
    api.get(ruta, { params: { todos: 1 } }).then(({ data }) => setItems(data.data)).catch((err) => setError(mensajeDeError(err)))
  }, [ruta])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async (e) => {
    e.preventDefault()
    setError('')
    const datos = { nombre: e.target.nombre.value, ...(conDescripcion && { descripcion: e.target.descripcion.value }) }
    try {
      if (edicion[idCampo]) await api.patch(`${ruta}/${edicion[idCampo]}`, datos)
      else await api.post(ruta, datos)
      setEdicion(null)
      cargar()
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  const eliminar = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.nombre}"?`)) return
    setError(''); setAviso('')
    try {
      const { data } = await api.delete(`${ruta}/${item[idCampo]}`)
      if (data.data.desactivado) setAviso(`"${item.nombre}" está en uso: se desactivó en lugar de eliminarse.`)
      cargar()
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  const reactivar = async (item) => {
    await api.patch(`${ruta}/${item[idCampo]}`, { activo: true }).catch((err) => setError(mensajeDeError(err)))
    cargar()
  }

  return (
    <>
      <div className="encabezado">
        <div><p className="etiqueta-seccion">Catálogo</p><h1>{titulo}</h1></div>
        <button className="btn" onClick={() => setEdicion({})}>+ Nuevo</button>
      </div>
      <Mensaje>{error}</Mensaje>
      <Mensaje tipo="info">{aviso}</Mensaje>
      <div className="tarjeta">
        {!items ? <Cargando /> : items.length === 0 ? <Vacio>Todavía no hay registros.</Vacio> : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead><tr><th>{etiqueta}</th>{conDescripcion ? <th>Descripción</th> : <th>Estado</th>}<th></th></tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item[idCampo]}>
                    <td className="fuerte">{item.nombre}</td>
                    {conDescripcion ? <td>{item.descripcion || '—'}</td> : <td>{item.activo ? <span className="badge badge-exito">Activo</span> : <span className="badge badge-neutro">Inactivo</span>}</td>}
                    <td className="derecha">
                      <div className="acciones" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-secundario btn-chico" onClick={() => setEdicion(item)}>Editar</button>
                        {item.activo === false
                          ? <button className="btn btn-secundario btn-chico" onClick={() => reactivar(item)}>Activar</button>
                          : <button className="btn btn-peligro btn-chico" onClick={() => eliminar(item)}>Eliminar</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {edicion && (
        <Modal titulo={edicion[idCampo] ? `Editar ${etiqueta.toLowerCase()}` : `Nueva ${etiqueta.toLowerCase()}`} onCerrar={() => setEdicion(null)}>
          <form onSubmit={guardar}>
            <div className="campo"><label htmlFor="nombre">Nombre</label><input id="nombre" name="nombre" className="input" required defaultValue={edicion.nombre} /></div>
            {conDescripcion && <div className="campo"><label htmlFor="descripcion">Descripción</label><textarea id="descripcion" name="descripcion" className="input" defaultValue={edicion.descripcion} /></div>}
            <button className="btn">Guardar</button>
          </form>
        </Modal>
      )}
    </>
  )
}

export const Categorias = () => <ListaSimple titulo="Categorías" etiqueta="Categoría" ruta="/categories" idCampo="id_categoria" conDescripcion />
export const Sabores = () => <ListaSimple titulo="Sabores y variedades" etiqueta="Variedad" ruta="/flavors" idCampo="id_sabor" />
