# Architecture: Kantong

Requirement that drives everything: **nothing paid**, for the user or for us.
So there is no server, no account and no paid API. The app is local-first.

| layer | choice | why |
| --- | --- | --- |
| app | React 19 + TypeScript + Vite | fast, free static build |
| install on Android | PWA (vite-plugin-pwa) | "Add to Home screen", works offline, no Play Store fee |
| styling | Tailwind v4, tokens as CSS variables | light + dark from one token set |
| storage | IndexedDB via Dexie | all data on the phone, photos as blobs |
| icons | lucide-react (ISC) | open icon set, nothing from the original |
| hosting | any static host (GitHub Pages, Cloudflare Pages, Netlify free) | $0 |

Deviations from the pack defaults: no Postgres/auth/payments/email because a
free local app needs none of them. Dates are stored as local
`YYYY-MM-DDTHH:mm` strings (single device, the user's own clock) and money as
integer minor units plus the wallet's currency.

## Tables (IndexedDB stores)

| store | key fields | indexes |
| --- | --- | --- |
| wallets | id, name, currency, initialBalance, color, icon, archived, order | order |
| categories | id, name, type, icon, color, order, archived | type, order |
| transactions | id, type, amount, walletId, toWalletId, toAmount, categoryId, date, note, photoIds, recurringId | date, walletId, toWalletId, categoryId, type |
| photos | id, blob | — |
| budgets | id, name, period, amount (base currency), categoryIds ([] = all) | — |
| recurring | id, template, frequency, interval, startDate, count, endDate, autoAdd, active | — |
| goals | id, name, target, saved, currency, deadline, color | — |
| settings | key, value (baseCurrency, rates, theme, weekStart) | — |

Deleting a wallet deletes its transactions (asked first). Deleting a category
keeps transactions and shows them as "Tanpa kategori".

## Parts that bite

- Multi-currency: totals convert to the base currency with user-set rates;
  a missing rate counts as 1 and is flagged in Settings.
- Recurring on the 31st: occurrences are computed from the start date and an
  occurrence count, clamped to month end, so they never drift.
- Photos: compressed on the device before saving to keep IndexedDB small.
- Backup: JSON includes photos as data URLs; import replaces everything.

## Build order

1. Shell + tokens + seed (categories, one wallet) — S01..S10 routes.
2. Vertical slice: F01 (S03 → S01).
3. S02, S04, S05, S06, S07, S08, S09, S10.
