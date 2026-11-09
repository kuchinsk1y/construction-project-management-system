/** "KOWALSKI JAN" → "Kowalski Jan" (the journal keeps names in capitals) */
export function displayName(name: string) {
  if (name !== name.toUpperCase()) return name
  return name.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}
