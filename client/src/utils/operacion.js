// Evita duplicar operaciones ante reintentos.
// La clave se genera en el primer intento y se conserva hasta tener una respuesta definitiva.
const generarClave = () => {
  if (crypto.randomUUID) return crypto.randomUUID()
  // Alternativa para sitios sin HTTPS, donde randomUUID no está disponible.
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export const operacionPendiente = (nombre) => {
  const guardada = sessionStorage.getItem(`operacion_${nombre}`)
  return guardada ? JSON.parse(guardada) : null
}

export const descartarOperacion = (nombre) => sessionStorage.removeItem(`operacion_${nombre}`)

// Sin respuesta del servidor o con un error 5xx no se sabe si se guardó: se reintenta con la misma clave.
export const esResultadoIncierto = (error) => !error.response || error.response.status >= 500

export async function ejecutarOperacion(nombre, datos, enviar) {
  const pendiente = operacionPendiente(nombre)
  const operacion = pendiente || { clave: generarClave(), datos }
  sessionStorage.setItem(`operacion_${nombre}`, JSON.stringify(operacion))

  try {
    const respuesta = await enviar({ ...operacion.datos, clave_operacion: operacion.clave })
    descartarOperacion(nombre)
    return respuesta
  } catch (error) {
    // Un 4xx es definitivo: nada se guardó y el usuario puede corregir los datos.
    if (!esResultadoIncierto(error)) descartarOperacion(nombre)
    throw error
  }
}
