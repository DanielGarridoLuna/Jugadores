const MEXICO_TIME_ZONE = "America/Mexico_City"

export function getMexicoDateInputValue(dateLike = new Date()) {
  const fecha = dateLike instanceof Date ? dateLike : new Date(dateLike)
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEXICO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(fecha)

  const year = partes.find(p => p.type === "year")?.value
  const month = partes.find(p => p.type === "month")?.value
  const day = partes.find(p => p.type === "day")?.value

  return `${year}-${month}-${day}`
}

export function formatEventDate(dateLike) {
  if (!dateLike) return "Sin fecha"
  const fecha = new Date(dateLike)
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: MEXICO_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(fecha)
}