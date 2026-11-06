import axios from 'axios'

// Una sola configuración para toda la aplicación: URL base y token.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = token
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const mensajeDeError = (error) =>
  error.response?.data?.error?.message || 'No se pudo conectar con el servidor. Intente nuevamente.'

export default api
