// El ticket en curso se conserva si se recarga la página o se pasa a la pantalla de cobro.
export const TICKET_VACIO = { items: [], nota: '', codigo: '', descuento_porcentaje: 0 }

export const leerTicket = () => {
  const guardado = sessionStorage.getItem('pos_ticket')
  return guardado ? JSON.parse(guardado) : TICKET_VACIO
}

export const guardarTicket = (ticket) => sessionStorage.setItem('pos_ticket', JSON.stringify(ticket))
export const vaciarTicket = () => sessionStorage.removeItem('pos_ticket')
