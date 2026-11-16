// Prints exact review rows containing a phrase, so quotes in fixes.md are copied verbatim.
// Usage: node quotes.mjs <reviews.csv> <phrase>...
import { readFileSync } from 'node:fs'

const [file, ...phrases] = process.argv.slice(2)
const rows = readFileSync(file, 'utf8').trim().split('\n').slice(1).map((line) => {
  const cells = [...line.matchAll(/"((?:[^"]|"")*)"/g)].map((m) => m[1].replace(/""/g, '"'))
  return { url: cells[1], date: cells[2], rating: cells[3], helpful: cells[4], text: cells[5] }
})
for (const p of phrases) {
  const hits = rows.filter((r) => r.text.toLowerCase().includes(p.toLowerCase()))
  console.log(`\n## "${p}" -> ${hits.length}`)
  for (const r of hits.slice(0, 2)) console.log(`${r.rating}* ${r.date} id=${r.url.split('reviewId=')[1]}\n${r.text.slice(0, 420)}`)
}
