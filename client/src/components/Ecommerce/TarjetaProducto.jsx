import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { moneda } from '../../utils/formato'
import { Icono } from '../General'

function TarjetaProducto({ producto, esFavorito = false, onCambioFavorito }) {
  const { usuario, actualizarCarrito } = useAuth()
  const [favorito, setFavorito] = useState(esFavorito)
  const [aviso, setAviso] = useState('')
  const navigate = useNavigate()
  const agotado = producto.stock === 0

  const exigirCliente = () => {
    if (usuario?.rol === 'cliente') return true
    if (!usuario) navigate('/login')
    else setAviso('Esta acción es solo para clientes')
    return false
  }

  const alternarFavorito = async () => {
    if (!exigirCliente()) return
    try {
      if (favorito) await api.delete(`/favorites/${producto.id_producto}`)
      else await api.post(`/favorites/${producto.id_producto}`)
      setFavorito(!favorito)
      onCambioFavorito?.()
    } catch (err) {
      setAviso(mensajeDeError(err))
    }
  }

  const agregar = async () => {
    if (!exigirCliente()) return
    try {
      await api.post('/cart/items', { id_producto: producto.id_producto, cantidad: 1 })
      await actualizarCarrito()
      setAviso('Agregado al carrito')
    } catch (err) {
      setAviso(mensajeDeError(err))
    }
  }

  const conPromo = producto.precio_unitario < producto.precio_lista

  return (
    <article className="producto">
      <Link to={`/products/${producto.id_producto}`}>
        <img className="producto-imagen" src={producto.imagen || '/favicon.svg'} alt={producto.nombre} loading="lazy" />
      </Link>
      {conPromo && <span className="badge badge-exito producto-promo">-{Math.round(producto.promocion.porcentaje)}%</span>}
      <button className={`producto-favorito ${favorito ? 'activo' : ''}`} aria-label={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'} onClick={alternarFavorito}>
        <Icono nombre="corazon" tam={15} relleno={favorito} />
      </button>
      <Link to={`/products/${producto.id_producto}`} className="producto-nombre">{producto.nombre}</Link>
      <p className="producto-marca">{[producto.marca, producto.presentacion].filter(Boolean).join(' · ')}</p>
      {agotado ? (
        <button className="btn btn-bloque" disabled style={{ background: 'var(--borde)', color: 'var(--texto)' }}>No disponible</button>
      ) : (
        <div className="producto-pie">
          <span className="precio">
            {conPromo && <span className="precio-anterior">{moneda(producto.precio_lista)}</span>}
            {moneda(producto.precio_unitario)}
          </span>
          <button className="btn btn-tostado btn-icono" aria-label={`Agregar ${producto.nombre} al carrito`} onClick={agregar}><Icono nombre="carrito" tam={17} /></button>
        </div>
      )}
      {aviso && <p className="tenue" style={{ marginTop: 6 }} role="status">{aviso}</p>}
    </article>
  )
}

export default TarjetaProducto
