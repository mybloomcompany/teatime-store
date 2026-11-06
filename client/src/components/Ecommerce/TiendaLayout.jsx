import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Icono, inicioDeRol } from '../General'
import { useAuth } from '../../context/AuthContext'

function Navbar() {
  const { usuario, cantidadCarrito } = useAuth()
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const navigate = useNavigate()

  const buscar = (e) => {
    e.preventDefault()
    navigate(`/products?search=${encodeURIComponent(busqueda.trim())}`)
    setAbierto(false)
  }

  const cuenta = !usuario ? '/login' : usuario.rol === 'cliente' ? '/profile' : inicioDeRol(usuario.rol)

  return (
    <header className="navbar">
      <Link to="/" className="logo">TEATIME</Link>
      <button className="btn-icono navbar-menu" style={{ background: 'none', border: 0, color: 'white', cursor: 'pointer' }} aria-label="Abrir menú" onClick={() => setAbierto(!abierto)}>
        <Icono nombre="menu" />
      </button>
      <nav className={`navbar-links ${abierto ? 'abierto' : ''}`} onClick={() => setAbierto(false)}>
        <NavLink to="/" end>Inicio</NavLink>
        <NavLink to="/products">Productos</NavLink>
        <NavLink to="/promotions">Promociones</NavLink>
        <NavLink to="/faq">Preguntas frecuentes</NavLink>
      </nav>
      <form onSubmit={buscar} role="search" style={{ display: 'contents' }}>
        <input className="navbar-busqueda" placeholder="Buscar tés premium..." aria-label="Buscar productos" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </form>
      <div className="navbar-iconos">
        <Link to="/favorites" aria-label="Favoritos"><Icono nombre="corazon" /></Link>
        <Link to={cuenta} aria-label="Mi cuenta"><Icono nombre="usuario" /></Link>
        <Link to="/cart" aria-label="Carrito">
          <Icono nombre="carrito" />
          {cantidadCarrito > 0 && <span className="contador">{cantidadCarrito}</span>}
        </Link>
      </div>
    </header>
  )
}

function Pie() {
  return (
    <footer className="pie">
      <div className="contenedor">
        <div className="pie-columnas">
          <div>
            <div className="logo" style={{ marginBottom: 8 }}>TEATIME</div>
            <p>Aroma, sabor y bienestar. Tés seleccionados para tu ritual diario.</p>
          </div>
          <div>
            <h4>CATEGORÍAS</h4>
            <Link to="/products?search=Tés">Tés</Link>
            <Link to="/products?search=Hebras">Hebras</Link>
            <Link to="/products?search=Accesorios">Accesorios</Link>
          </div>
          <div>
            <h4>MI CUENTA</h4>
            <Link to="/login">Ingresar</Link>
            <Link to="/register">Registrarse</Link>
            <Link to="/orders">Mis pedidos</Link>
          </div>
          <div>
            <h4>AYUDA</h4>
            <Link to="/faq">Preguntas frecuentes</Link>
            <Link to="/promotions">Promociones</Link>
          </div>
        </div>
        <div className="pie-legal">
          <span>© 2026 TeaTime Store. Todos los derechos reservados.</span>
          <span>Diseñado y desarrollado por MYBLOOM</span>
        </div>
      </div>
    </footer>
  )
}

function TiendaLayout() {
  return (
    <div className="tienda">
      <Navbar />
      <main className="principal">
        <div className="contenedor"><Outlet /></div>
      </main>
      <Pie />
    </div>
  )
}

export default TiendaLayout
