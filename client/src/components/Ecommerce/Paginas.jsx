import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { useAuth } from '../../context/AuthContext'
import { fecha } from '../../utils/formato'
import { Cargando, Estado, Mensaje, Vacio, inicioDeRol } from '../General'
import TarjetaProducto from './TarjetaProducto'

// ===================== Login y registro =====================

export function Login() {
  const { login, usuario } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [ver, setVer] = useState(false)
  const [error, setError] = useState('')

  if (usuario) return <Navigate to={inicioDeRol(usuario.rol)} replace />

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const nuevo = await login(email, contrasena)
      navigate(inicioDeRol(nuevo.rol))
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  return (
    <form className="tarjeta formulario-cuenta" onSubmit={enviar}>
      <h1 style={{ textAlign: 'center', marginBottom: 20 }}>Iniciar sesión</h1>
      <Mensaje>{error}</Mensaje>
      <div className="campo">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" className="input" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor="contrasena">Contraseña</label>
        <input id="contrasena" type={ver ? 'text' : 'password'} className="input" autoComplete="current-password" required value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
        <label className="check" style={{ marginTop: 6 }}><input type="checkbox" checked={ver} onChange={() => setVer(!ver)} /> Mostrar contraseña</label>
      </div>
      <button className="btn btn-bloque">Iniciar sesión</button>
      <p className="tenue" style={{ textAlign: 'center', marginTop: 14 }}>
        ¿No tenés cuenta aún? <Link to="/register" className="fuerte">Crear cuenta</Link>
      </p>
    </form>
  )
}

export function Registro() {
  const { registrar, usuario } = useAuth()
  const navigate = useNavigate()
  const [datos, setDatos] = useState({ nombre: '', apellido: '', email: '', telefono: '', contrasena: '', confirmar: '' })
  const [error, setError] = useState('')

  if (usuario) return <Navigate to={inicioDeRol(usuario.rol)} replace />

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value })

  const enviar = async (e) => {
    e.preventDefault()
    if (datos.contrasena !== datos.confirmar) return setError('Las contraseñas no coinciden')
    setError('')
    try {
      const cuenta = { ...datos }
      delete cuenta.confirmar
      await registrar(cuenta)
      navigate('/')
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  return (
    <form className="tarjeta formulario-cuenta" onSubmit={enviar}>
      <h1 style={{ textAlign: 'center', marginBottom: 20 }}>Crear cuenta</h1>
      <Mensaje>{error}</Mensaje>
      <div className="fila">
        <div className="campo"><label htmlFor="nombre">Nombre</label><input id="nombre" name="nombre" className="input" required value={datos.nombre} onChange={cambiar} /></div>
        <div className="campo"><label htmlFor="apellido">Apellido</label><input id="apellido" name="apellido" className="input" required value={datos.apellido} onChange={cambiar} /></div>
      </div>
      <div className="campo"><label htmlFor="email">Email</label><input id="email" name="email" type="email" className="input" required value={datos.email} onChange={cambiar} /></div>
      <div className="campo"><label htmlFor="telefono">Teléfono</label><input id="telefono" name="telefono" className="input" value={datos.telefono} onChange={cambiar} /></div>
      <div className="campo"><label htmlFor="contrasena">Contraseña (mínimo 8 caracteres)</label><input id="contrasena" name="contrasena" type="password" minLength={8} autoComplete="new-password" className="input" required value={datos.contrasena} onChange={cambiar} /></div>
      <div className="campo"><label htmlFor="confirmar">Confirmar contraseña</label><input id="confirmar" name="confirmar" type="password" autoComplete="new-password" className="input" required value={datos.confirmar} onChange={cambiar} /></div>
      <button className="btn btn-bloque">Registrarme</button>
      <p className="tenue" style={{ textAlign: 'center', marginTop: 14 }}>
        ¿Ya tenés una cuenta? <Link to="/login" className="fuerte">Iniciar sesión</Link>
      </p>
    </form>
  )
}

// ===================== Perfil =====================

export function Perfil() {
  const { usuario, setUsuario, logout } = useAuth()
  const navigate = useNavigate()
  const [editando, setEditando] = useState(false)
  const [datos, setDatos] = useState({ nombre: usuario.nombre, apellido: usuario.apellido, telefono: usuario.telefono || '', contrasena: '' })
  const [pedidos, setPedidos] = useState(null)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')

  useEffect(() => {
    api.get('/me/orders?limit=5').then(({ data }) => setPedidos(data.data)).catch((err) => setError(mensajeDeError(err)))
  }, [])

  const cambiar = (e) => setDatos({ ...datos, [e.target.name]: e.target.value })

  const guardar = async (e) => {
    e.preventDefault()
    setError(''); setExito('')
    try {
      const { data } = await api.patch('/auth/me', datos)
      setUsuario(data.data)
      setEditando(false)
      setDatos({ ...datos, contrasena: '' })
      setExito('Datos actualizados')
    } catch (err) {
      setError(mensajeDeError(err))
    }
  }

  const salir = () => { logout(); navigate('/') }

  return (
    <>
      <p className="etiqueta-seccion">Inicio &gt; Mi cuenta</p>
      <h1 style={{ marginBottom: 20 }}>Hola, {usuario.nombre}</h1>
      <Mensaje>{error}</Mensaje>
      <Mensaje tipo="exito">{exito}</Mensaje>
      <div className="dos-columnas" style={{ gridTemplateColumns: 'minmax(260px, 1fr) minmax(0, 2fr)' }}>
        <div className="tarjeta">
          <p className="etiqueta-seccion" style={{ color: 'var(--tostado)', marginBottom: 12 }}>Datos personales</p>
          {editando ? (
            <form onSubmit={guardar}>
              <div className="campo"><label htmlFor="nombre">Nombre</label><input id="nombre" name="nombre" className="input" required value={datos.nombre} onChange={cambiar} /></div>
              <div className="campo"><label htmlFor="apellido">Apellido</label><input id="apellido" name="apellido" className="input" required value={datos.apellido} onChange={cambiar} /></div>
              <div className="campo"><label htmlFor="telefono">Teléfono</label><input id="telefono" name="telefono" className="input" value={datos.telefono} onChange={cambiar} /></div>
              <div className="campo"><label htmlFor="contrasena">Nueva contraseña (opcional)</label><input id="contrasena" name="contrasena" type="password" minLength={8} autoComplete="new-password" className="input" value={datos.contrasena} onChange={cambiar} /></div>
              <div className="acciones">
                <button className="btn btn-chico">Guardar</button>
                <button type="button" className="btn btn-secundario btn-chico" onClick={() => setEditando(false)}>Cancelar</button>
              </div>
            </form>
          ) : (
            <>
              <p className="fuerte">Nombre y apellido</p><p style={{ marginBottom: 10 }}>{usuario.nombre} {usuario.apellido}</p>
              <p className="fuerte">Email</p><p style={{ marginBottom: 10 }}>{usuario.email}</p>
              <p className="fuerte">Teléfono</p><p style={{ marginBottom: 16 }}>{usuario.telefono || '—'}</p>
              <div className="acciones">
                <button className="btn btn-secundario btn-chico" onClick={() => setEditando(true)}>Editar</button>
                <button className="btn btn-tostado btn-chico" onClick={salir}>Cerrar sesión</button>
              </div>
            </>
          )}
        </div>
        <div className="tarjeta" style={{ marginTop: 0 }}>
          <div className="encabezado" style={{ alignItems: 'center', marginBottom: 12 }}>
            <h3>Pedidos recientes</h3>
            <Link to="/orders" className="btn btn-secundario btn-chico">Ver todos</Link>
          </div>
          {!pedidos ? <Cargando /> : pedidos.length === 0 ? <Vacio>Todavía no realizaste ningún pedido.</Vacio> : (
            <div className="tabla-contenedor">
              <table className="tabla"><tbody>
                {pedidos.map((p) => (
                  <tr key={p.id_compra}>
                    <td className="fuerte"><Link to={`/orders/${p.id_compra}`}>#TT-{String(p.id_compra).padStart(5, '0')}</Link></td>
                    <td>{fecha(p.fecha)}</td>
                    <td><Estado valor={p.estado} /></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ===================== Favoritos =====================

export function Favoritos() {
  const [productos, setProductos] = useState(null)
  const [error, setError] = useState('')

  const cargar = () => api.get('/favorites').then(({ data }) => setProductos(data.data)).catch((err) => setError(mensajeDeError(err)))
  useEffect(() => { cargar() }, [])

  return (
    <>
      <p className="etiqueta-seccion">Inicio &gt; Favoritos</p>
      <h1 style={{ marginBottom: 20 }}>Mis favoritos</h1>
      <Mensaje>{error}</Mensaje>
      {!productos && !error && <Cargando />}
      {productos?.length === 0 && <Vacio>Todavía no guardaste ningún producto. <Link to="/products" className="fuerte">Explorar productos</Link></Vacio>}
      <div className="grilla-productos">
        {productos?.map((p) => <TarjetaProducto key={p.id_producto} producto={p} esFavorito onCambioFavorito={cargar} />)}
      </div>
    </>
  )
}

// ===================== Promociones =====================

export function Promociones() {
  const [promociones, setPromociones] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/promotions').then(({ data }) => setPromociones(data.data)).catch((err) => setError(mensajeDeError(err)))
  }, [])

  return (
    <>
      <p className="etiqueta-seccion" style={{ color: 'var(--tostado)' }}>Beneficios</p>
      <h1 style={{ marginBottom: 20 }}>Promociones vigentes</h1>
      <Mensaje>{error}</Mensaje>
      {!promociones && !error && <Cargando />}
      {promociones?.length === 0 && <Vacio>No hay promociones vigentes en este momento.</Vacio>}
      <div className="grilla-productos" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
        {promociones?.map((p) => (
          <article key={p.id_promocion} className="tarjeta" style={{ background: 'var(--arena)', marginTop: 0 }}>
            <h3 style={{ color: 'var(--tostado)' }}>{p.nombre}</h3>
            <p style={{ fontFamily: 'var(--titulos)', fontSize: 34, fontWeight: 700, color: 'var(--texto-fuerte)' }}>{Math.round(p.porcentaje_descuento)}% OFF</p>
            <p style={{ marginBottom: 10 }}>{p.descripcion}</p>
            {p.codigo && <p className="fuerte" style={{ marginBottom: 10 }}>Usá el código {p.codigo}</p>}
            <p className="tenue">Hasta el {new Date(`${p.fecha_fin}T12:00:00`).toLocaleDateString('es-AR')}</p>
            <p className="tenue" style={{ margin: '6px 0 12px' }}>{p.productos.map((x) => x.nombre).join(' · ')}</p>
            <Link to="/products?promo=1" className="btn btn-chico">Ver productos</Link>
          </article>
        ))}
      </div>
    </>
  )
}

// ===================== Preguntas frecuentes =====================

const PREGUNTAS = [
  ['¿Cómo retiro mi pedido?', 'Todos los pedidos se retiran en el local de TeaTime Store, en CABA. Te avisamos el estado desde la sección Mis pedidos.'],
  ['¿Cómo pago una compra online?', 'Por ahora, con el QR de Mercado Pago del comercio. El pedido se confirma cuando el personal verifica el cobro.'],
  ['¿Qué pasa si no pago mi pedido?', 'Queda pendiente de pago. Podés cancelarlo desde el detalle del pedido y los productos vuelven a estar disponibles.'],
  ['¿Puedo combinar promociones?', 'No. Si un producto tiene más de una promoción vigente, se aplica la de mayor descuento.'],
  ['¿Cuáles son los horarios?', 'Lunes a viernes de 8 a 17 hs y sábados de 8 a 15 hs.']
]

export function Preguntas() {
  return (
    <>
      <p className="etiqueta-seccion" style={{ color: 'var(--tostado)' }}>Ayuda</p>
      <h1 style={{ marginBottom: 20 }}>Preguntas frecuentes</h1>
      {PREGUNTAS.map(([pregunta, respuesta]) => (
        <details key={pregunta} className="tarjeta">
          <summary className="fuerte" style={{ cursor: 'pointer' }}>{pregunta}</summary>
          <p style={{ marginTop: 10 }}>{respuesta}</p>
        </details>
      ))}
    </>
  )
}

export function NoEncontrada() {
  return <Vacio><h1>Página no encontrada</h1><p style={{ margin: '10px 0' }}>La página que buscás no existe.</p><Link to="/" className="btn">Volver al inicio</Link></Vacio>
}
