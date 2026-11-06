import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ESTADOS } from '../../utils/formato'

const TRAZOS = {
  corazon: 'M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8z',
  usuario: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  carrito: 'M3 3h2l2.6 12.6a2 2 0 0 0 2 1.4h8.7a2 2 0 0 0 2-1.6L21.6 8H6M10 21h.01M18 21h.01',
  salir: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  menu: 'M3 6h18M3 12h18M3 18h18',
  panel: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  caja: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  etiqueta: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01',
  hoja: 'M11 20A7 7 0 0 1 4 13C4 7 9 3 20 3c0 11-4 17-9 17zM4 21c2-6 6-9 11-11',
  stock: 'M3 21V8l9-5 9 5v13M7 21v-9h10v9M7 16h10',
  bolsa: 'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  recibo: 'M4 2v20l3-2 2.5 2 2.5-2 2.5 2 2.5-2 3 2V2l-3 2-2.5-2L12 4 9.5 2 7 4zM8 9h8M8 13h8',
  usuarios: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  promo: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM15 9l-6 6M9 9h.01M15 15h.01',
  registradora: 'M2 7h20v14H2zM6 7V3h12v4M6 12h.01M10 12h.01M14 12h.01M18 12h.01M6 16h12',
  reportes: 'M3 3v18h18M8 17v-5M13 17V8M18 17v-9',
  campana: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  mas: 'M12 5v14M5 12h14',
  basura: 'M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
  camion: 'M1 3h15v13H1zM16 8h4l3 3v5h-7M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  auriculares: 'M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1v-7h3zM3 19a2 2 0 0 0 2 2h1v-7H3z',
  escudo: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4'
}

export function Icono({ nombre, tam = 20, relleno = false }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill={relleno ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={TRAZOS[nombre]} />
    </svg>
  )
}

export function Estado({ valor }) {
  const [texto, color] = ESTADOS[valor] || [valor, 'neutro']
  return <span className={`badge badge-${color}`}>{texto}</span>
}

export function Mensaje({ tipo = 'error', children }) {
  if (!children) return null
  return <div className={`mensaje mensaje-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>{children}</div>
}

export function Cargando() {
  return <div className="vacio">Cargando…</div>
}

export function Vacio({ children }) {
  return <div className="vacio">{children}</div>
}

export function Paginacion({ datos, onCambiar }) {
  if (!datos || datos.totalPages <= 1) return null
  return (
    <div className="paginacion no-imprimir">
      <span className="tenue">Página {datos.page} de {datos.totalPages} · {datos.total} resultados</span>
      <div className="acciones">
        <button className="btn btn-secundario btn-chico" disabled={datos.page <= 1} onClick={() => onCambiar(datos.page - 1)}>Anterior</button>
        <button className="btn btn-secundario btn-chico" disabled={datos.page >= datos.totalPages} onClick={() => onCambiar(datos.page + 1)}>Siguiente</button>
      </div>
    </div>
  )
}

export function Modal({ titulo, onCerrar, children }) {
  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <h3 style={{ marginBottom: 14 }}>{titulo}</h3>
        {children}
      </div>
    </div>
  )
}

export function Cantidad({ valor, maximo, onCambiar, deshabilitado }) {
  return (
    <div className="cantidad">
      <button type="button" aria-label="Restar" disabled={deshabilitado || valor <= 1} onClick={() => onCambiar(valor - 1)}>−</button>
      <span>{valor}</span>
      <button type="button" aria-label="Sumar" disabled={deshabilitado || (maximo !== undefined && valor >= maximo)} onClick={() => onCambiar(valor + 1)}>+</button>
    </div>
  )
}

// Controla el acceso por rol también en el frontend, aunque la API es quien lo garantiza.
export function RutaProtegida({ roles, children }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return <Cargando />
  if (!usuario) return <Navigate to="/login" replace />
  if (!roles.includes(usuario.rol)) return <Navigate to={inicioDeRol(usuario.rol)} replace />
  return children
}

export const inicioDeRol = (rol) => (rol === 'administrador' ? '/admin' : rol === 'vendedor' ? '/pos' : '/')
