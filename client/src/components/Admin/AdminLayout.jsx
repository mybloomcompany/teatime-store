import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { Icono } from '../General'

const SECCIONES = [
  ['/admin', 'Dashboard', 'panel'],
  ['/admin/products', 'Productos', 'caja'],
  ['/admin/categories', 'Categorías', 'etiqueta'],
  ['/admin/flavors', 'Sabores', 'hoja'],
  ['/admin/stock', 'Stock', 'stock'],
  ['/admin/orders', 'Pedidos', 'bolsa'],
  ['/admin/sales', 'Ventas', 'recibo'],
  ['/admin/users', 'Usuarios', 'usuarios'],
  ['/admin/promotions', 'Promociones', 'promo'],
  ['/admin/registers', 'Cajas', 'registradora'],
  ['/admin/reports', 'Reportes', 'reportes']
]

function AdminLayout() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [pendientes, setPendientes] = useState(0)

  useEffect(() => {
    api.get('/dashboard/summary').then(({ data }) => setPendientes(data.data.pedidos_pendientes)).catch(() => {})
  }, [pathname])

  const salir = () => { logout(); navigate('/login') }
  const actual = SECCIONES.slice(1).find(([ruta]) => pathname.startsWith(ruta))?.[1] || 'Dashboard'

  return (
    <div className="admin">
      <aside className="sidebar">
        <Link to="/admin" className="logo">TEATIME</Link>
        <span className="pos-sub">ADMINISTRACIÓN</span>
        <nav>
          {SECCIONES.map(([ruta, nombre, icono]) => (
            <NavLink key={ruta} to={ruta} end={ruta === '/admin'}>
              <Icono nombre={icono} tam={17} /> {nombre}
              {nombre === 'Pedidos' && pendientes > 0 && <span className="contador">{pendientes}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="usuario-pie">
          <div><div className="fuerte" style={{ color: 'white' }}>{usuario.nombre} {usuario.apellido}</div><div style={{ color: 'var(--tostado)', fontSize: 11 }}>Administración</div></div>
          <button aria-label="Cerrar sesión" onClick={salir}><Icono nombre="salir" tam={18} /></button>
        </div>
      </aside>
      <main style={{ minWidth: 0 }}>
        <div className="tarjeta admin-header">
          <div><h2>{actual}</h2><p className="tenue">Administración / {actual}</p></div>
          <div className="acciones">
            <Link to="/admin/orders?estado=PENDIENTE_PAGO" className="btn btn-secundario btn-icono" aria-label={`${pendientes} pedidos pendientes`}><Icono nombre="campana" tam={17} /></Link>
            <Link to="/admin/products/new" className="btn">+ Nuevo producto</Link>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
