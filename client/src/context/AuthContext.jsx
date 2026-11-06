import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [cargando, setCargando] = useState(Boolean(localStorage.getItem('token')))
  const [cantidadCarrito, setCantidadCarrito] = useState(0)

  const actualizarCarrito = useCallback(async () => {
    const { data } = await api.get('/cart')
    setCantidadCarrito(data.data.items.reduce((s, i) => s + i.cantidad, 0))
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('token')) return
    api.get('/auth/me')
      .then(({ data }) => {
        setUsuario(data.data)
        if (data.data.rol === 'cliente') actualizarCarrito()
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setCargando(false))
  }, [actualizarCarrito])

  const guardarSesion = ({ token, usuario: nuevo }) => {
    localStorage.setItem('token', token)
    setUsuario(nuevo)
    if (nuevo.rol === 'cliente') actualizarCarrito()
    return nuevo
  }

  const login = async (email, contrasena) => {
    const { data } = await api.post('/auth/login', { email, contrasena })
    return guardarSesion(data.data)
  }

  const registrar = async (datos) => {
    const { data } = await api.post('/auth/register', datos)
    return guardarSesion(data.data)
  }

  const logout = () => {
    localStorage.removeItem('token')
    sessionStorage.clear()
    setUsuario(null)
    setCantidadCarrito(0)
  }

  return (
    <AuthContext.Provider value={{ usuario, setUsuario, cargando, login, registrar, logout, cantidadCarrito, actualizarCarrito }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
