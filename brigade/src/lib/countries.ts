/** Countries for the phone field: ISO code and calling code. The most used ones come first. */
export type Country = { iso: string; dial: string; name: string; flag: string }

const PINNED = ['PL', 'UA', 'LV', 'LT', 'DE']

const DIAL_CODES: Record<string, string> = {
  PL: '48', UA: '380', LV: '371', LT: '370', DE: '49',
  AL: '355', AM: '374', AT: '43', AZ: '994', BA: '387', BD: '880', BE: '32', BG: '359', BY: '375',
  CA: '1', CH: '41', CO: '57', CY: '357', CZ: '420', DK: '45', EE: '372', EG: '20', ES: '34',
  FI: '358', FR: '33', GB: '44', GE: '995', GR: '30', HR: '385', HU: '36', ID: '62', IE: '353',
  IN: '91', IT: '39', KG: '996', KZ: '7', LK: '94', LU: '352', MD: '373', ME: '382', MK: '389',
  MN: '976', MT: '356', NL: '31', NO: '47', NP: '977', PH: '63', PK: '92', PT: '351', RO: '40',
  RS: '381', SE: '46', SI: '386', SK: '421', TJ: '992', TM: '993', TR: '90', US: '1', UZ: '998',
  VN: '84',
}

const flagOf = (iso: string) => String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))

function regionName(iso: string, names: Intl.DisplayNames | null) {
  try {
    return names?.of(iso) ?? iso
  } catch {
    return iso
  }
}

export function buildCountries(): Country[] {
  let names: Intl.DisplayNames | null = null
  try {
    names = new Intl.DisplayNames(['pl'], { type: 'region' })
  } catch {
    names = null
  }
  const all = Object.entries(DIAL_CODES).map(([iso, dial]) => ({ iso, dial, name: regionName(iso, names), flag: flagOf(iso) }))
  const pinned = PINNED.map((iso) => all.find((c) => c.iso === iso)!)
  const rest = all.filter((c) => !PINNED.includes(c.iso)).sort((a, b) => a.name.localeCompare(b.name, 'pl'))
  return [...pinned, ...rest]
}

/** Matches by name, ISO code or calling code ("pol", "PL", "+48", "48") */
export function matchesCountry(country: Country, query: string) {
  const q = query.trim().toLowerCase().replace(/^\+/, '')
  if (!q) return true
  return country.name.toLowerCase().includes(q) || country.iso.toLowerCase() === q || country.dial.startsWith(q)
}
