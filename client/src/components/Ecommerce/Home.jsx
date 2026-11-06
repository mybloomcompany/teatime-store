import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api, { mensajeDeError } from '../../api/axios'
import { Cargando, Icono, Mensaje } from '../General'
import TarjetaProducto from './TarjetaProducto'
import { useFavoritos } from './useFavoritos'

const VARIEDADES = [
  ['Té negro', '/img/te-negro.png'],
  ['Té verde', '/img/te-verde.png'],
  ['Boldo', '/img/boldo.png'],
  ['Tilo', '/img/tilo.png'],
  ['Manzanilla', '/img/manzanilla.png'],
  ['Frutos rojos', '/img/frutos-rojos.png']
]

function Home() {
  const [productos, setProductos] = useState(null)
  const [error, setError] = useState('')
  const favoritos = useFavoritos()

  useEffect(() => {
    api.get('/products?limit=4')
      .then(({ data }) => setProductos(data.data))
      .catch((err) => setError(mensajeDeError(err)))
  }, [])

  return (
    <>
      <section className="hero">
        <div className="hero-texto">
          <h1>Disfrutá nuestra selección especial</h1>
          <p style={{ marginBottom: 20 }}>Tés finos, hebras e infusiones elegidas para acompañar tu ritual diario.</p>
          <Link to="/products" className="btn">Explorar productos →</Link>
        </div>
      </section>

      <section className="seccion">
        <p className="etiqueta-seccion" style={{ color: 'var(--tostado)' }}>Descubrí</p>
        <h2 style={{ marginBottom: 16 }}>Una infusión para cada momento</h2>
        <div className="tarjeta variedades">
          {VARIEDADES.map(([nombre, imagen]) => (
            <Link key={nombre} to={`/products?search=${encodeURIComponent(nombre)}`} className="variedad">
              <img src={imagen} alt="" />
              {nombre}
            </Link>
          ))}
          <Link to="/products" className="variedad"><span className="variedad-mas">+</span>Ver más</Link>
        </div>
      </section>

      <section className="seccion banners">
        <div className="banner" style={{ backgroundImage: 'url(/img/banner-tipos.jpg)' }}>
          <h2>Tipos de té</h2>
          <p>Variedades clásicas e infusiones seleccionadas según tu momento.</p>
          <Link to="/products?search=Infusiones" className="btn btn-chico">Explorar variedades</Link>
        </div>
        <div className="banner" style={{ backgroundImage: 'url(/img/banner-accesorios.jpg)' }}>
          <h2>Accesorios</h2>
          <p>Teteras, tazas e infusores de diseño para enriquecer tu experiencia.</p>
          <Link to="/products?search=Accesorios" className="btn btn-chico">Ver accesorios</Link>
        </div>
      </section>

      <section className="seccion">
        <div className="encabezado">
          <div>
            <p className="etiqueta-seccion" style={{ color: 'var(--tostado)' }}>Selección TeaTime</p>
            <h2>Productos destacados</h2>
          </div>
          <Link to="/products" className="btn btn-secundario btn-chico">→ Ver catálogo</Link>
        </div>
        <Mensaje>{error}</Mensaje>
        {!productos && !error ? <Cargando /> : (
          favoritos && (
            <div className="grilla-productos">
              {productos?.map((p) => <TarjetaProducto key={p.id_producto} producto={p} esFavorito={favoritos.has(p.id_producto)} />)}
            </div>
          )
        )}
      </section>

      <section className="tarjeta beneficios">
        <div><Icono nombre="bolsa" /><br />Retiro en el local</div>
        <div><Icono nombre="auriculares" /><br />Atención personalizada</div>
        <div><Icono nombre="hoja" /><br />Hebras 100% naturales</div>
        <div><Icono nombre="escudo" /><br />Compra fácil y segura</div>
      </section>

      <section className="seccion ubicacion">
        <div>
          <h2 style={{ color: 'var(--texto-fuerte)', marginBottom: 10 }}>Buenos Aires, CABA</h2>
          <p>Lunes a viernes de 8 a 17 hs</p>
          <p>Sábados de 8 a 15 hs</p>
        </div>
        <img src="/img/ceylon.jpg" alt="Hebras de té en la tienda TeaTime" />
      </section>
    </>
  )
}

export default Home
