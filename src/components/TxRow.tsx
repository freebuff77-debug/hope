import { Link } from 'react-router-dom'
import { ArrowLeftRight, Image as ImageIcon, Repeat } from 'lucide-react'
import type { Transaction } from '../types'
import { useData } from '../state'
import { CategoryIcon, Money } from './ui'
import { fmtDayHeader, fmtTime, fromLocalISO } from '../lib/dates'
import { formatMoney } from '../lib/money'
import { inBase } from '../lib/finance'

export function TxRow({ tx }: { tx: Transaction }) {
  const data = useData()
  const wallet = data.wallets.find((w) => w.id === tx.walletId)
  const toWallet = data.wallets.find((w) => w.id === tx.toWalletId)
  const cat = data.categories.find((c) => c.id === tx.categoryId)
  const currency = wallet?.currency ?? data.settings.baseCurrency
  const title = tx.type === 'transfer' ? 'Transfer' : (cat?.name ?? 'Tanpa kategori')
  const sub = tx.type === 'transfer' ? `${wallet?.name ?? '?'} → ${toWallet?.name ?? '?'}` : [wallet?.name, tx.note].filter(Boolean).join(' · ')
  return (
    <Link to={`/tx/${tx.id}`} className="flex min-h-16 items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-2">
      {tx.type === 'transfer' ? (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted" aria-hidden>
          <ArrowLeftRight className="size-5" />
        </span>
      ) : (
        <CategoryIcon icon={cat?.icon} color={cat?.color} />
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="truncate">{title}</span>
          {tx.recurringId && <Repeat className="size-3.5 shrink-0 text-muted" aria-label="Berulang" />}
          {tx.photoIds.length > 0 && <ImageIcon className="size-3.5 shrink-0 text-muted" aria-label="Ada foto" />}
        </span>
        <span className="block truncate text-sm text-muted">{sub || fmtTime(fromLocalISO(tx.date))}</span>
      </span>
      <span className="text-right">
        <Money
          minor={tx.type === 'expense' ? -tx.amount : tx.amount}
          currency={currency}
          tone={tx.type === 'transfer' ? undefined : tx.type}
          sign={tx.type === 'income'}
          className="block font-semibold"
        />
        {currency !== data.settings.baseCurrency && tx.type !== 'transfer' && (
          <span className="tabular block text-xs text-muted">≈ {formatMoney(inBase(data, tx), data.settings.baseCurrency)}</span>
        )}
      </span>
    </Link>
  )
}

/** Transactions grouped under a day header with that day's net. Expects newest first. */
export function TxGroups({ txs }: { txs: Transaction[] }) {
  const data = useData()
  const groups: { key: string; items: Transaction[] }[] = []
  for (const t of txs) {
    const key = t.date.slice(0, 10)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(t)
    else groups.push({ key, items: [t] })
  }
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => {
        const net = g.items.reduce((s, t) => s + (t.type === 'income' ? inBase(data, t) : t.type === 'expense' ? -inBase(data, t) : 0), 0)
        return (
          <section key={g.key} aria-label={fmtDayHeader(fromLocalISO(g.key))}>
            <h3 className="flex items-baseline justify-between px-2 pb-1 text-xs font-semibold text-muted uppercase">
              <span>{fmtDayHeader(fromLocalISO(g.key))}</span>
              <Money minor={net} currency={data.settings.baseCurrency} sign className="normal-case" />
            </h3>
            <ul className="rounded-card border border-line bg-surface p-1">
              {g.items.map((t) => (
                <li key={t.id}>
                  <TxRow tx={t} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
