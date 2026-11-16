// Generates every icon and splash image for Calm from code (no external artwork).
// Usage: pnpm icons
import { Resvg } from '@resvg/resvg-js'
import { mkdirSync, writeFileSync } from 'node:fs'

const FROM = '#8ac4ae' // sage
const TO = '#5b86b9' // mist blue
const INK = '#ffffff'

// A gentle hill made of game pieces: end ring, four quarter arcs, end ring.
// Four tiles wide and two tall, centred on (cx, cy).
function loop(cx, cy, cell, stroke) {
  const x0 = cx - cell * 2
  const y0 = cy - cell * 0.75 // optical centre: the ring row sits a little low
  const r = cell / 2
  const ring = Math.max(cell * 0.17, stroke * 0.85)
  const P = (x, y) => [x0 + x * cell, y0 + y * cell]
  const arc = (a, b, c) => {
    const delta = Math.atan2(b[1] - c[1], b[0] - c[0]) - Math.atan2(a[1] - c[1], a[0] - c[0])
    const sweep = ((delta + 3 * Math.PI) % (2 * Math.PI)) - Math.PI > 0 ? 1 : 0
    return `A${r} ${r} 0 0 ${sweep} ${b[0]} ${b[1]}`
  }
  const start = P(0.5 + ring / cell, 1.5)
  const d = [
    `M${start.join(' ')}`,
    `L${P(1, 1.5).join(' ')}`,
    arc(P(1, 1.5), P(1.5, 1), P(1, 1)),
    arc(P(1.5, 1), P(2, 0.5), P(2, 1)),
    arc(P(2, 0.5), P(2.5, 1), P(2, 1)),
    arc(P(2.5, 1), P(3, 1.5), P(3, 1)),
    `L${P(3.5 - ring / cell, 1.5).join(" ")}`,
  ].join(' ')
  const [lx, ly] = P(0.5, 1.5)
  const [rx, ry] = P(3.5, 1.5)
  return `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${stroke}" stroke-linecap="round"/>
  <circle cx="${lx}" cy="${ly}" r="${ring}" fill="none" stroke="${INK}" stroke-width="${stroke}"/>
  <circle cx="${rx}" cy="${ry}" r="${ring}" fill="none" stroke="${INK}" stroke-width="${stroke}"/>`
}

const gradient = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="${FROM}"/><stop offset="1" stop-color="${TO}"/></linearGradient></defs>`

const svg = (size, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${gradient}${body}</svg>`

function png(file, size, body) {
  const out = new Resvg(svg(size, body), { fitTo: { mode: 'width', value: size } }).render().asPng()
  writeFileSync(file, out)
}

mkdirSync('assets', { recursive: true })
mkdirSync('public', { recursive: true })

const S = 1024
const full = `<rect width="${S}" height="${S}" fill="url(#g)"/>${loop(S / 2, S / 2, 190, 56)}`
const rounded = `<rect width="${S}" height="${S}" rx="${S * 0.225}" fill="url(#g)"/>${loop(S / 2, S / 2, 190, 56)}`

// Android adaptive icon layers (the tool insets them to the visible zone).
png("assets/icon-only.png", S, rounded)
png('assets/icon-background.png', S, `<rect width="${S}" height="${S}" fill="url(#g)"/>`)
png("assets/icon-foreground.png", S, loop(S / 2, S / 2, 150, 46))
const splash = (n) => `<rect width="${n}" height="${n}" fill="url(#g)"/>${loop(n / 2, n / 2, 150, 42)}`
png('assets/splash.png', 2732, splash(2732))
png('assets/splash-dark.png', 2732, splash(2732))

// Web / in-app
png('public/logo.png', 256, `<g transform="scale(${256 / S})">${rounded}</g>`)
png('public/favicon.png', 64, `<g transform="scale(${64 / S})">${rounded}</g>`)
png('public/icon-512.png', 512, `<g transform="scale(${512 / S})">${rounded}</g>`)
console.log('icons written')
