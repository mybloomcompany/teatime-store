import { useEffect, useState } from 'react'
import api from '../../api/axios'
import { useAuth } from '../../context/AuthContext'

// Ids de los favoritos del cliente, para marcar los corazones en las tarjetas.
export function useFavoritos() {
  const { usuario } = useAuth()
  const [ids, setIds] = useState(null)

  useEffect(() => {
    if (usuario?.rol !== 'cliente') return
    api.get('/favorites').then(({ data }) => setIds(new Set(data.data.map((p) => p.id_producto))))
  }, [usuario])

  return usuario?.rol === 'cliente' ? ids : new Set()
}
