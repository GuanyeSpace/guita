export function maskPhone(phone: string): string {
  if (!phone || phone.length !== 11) return phone
  return phone.slice(0, 3) + '****' + phone.slice(7)
}

export function formatDate(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
