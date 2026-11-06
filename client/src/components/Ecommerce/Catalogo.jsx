import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { Cargando, Mensaje, Paginacion, Vacio } from '../General'
import TarjetaProducto from './TarjetaProducto'
import { useFavoritos } from './useFavoritos'

const FILTROS_VACIOS = { flavor: '', brand: '', minPrice: '', maxPrice: '' }

function Catalogo() {
  const [params, setParams] = useSearchParams()
  const [categorias, setCategorias] = useState([])
  const [sabores, setSabores] = useState([])
  const [marcas, setMarcas] = useState([])
  const [resultado, setResultado] = useState(null)
  const [error, setError] = useState('')
  const [texto, setTexto] = useState(params.get('search') || '')
  const [filtros, setFiltros] = useState({
    flavor: params.get('flavor') || '',
    brand: params.get('brand') || '',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || ''
  })
  const favoritos = useFavoritos()

  useEffect(() => {
    Promise.all([api.get('/categories'), api.get('/flavors'), api.get('/products/brands')])
      .then(([c, s, m]) => {
        setCategorias(c.data.data)
        setSabores(s.data.data)
        setMarcas(m.data.data)
      })
      .catch((err) => setError(mensajeDeError(err)))
  }, [])

  const consulta = params.toString()
  useEffect(() => {
    setTexto(new URLSearchParams(consulta).get('search') || '')
    api.get(`/products?limit=12&${consulta}`)
      .then(({ data }) => { setResultado(data); setError('') })
      .catch((err) => setError(mensajeDeError(err)))
  }, [consulta])

  const actualizar = (cambios) => {
    const nuevos = new URLSearchParams(params)
    Object.entries({ page: '', ...cambios }).forEach(([k, v]) => (v ? nuevos.set(k, v) : nuevos.delete(k)))
    setParams(nuevos)
  }

  const cambiarFiltro = (e) => setFiltros({ ...filtros, [e.target.name]: e.target.value })

  const limpiar = () => {
    setFiltros(FILTROS_VACIOS)
    setTexto('')
    setParams({})
  }

  const categoriaActual = params.get('category') || ''

  return (
    <>
      <p className="etiqueta-seccion" style={{ color: 'var(--tostado)' }}>Tienda</p>
      <h1 style={{ marginBottom: 20 }}>Catálogo de hebras y accesorios</h1>

      <div className="tarjeta" style={{ marginBottom: 20 }}>
        <form className="acciones" style={{ marginBottom: 14 }} onSubmit={(e) => { e.preventDefault(); actualizar({ search: texto.trim() }) }}>
          <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Buscar por nombre, marca, sabor, SKU o categoría..." aria-label="Buscar" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <button className="btn">Buscar</button>
        </form>
        <div className="chips">
          <button className={`chip ${!categoriaActual && !params.get('promo') ? 'chip-activo' : ''}`} onClick={() => actualizar({ category: '', promo: '' })}>Todos</button>
          {categorias.map((c) => (
            <button key={c.id_categoria} className={`chip ${categoriaActual === String(c.id_categoria) ? 'chip-activo' : ''}`} onClick={() => actualizar({ category: String(c.id_categoria), promo: '' })}>{c.nombre}</button>
          ))}
          <button className={`chip ${params.get('promo') ? 'chip-activo' : ''}`} onClick={() => actualizar({ promo: '1', category: '' })}>Promociones</button>
        </div>
      </div>

      <div className="catalogo">
        <form className="tarjeta" onSubmit={(e) => { e.preventDefault(); actualizar(filtros) }}>
          <h3 style={{ marginBottom: 14 }}>Filtros</h3>
          <div className="campo">
            <label htmlFor="flavor">Sabor o variedad</label>
            <select id="flavor" name="flavor" className="input" value={filtros.flavor} onChange={cambiarFiltro}>
              <option value="">Todos</option>
              {sabores.map((s) => <option key={s.id_sabor} value={s.id_sabor}>{s.nombre}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="brand">Marca</label>
            <select id="brand" name="brand" className="input" value={filtros.brand} onChange={cambiarFiltro}>
              <option value="">Todas</option>
              {marcas.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="campo">
            <label htmlFor="minPrice">Precio mínimo</label>
            <input id="minPrice" name="minPrice" type="number" min="0" className="input" value={filtros.minPrice} onChange={cambiarFiltro} />
          </div>
          <div className="campo">
            <label htmlFor="maxPrice">Precio máximo</label>
            <input id="maxPrice" name="maxPrice" type="number" min="0" className="input" value={filtros.maxPrice} onChange={cambiarFiltro} />
          </div>
          <button className="btn btn-bloque" style={{ marginBottom: 8 }}>Aplicar filtros</button>
          <button type="button" className="btn btn-secundario btn-bloque" onClick={limpiar}>Limpiar filtros</button>
        </form>

        <div>
          <Mensaje>{error}</Mensaje>
          {!resultado && !error && <Cargando />}
          {resultado && (
            <>
              <div className="encabezado" style={{ marginBottom: 14, alignItems: 'center' }}>
                <span className="tenue">{resultado.pagination.total} productos encontrados</span>
                <select className="input" style={{ width: 'auto' }} aria-label="Ordenar" value={params.get('sort') || ''} onChange={(e) => actualizar({ sort: e.target.value })}>
                  <option value="">Orden: destacados</option>
                  <option value="precio_asc">Menor precio</option>
                  <option value="precio_desc">Mayor precio</option>
                  <option value="nombre">Nombre</option>
                  <option value="nuevos">Más nuevos</option>
                </select>
              </div>
              {resultado.data.length === 0 ? <Vacio>No encontramos productos con esos criterios.</Vacio> : favoritos && (
                <div className="grilla-productos">
                  {resultado.data.map((p) => <TarjetaProducto key={p.id_producto} producto={p} esFavorito={favoritos.has(p.id_producto)} />)}
                </div>
              )}
              <Paginacion datos={resultado.pagination} onCambiar={(page) => { const n = new URLSearchParams(params); n.set('page', page); setParams(n) }} />
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default Catalogo
