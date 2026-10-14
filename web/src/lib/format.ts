// pl-PL skips the thousands separator for 4-digit numbers ("4528,67"),
// so grouping is forced to always get "4 528,67".
const formatters = new Map<string, Intl.NumberFormat>()

function getFormatter(minFractionDigits: number, maxFractionDigits: number): Intl.NumberFormat {
  const key = `${minFractionDigits}-${maxFractionDigits}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: minFractionDigits,
      maximumFractionDigits: maxFractionDigits,
      useGrouping: 'always',
    })
    formatters.set(key, formatter)
  }
  return formatter
}

/** Formats a number with space-separated thousands, e.g. 4528.67 → "4 528,67". */
export function formatAmount(value: number | string | null | undefined, fractionDigits = 2, maxFractionDigits = fractionDigits): string {
  const num = typeof value === 'string' ? Number(value.replace(',', '.')) : value
  if (num == null || Number.isNaN(num)) return '-'
  return getFormatter(fractionDigits, maxFractionDigits).format(num)
}

/** Formats a money amount with its currency code, e.g. "4 528,67 PLN". */
export function formatMoney(value: number | string | null | undefined, currency?: string | null): string {
  const formatted = formatAmount(value)
  return formatted === '-' ? formatted : `${formatted} ${currency || 'PLN'}`
}
