// Merges the review batches read from the Play Store dialog, dedupes them, and writes reviews.csv.
// Usage: node merge-reviews.mjs <out.csv> <batch.json>...
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const [out, ...files] = process.argv.slice(2)
const LISTING = 'https://play.google.com/store/apps/details?id=com.aniverseid.animelovers&hl=id&gl=ID'
const MONTHS = { Januari: 1, Februari: 2, Maret: 3, April: 4, Mei: 5, Juni: 6, Juli: 7, Agustus: 8, September: 9, Oktober: 10, November: 11, Desember: 12 }

const isoDate = (s) => {
  const m = /^(\d{1,2}) (\S+) (\d{4})$/.exec(s)
  if (!m || !MONTHS[m[2]]) return ''
  return `${m[3]}-${String(MONTHS[m[2]]).padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

const byId = new Map()
for (const f of files) {
  let data = JSON.parse(readFileSync(f, 'utf8'))
  if (typeof data === 'string') data = JSON.parse(data)
  for (const r of data.reviews ?? []) if (r.id && r.text && !byId.has(r.id)) byId.set(r.id, r)
}
const rows = [...byId.values()].sort((a, b) => isoDate(b.date).localeCompare(isoDate(a.date)))
const cell = (v) => `"${String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
const csv = ['source,url,date,rating,helpful,text', ...rows.map((r) => ['Google Play', `${LISTING}&reviewId=${r.id}`, isoDate(r.date), r.rating, r.helpful, r.text].map(cell).join(','))].join('\n')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, csv + '\n')

const count = {}
for (const r of rows) count[r.rating] = (count[r.rating] ?? 0) + 1
console.log('unique reviews:', rows.length, 'by rating:', JSON.stringify(count), 'dates:', isoDate(rows.at(-1).date), '->', isoDate(rows[0].date))
