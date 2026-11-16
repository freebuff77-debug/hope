import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useData } from '../state'
import { Button, CategoryIcon, ColorPicker, Confirm, Field, IconButton, IconPicker, Input, PageHeader, Segmented, Sheet } from '../components/ui'
import { COLORS, ICON_NAMES } from '../lib/icons'
import { deleteCategory, saveCategory } from '../db/actions'
import type { Category, CategoryType } from '../types'

function CategorySheet({ open, onClose, category, type }: { open: boolean; onClose: () => void; category?: Category; type: CategoryType }) {
  const data = useData()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('tag')
  const [color, setColor] = useState(COLORS[0])
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const used = category ? data.transactions.filter((t) => t.categoryId === category.id).length : 0

  useEffect(() => {
    if (!open) return
    setName(category?.name ?? '')
    setIcon(category?.icon ?? 'tag')
    setColor(category?.color ?? COLORS[Math.floor(Math.random() * COLORS.length)])
    setError('')
  }, [open, category])

  async function save() {
    const n = name.trim()
    if (!n) return setError('Beri nama kategori.')
    const t = category?.type ?? type
    if (data.categories.some((c) => c.type === t && c.id !== category?.id && c.name.toLowerCase() === n.toLowerCase())) return setError('Nama ini sudah dipakai.')
    await saveCategory({ id: category?.id, name: n, type: t, icon, color })
    onClose()
  }

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={category ? 'Ubah kategori' : `Kategori ${type === 'income' ? 'pemasukan' : 'pengeluaran'} baru`}
        footer={
          <div className="flex gap-2">
            {category && (
              <Button variant="danger" onClick={() => setConfirm(true)}>
                Hapus
              </Button>
            )}
            <Button className="flex-1" onClick={save}>
              Simpan
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <CategoryIcon icon={icon} color={color} size="lg" />
            <div className="flex-1">
              <Field label="Nama" error={error}>
                {(id) => <Input id={id} value={name} maxLength={40} placeholder="mis. Kopi, Parkir, Arisan" onChange={(e) => setName(e.target.value)} />}
              </Field>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Ikon</p>
            <IconPicker value={icon} onChange={setIcon} names={ICON_NAMES} color={color} />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-muted">Warna</p>
            <ColorPicker value={color} onChange={setColor} colors={COLORS} />
          </div>
        </div>
      </Sheet>
      <Confirm
        open={confirm}
        title={`Hapus ${category?.name}?`}
        text={used ? `${used} transaksi akan jadi "Tanpa kategori". Jumlahnya tidak berubah.` : 'Kategori ini belum dipakai.'}
        onClose={() => setConfirm(false)}
        onConfirm={async () => {
          await deleteCategory(category!.id)
          onClose()
        }}
      />
    </>
  )
}

export default function Categories() {
  const data = useData()
  const [type, setType] = useState<CategoryType>('expense')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Category | undefined>()
  const list = data.categories.filter((c) => c.type === type)
  const counts = new Map<string, number>()
  for (const t of data.transactions) if (t.categoryId) counts.set(t.categoryId, (counts.get(t.categoryId) ?? 0) + 1)

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Kategori"
        back
        actions={
          <IconButton
            label="Tambah kategori"
            onClick={() => {
              setEditing(undefined)
              setOpen(true)
            }}
          >
            <Plus className="size-6" />
          </IconButton>
        }
      />
      <div className="flex flex-col gap-4 px-4">
        <Segmented
          label="Jenis kategori"
          value={type}
          onChange={setType}
          options={[
            { value: 'expense', label: 'Pengeluaran' },
            { value: 'income', label: 'Pemasukan' },
          ]}
        />
        <ul className="rounded-card border border-line bg-surface p-1">
          {list.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => {
                  setEditing(c)
                  setOpen(true)
                }}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-surface-2"
              >
                <CategoryIcon icon={c.icon} color={c.color} />
                <span className="flex-1 truncate font-medium">{c.name}</span>
                <span className="text-xs text-muted">{counts.get(c.id) ?? 0} transaksi</span>
              </button>
            </li>
          ))}
        </ul>
        <Button
          variant="secondary"
          onClick={() => {
            setEditing(undefined)
            setOpen(true)
          }}
        >
          <Plus className="size-5" /> Tambah kategori
        </Button>
      </div>
      <CategorySheet open={open} onClose={() => setOpen(false)} category={editing} type={type} />
    </div>
  )
}
