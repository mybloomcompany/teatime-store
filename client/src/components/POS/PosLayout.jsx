import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { Cargando, Mensaje } from '../General'

// Estas pantallas funcionan aunque no haya una caja abierta.
const SIN_CAJA = ['/pos/open', '/pos/cash/history', '/pos/sales', '/pos/stock']

function PosLayout() {
  const { usuario, logout } = useAuth()
  const [sesion, setSesion] = useState(undefined)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const recargarSesion = useCallback(async () => {
    try {
      const { data } = await api.get('/pos/sessions/current')
      setSesion(data.data)
      return data.data
    } catch (err) {
      setError(mensajeDeError(err))
      return null
    }
  }, [])

  useEffect(() => { recargarSesion() }, [recargarSesion])

  const permitidaSinCaja = SIN_CAJA.includes(pathname) || pathname.startsWith('/pos/ticket') || /^\/pos\/cash\/\d+/.test(pathname)

  useEffect(() => {
    if (sesion === null && !permitidaSinCaja) navigate('/pos/open', { replace: true })
  }, [sesion, permitidaSinCaja, navigate])

  const salir = () => { logout(); navigate('/login') }

  return (
    <>
      <header className="pos-header">
        <Link to="/pos" className="logo">TEATIME</Link>
        <span className="pos-sub">PUNTO DE VENTA</span>
        <nav className="pos-nav">
          <NavLink to="/pos" end>Venta</NavLink>
          <NavLink to="/pos/sales">Historial</NavLink>
          <NavLink to="/pos/cash" end>Caja</NavLink>
          <NavLink to="/pos/cash/history">Sesiones</NavLink>
          <NavLink to="/pos/stock">Stock</NavLink>
        </nav>
        {sesion
          ? <span className="badge badge-exito" style={{ background: 'white' }}>Caja abierta</span>
          : <span className="badge badge-error" style={{ background: 'white' }}>Caja cerrada</span>}
        <span style={{ fontSize: 12 }}>{usuario.nombre} {usuario.apellido}{sesion ? ` · ${sesion.caja?.nombre}` : ''}</span>
        {sesion
          ? <Link to="/pos/cash" className="btn btn-peligro btn-chico">Cerrar caja</Link>
          : <Link to="/pos/open" className="btn btn-tostado btn-chico">Abrir caja</Link>}
        <button className="btn btn-secundario btn-chico" onClick={salir}>Salir</button>
      </header>
      <main className="pos-cuerpo">
        <Mensaje>{error}</Mensaje>
        {sesion === undefined && !error ? <Cargando /> : <Outlet context={{ sesion, recargarSesion }} />}
      </main>
    </>
  )
}

export default PosLayout
