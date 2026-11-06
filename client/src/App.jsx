import { Navigate, Route, Routes } from 'react-router-dom'
import { RutaProtegida } from './components/General'
import {
  TiendaLayout, Home, Catalogo, DetalleProducto, Promociones, Preguntas, Login, Registro,
  Perfil, Favoritos, Carrito, Checkout, MisPedidos, DetallePedido, NoEncontrada
} from './components/Ecommerce'
import { PosLayout, AperturaCaja, Venta, Cobro, TicketVenta, HistorialVentas, CajaActual, HistorialCaja, DetalleSesionPos, StockPos } from './components/POS'
import {
  AdminLayout, Dashboard, Productos, FormularioProducto, Categorias, Sabores, Stock, Pedidos, PedidoAdmin,
  Ventas, DetalleVentaAdmin, PromocionesAdmin, FormularioPromocion, Usuarios, Cajas, DetalleSesionAdmin, Reportes
} from './components/Admin'

const cliente = (pagina) => <RutaProtegida roles={['cliente']}>{pagina}</RutaProtegida>

function App() {
  return (
    <Routes>
      {/* ECOMMERCE */}
      <Route element={<TiendaLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Catalogo />} />
        <Route path="/products/:id" element={<DetalleProducto />} />
        <Route path="/promotions" element={<Promociones />} />
        <Route path="/faq" element={<Preguntas />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Registro />} />
        <Route path="/profile" element={cliente(<Perfil />)} />
        <Route path="/favorites" element={cliente(<Favoritos />)} />
        <Route path="/cart" element={cliente(<Carrito />)} />
        <Route path="/checkout" element={cliente(<Checkout />)} />
        <Route path="/orders" element={cliente(<MisPedidos />)} />
        <Route path="/orders/:id" element={cliente(<DetallePedido />)} />
        <Route path="*" element={<NoEncontrada />} />
      </Route>
      <Route path="/pos/login" element={<Navigate to="/login" replace />} />
      <Route path="/admin/login" element={<Navigate to="/login" replace />} />

      {/* POS: exclusivo de vendedores */}
      <Route path="/pos" element={<RutaProtegida roles={['vendedor']}><PosLayout /></RutaProtegida>}>
        <Route index element={<Venta />} />
        <Route path="open" element={<AperturaCaja />} />
        <Route path="payment" element={<Cobro />} />
        <Route path="ticket/:id" element={<TicketVenta />} />
        <Route path="sales" element={<HistorialVentas />} />
        <Route path="cash" element={<CajaActual />} />
        <Route path="cash/history" element={<HistorialCaja />} />
        <Route path="cash/:id" element={<DetalleSesionPos />} />
        <Route path="stock" element={<StockPos />} />
      </Route>

      {/* ADMINISTRACIÓN */}
      <Route path="/admin" element={<RutaProtegida roles={['administrador']}><AdminLayout /></RutaProtegida>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Productos />} />
        <Route path="products/new" element={<FormularioProducto />} />
        <Route path="products/:id/edit" element={<FormularioProducto />} />
        <Route path="categories" element={<Categorias />} />
        <Route path="flavors" element={<Sabores />} />
        <Route path="stock" element={<Stock />} />
        <Route path="orders" element={<Pedidos />} />
        <Route path="orders/:id" element={<PedidoAdmin />} />
        <Route path="sales" element={<Ventas />} />
        <Route path="sales/pos/:id" element={<DetalleVentaAdmin />} />
        <Route path="promotions" element={<PromocionesAdmin />} />
        <Route path="promotions/new" element={<FormularioPromocion />} />
        <Route path="promotions/:id/edit" element={<FormularioPromocion />} />
        <Route path="users" element={<Usuarios />} />
        <Route path="registers" element={<Cajas />} />
        <Route path="registers/sessions/:id" element={<DetalleSesionAdmin />} />
        <Route path="reports" element={<Reportes />} />
      </Route>
    </Routes>
  )
}

export default App
