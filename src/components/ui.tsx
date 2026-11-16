import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { iconFor } from '../lib/icons'
import { formatInput, formatMoney, parseAmount } from '../lib/money'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')
export { cx }

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function Button({ variant = 'primary', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...p}
      className={cx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition active:scale-[.98] disabled:opacity-50',
        variant === 'primary' && 'bg-accent text-accent-fg',
        variant === 'secondary' && 'bg-surface-2 text-fg',
        variant === 'ghost' && 'text-accent',
        variant === 'danger' && 'bg-expense/10 text-expense',
        className,
      )}
    />
  )
}

export function IconButton({ label, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} {...p} className={cx('grid size-11 place-items-center rounded-full text-fg hover:bg-surface-2', className)}>
      {children}
    </button>
  )
}

export function Card({ className, children, as: As = 'section' }: { className?: string; children: ReactNode; as?: 'section' | 'div' | 'li' }) {
  return <As className={cx('rounded-card border border-line bg-surface p-4', className)}>{children}</As>
}

export function PageHeader({ title, back, actions }: { title: string; back?: boolean; actions?: ReactNode }) {
  const nav = useNavigate()
  return (
    <header className="sticky top-safe z-10 flex min-h-14 items-center gap-1 bg-bg/90 px-2 backdrop-blur">
      {back ? (
        <IconButton label="Kembali" onClick={() => (history.length > 1 ? nav(-1) : nav('/'))}>
          <ChevronLeft className="size-6" />
        </IconButton>
      ) : (
        <span className="w-2" />
      )}
      <h1 className="flex-1 truncate text-lg font-bold">{title}</h1>
      {actions}
    </header>
  )
}

export function CategoryIcon({ icon, color, size = 'md' }: { icon?: string; color?: string; size?: 'sm' | 'md' | 'lg' }) {
  const Icon = iconFor(icon)
  const box = size === 'sm' ? 'size-8' : size === 'lg' ? 'size-12' : 'size-10'
  const ic = size === 'sm' ? 'size-4' : size === 'lg' ? 'size-6' : 'size-5'
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-full', box)} style={{ backgroundColor: `${color ?? '#94a3b8'}22`, color: color ?? '#94a3b8' }} aria-hidden>
      <Icon className={ic} />
    </span>
  )
}

export function Money({ minor, currency, tone, sign, className }: { minor: number; currency: string; tone?: 'income' | 'expense' | 'auto'; sign?: boolean; className?: string }) {
  const t = tone === 'auto' ? (minor < 0 ? 'expense' : 'income') : tone
  return (
    <span className={cx('tabular whitespace-nowrap', t === 'income' && 'text-income', t === 'expense' && 'text-expense', className)}>
      {formatMoney(minor, currency, { sign })}
    </span>
  )
}

export function Progress({ ratio, label }: { ratio: number; label: string }) {
  const pct = Math.min(100, Math.max(0, ratio * 100))
  const tone = ratio >= 1 ? 'bg-expense' : ratio >= 0.8 ? 'bg-warn' : 'bg-accent'
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}>
      <div className={cx('h-full rounded-full transition-[width]', tone)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <div className="mb-1 grid size-14 place-items-center rounded-full bg-accent-soft text-accent">{icon}</div>
      <p className="font-semibold">{title}</p>
      {text && <p className="max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

// ---------- form fields ----------

export function Field({ label, children, hint, error }: { label: string; children: (id: string) => ReactNode; hint?: string; error?: string }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-sm text-expense" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

const inputCls = 'min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-fg placeholder:text-muted/70 focus:border-accent focus:outline-none'

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(inputCls, p.className)} />
}

export function Select({ children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} className={cx(inputCls, 'appearance-auto', p.className)}>
      {children}
    </select>
  )
}

/** Money input: free typing, reformatted with thousand separators on blur. Value is minor units or null. */
export function AmountInput({ value, onChange, currency, id, autoFocus, large, label }: { value: number | null; onChange: (v: number | null) => void; currency: string; id?: string; autoFocus?: boolean; large?: boolean; label?: string }) {
  const [text, setText] = useState(value != null ? formatInput(value, currency) : '')
  const focused = useRef(false)
  useEffect(() => {
    if (!focused.current) setText(value != null ? formatInput(value, currency) : '')
  }, [value, currency])
  return (
    <div className={cx('flex items-center gap-2 rounded-xl border border-line bg-surface px-3 focus-within:border-accent', large ? 'min-h-16' : 'min-h-11')}>
      <span className="text-sm font-semibold text-muted">{currency}</span>
      <input
        id={id}
        aria-label={label}
        inputMode="decimal"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="0"
        value={text}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false
          setText(value != null ? formatInput(value, currency) : '')
        }}
        onChange={(e) => {
          setText(e.target.value)
          onChange(parseAmount(e.target.value, currency))
        }}
        className={cx('tabular w-full min-w-0 bg-transparent text-fg focus:outline-none', large ? 'text-3xl font-bold' : 'text-base')}
      />
    </div>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx('min-h-9 flex-1 rounded-lg px-2 text-sm font-semibold transition', o.value === value ? 'bg-surface text-fg shadow-sm' : 'text-muted')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex min-h-11 w-full items-center gap-3 text-left">
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </span>
      <span className={cx('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-accent' : 'bg-line')}>
        <span className={cx('absolute top-0.5 size-5 rounded-full bg-surface shadow transition-all', checked ? 'left-5.5' : 'left-0.5')} />
      </span>
    </button>
  )
}

// ---------- sheet (bottom dialog) ----------

export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => {
      const el = ref.current?.querySelector<HTMLElement>('[autofocus], input, select, textarea, button:not([data-close])')
      el?.focus()
    })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      prev?.focus?.()
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className="sheet-in flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-3xl bg-surface sm:rounded-3xl">
        <div className="flex items-center gap-2 px-4 pt-3">
          <h2 id={titleId} className="flex-1 text-lg font-bold">
            {title}
          </h2>
          <IconButton label="Tutup" data-close onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        {footer && <div className="pb-safe border-t border-line px-4 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/** Promise-free confirm dialog; render it and drive with `open`. */
export function Confirm({ open, title, text, confirmLabel = 'Hapus', onConfirm, onClose }: { open: boolean; title: string; text: string; confirmLabel?: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Batal
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted">{text}</p>
    </Sheet>
  )
}

export function ColorPicker({ value, onChange, colors }: { value: string; onChange: (c: string) => void; colors: string[] }) {
  return (
    <div role="radiogroup" aria-label="Warna" className="grid grid-cols-10 gap-2">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === value}
          aria-label={c}
          onClick={() => onChange(c)}
          className={cx('aspect-square rounded-full ring-offset-2 ring-offset-surface', c === value && 'ring-2 ring-fg')}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  )
}

export function IconPicker({ value, onChange, names, color }: { value: string; onChange: (n: string) => void; names: string[]; color: string }) {
  return (
    <div role="radiogroup" aria-label="Ikon" className="grid grid-cols-8 gap-2">
      {names.map((n) => {
        const Icon = iconFor(n)
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={n === value}
            aria-label={n}
            onClick={() => onChange(n)}
            className={cx('grid aspect-square place-items-center rounded-xl', n === value ? 'text-accent-fg' : 'bg-surface-2 text-muted')}
            style={n === value ? { backgroundColor: color } : undefined}
          >
            <Icon className="size-5" />
          </button>
        )
      })}
    </div>
  )
}
