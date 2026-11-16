import { formatMoney } from '../lib/money'
import type { Bucket } from '../lib/finance'

export function Donut({ slices, size = 180, centerLabel, centerValue }: { slices: { value: number; color: string; label: string }[]; size?: number; centerLabel: string; centerValue: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const r = 15.9155 // circumference 100
  let offset = 25
  return (
    <figure className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 42 42" className="size-full" role="img" aria-label={`${centerLabel}: ${centerValue}`}>
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="5" />
        {total > 0 &&
          slices.map((s, i) => {
            const pct = (s.value / total) * 100
            const el = (
              <circle key={i} cx="21" cy="21" r={r} fill="none" stroke={s.color} strokeWidth="5" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={offset}>
                <title>{`${s.label}: ${Math.round(pct)}%`}</title>
              </circle>
            )
            offset -= pct
            return el
          })}
      </svg>
      <figcaption className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="text-xs text-muted">{centerLabel}</span>
        <span className="tabular text-base leading-tight font-bold break-all">{centerValue}</span>
      </figcaption>
    </figure>
  )
}

export function Bars({ buckets, currency }: { buckets: Bucket[]; currency: string }) {
  const max = Math.max(1, ...buckets.flatMap((b) => [b.income, b.expense]))
  const showEvery = buckets.length > 16 ? Math.ceil(buckets.length / 8) : 1
  return (
    <div>
      <div className="flex h-40 items-end gap-[2px]" role="img" aria-label="Grafik pemasukan dan pengeluaran">
        {buckets.map((b, i) => (
          <div key={i} className="group flex h-full min-w-0 flex-1 items-end justify-center gap-[1px]" title={`${b.label}\nMasuk ${formatMoney(b.income, currency)}\nKeluar ${formatMoney(b.expense, currency)}`}>
            <div className="w-1/2 max-w-3 rounded-t bg-income" style={{ height: `${(b.income / max) * 100}%`, minHeight: b.income ? 2 : 0 }} />
            <div className="w-1/2 max-w-3 rounded-t bg-expense" style={{ height: `${(b.expense / max) * 100}%`, minHeight: b.expense ? 2 : 0 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px] text-[10px] text-muted" aria-hidden>
        {buckets.map((b, i) => (
          <span key={i} className="min-w-0 flex-1 overflow-visible text-center whitespace-nowrap">
            {i % showEvery === 0 ? b.label : ''}
          </span>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-full bg-income" /> Pemasukan
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-full bg-expense" /> Pengeluaran
        </span>
      </div>
    </div>
  )
}
