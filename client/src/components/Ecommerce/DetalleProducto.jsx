import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { moneda } from '../../utils/formato'
import { Cantidad, Cargando, Estado, Icono, Mensaje } from '../General'
import { useFavoritos } from './useFavoritos'

function DetalleProducto() {
  const { id } = useParams()
  const { usuario, actualizarCarrito } = useAuth()
  const navigate = useNavigate()
  const favoritos = useFavoritos()
  const [producto, setProducto] = useState(null)
  const [cantidad, setCantidad] = useState(1)
  const [favorito, setFavorito] = useState(null)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    api.get(`/products/${id}`)
      .then(({ data }) => setProducto(data.data))
      .catch((err) => setError(mensajeDeError(err)))
  }, [id])

  const esFavorito = favorito ?? favoritos?.has(Number(id)) ?? false

  const exigirCliente = () => {
    if (!usuario) { navigate('/login'); return false }
    if (usuario.rol !== 'cliente') { setError('Esta acción es solo para clientes'); return false }
    return true
  }

  const agregar = async () => {
    if (!exigirCliente()) return
    setError(''); setExito('')
    try {
      await api.post('/cart/items', { id_producto: producto.id_producto, cantidad })
      await actualizarCarrito()
      setExito('Producto agregado al carrito')
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  const alternarFavorito = async () => {
    if (!exigirCliente()) return
    try {
      if (esFavorito) await api.delete(`/favorites/${id}`)
      else await api.post(`/favorites/${id}`)
      setFavorito(!esFavorito)
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  if (!producto) return error ? <Mensaje>{error}</Mensaje> : <Cargando />

  const agotado = producto.stock === 0
  const conPromo = producto.precio_unitario < producto.precio_lista

  return (
    <div className="detalle-producto">
      <img className="detalle-imagen" src={producto.imagen || '/favicon.svg'} alt={producto.nombre} />
      <div>
        <div style={{ marginBottom: 10 }}>
          {agotado ? <Estado valor="AGOTADO" /> : <span className="badge badge-exito">En stock</span>}
        </div>
        <h1>{producto.nombre}</h1>
        <p className="tenue" style={{ margin: '6px 0 14px' }}>
          {[producto.marca, producto.categoria?.nombre, producto.presentacion, producto.peso].filter(Boolean).join(' · ')}
        </p>
        <p className="precio" style={{ fontSize: 26 }}>{moneda(producto.precio_unitario)}</p>
        {conPromo && (
          <p className="tenue">
            <s>{moneda(producto.precio_lista)}</s> · {producto.promocion.nombre} (-{Math.round(producto.promocion.porcentaje)}%)
          </p>
        )}
        <p style={{ margin: '14px 0' }}>{producto.descripcion}</p>

        {producto.sabores?.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <label>Variedades</label>
            <div className="chips">{producto.sabores.map((s) => <span key={s.id_sabor} className="chip">{s.nombre}</span>)}</div>
          </div>
        )}

        <Mensaje>{error}</Mensaje>
        <Mensaje tipo="exito">{exito}</Mensaje>

        <label>Cantidad</label>
        <div className="acciones" style={{ marginBottom: 18 }}>
          <Cantidad valor={cantidad} maximo={producto.stock} deshabilitado={agotado} onCambiar={setCantidad} />
          <button className="btn btn-tostado" style={{ flex: 1 }} disabled={agotado} onClick={agregar}>
            <Icono nombre="carrito" tam={17} /> {agotado ? 'No disponible' : 'Agregar al carrito'}
          </button>
          <button className="btn btn-secundario btn-icono" aria-label={esFavorito ? 'Quitar de favoritos' : 'Agregar a favoritos'} onClick={alternarFavorito}>
            <Icono nombre="corazon" tam={17} relleno={esFavorito} />
          </button>
        </div>

        <div className="tarjeta">
          <p className="fuerte">Retiro en el local</p>
          <p className="tenue">Retirá tu pedido sin cargo en TeaTime Store, CABA, una vez confirmado el pago.</p>
        </div>
      </div>
    </div>
  )
}

export default DetalleProducto
