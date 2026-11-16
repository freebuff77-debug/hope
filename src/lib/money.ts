export const CURRENCIES: { code: string; name: string }[] = [
  { code: 'IDR', name: 'Rupiah Indonesia' },
  { code: 'USD', name: 'Dolar AS' },
  { code: 'EUR', name: 'Euro' },
  { code: 'SGD', name: 'Dolar Singapura' },
  { code: 'MYR', name: 'Ringgit Malaysia' },
  { code: 'JPY', name: 'Yen Jepang' },
  { code: 'CNY', name: 'Yuan Tiongkok' },
  { code: 'KRW', name: 'Won Korea' },
  { code: 'SAR', name: 'Riyal Saudi' },
  { code: 'AUD', name: 'Dolar Australia' },
  { code: 'GBP', name: 'Pound Sterling' },
  { code: 'THB', name: 'Baht Thailand' },
  { code: 'PHP', name: 'Peso Filipina' },
  { code: 'VND', name: 'Dong Vietnam' },
  { code: 'INR', name: 'Rupee India' },
  { code: 'HKD', name: 'Dolar Hong Kong' },
  { code: 'TWD', name: 'Dolar Taiwan' },
  { code: 'AED', name: 'Dirham UEA' },
  { code: 'CHF', name: 'Franc Swiss' },
  { code: 'CAD', name: 'Dolar Kanada' },
]

// Currencies people write without cents, regardless of ISO minor units.
const ZERO_DECIMAL = new Set(['IDR', 'JPY', 'KRW', 'VND', 'TWD'])

export function decimals(currency: string): number {
  return ZERO_DECIMAL.has(currency) ? 0 : 2
}

export function toMinor(major: number, currency: string): number {
  return Math.round(major * 10 ** decimals(currency))
}

export function toMajor(minor: number, currency: string): number {
  return minor / 10 ** decimals(currency)
}

/** Parses user input like "12.500", "12,50", "1.234.567,89" into minor units. */
export function parseAmount(input: string, currency: string): number | null {
  const s = input.replace(/[^\d.,-]/g, '')
  if (!s || s === '-') return null
  let normalized: string
  if (decimals(currency) === 0) {
    normalized = s.replace(/[.,]/g, '')
  } else if (s.includes(',') && s.includes('.')) {
    // Whichever separator comes last is the decimal one.
    normalized = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else {
    const sep = s.includes(',') ? ',' : '.'
    const parts = s.split(sep)
    const isDecimal = parts.length === 2 && parts[1].length <= 2
    normalized = isDecimal ? parts.join('.') : parts.join('')
  }
  const n = Number(normalized)
  if (!Number.isFinite(n)) return null
  return toMinor(n, currency)
}

const fmtCache = new Map<string, Intl.NumberFormat>()

export function formatMoney(minor: number, currency: string, opts: { sign?: boolean; compact?: boolean } = {}): string {
  const d = decimals(currency)
  const key = `${currency}|${opts.compact ? 'c' : ''}`
  let f = fmtCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency,
      minimumFractionDigits: opts.compact ? 0 : d,
      maximumFractionDigits: opts.compact ? 1 : d,
      notation: opts.compact ? 'compact' : 'standard',
    })
    fmtCache.set(key, f)
  }
  const text = f.format(toMajor(Math.abs(minor), currency))
  if (minor < 0) return `−${text}`
  if (opts.sign && minor > 0) return `+${text}`
  return text
}

/** Plain number for an input field, e.g. 1250000 IDR -> "1.250.000". */
export function formatInput(minor: number, currency: string): string {
  const d = decimals(currency)
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: d }).format(toMajor(minor, currency))
}

export type Rates = Record<string, number>

/**
 * Converts minor units between currencies. `rates[code]` = how many units of the
 * base currency one unit of `code` is worth. Missing rates fall back to 1.
 */
export function convert(minor: number, from: string, to: string, base: string, rates: Rates): number {
  if (from === to) return minor
  const rate = (code: string) => (code === base ? 1 : rates[code] || 1)
  const major = toMajor(minor, from) * rate(from) / rate(to)
  return toMinor(major, to)
}
