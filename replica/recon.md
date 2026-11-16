# Recon: Sumlio: Expense & Budget (Android)

Scope: the whole personal-finance core loop (record a transaction, see where money
went, stay inside a budget) for Android users who want **everything free**: no
in-app purchases, no subscription, no ads, no account.

Clean-room: built only from the public Play Store listing (description, "What's
new", data-safety section). No APK, code, network calls, screenshots, icons, copy
or name were taken. Our product is called **Kantong** and has its own brand.

## Sources

| source | url | gives |
| --- | --- | --- |
| Play Store listing | https://play.google.com/store/apps/details?id=com.jojdevx.expense.tracker | feature list, "What's new" (photo attachments), IAP flag, data safety |

The listing says the app "contains in-app purchases" but does not say which
features are gated. Our answer: none are. Every feature below ships free.

## Screens

| ID | screen | how you get there | purpose | key components | states |
| --- | --- | --- | --- | --- | --- |
| S01 | Home | app start, nav "Beranda" | total balance, this month in/out, due bills, budgets, recent | balance card, bill row, budget bar, tx row | empty (first run), filled |
| S02 | Transactions | nav "Transaksi" | all transactions by day, filter + search | search, filter chips, day group, tx row | empty, no results, filled |
| S03 | Transaction form | + button, tap a tx | add/edit expense, income, transfer | type tabs, amount, category grid, wallet select, date-time, note, photos | new, edit, validation error |
| S04 | Reports | nav "Laporan" | totals, by category, trend | period switcher, donut, bars, category list | empty period, filled |
| S05 | Budgets | nav "Anggaran" | daily/weekly/monthly/yearly limits per category | budget card, progress, form | empty, under, near, over |
| S06 | Wallets | Lainnya → Dompet | accounts, each with a currency | wallet card, form | one wallet, many |
| S07 | Categories | Lainnya → Kategori | predefined + custom categories | icon/colour picker | expense / income tabs |
| S08 | Bills & recurring | Home → Tagihan, Lainnya | recurring payments, auto or pay-on-tap | schedule form, due list | none, due, upcoming |
| S09 | Goals | Lainnya → Target | savings goals with progress | goal card, deposit | empty, in progress, reached |
| S10 | Settings | nav "Lainnya" | base currency, rates, theme, backup, CSV | list | — |

## Flows

```
F01 Record an expense (core loop: + , amount, category, Simpan)
    S01 + -> S03 type amount -> pick category -> Simpan -> S01 shows it
F02 Transfer between wallets (incl. different currencies)
    S01 + -> S03 Transfer tab -> from, to, amount (+ received amount) -> Simpan
F03 Set a monthly budget for food
    S05 + -> name, period, amount, categories -> Simpan -> progress on S01/S05
F04 Review this month
    S04 -> Bulanan -> donut by category, daily bars, prev/next month
F05 Bill reminder
    S08 + -> amount, category, monthly, "catat otomatis" off -> due on S01 -> Bayar
F06 Attach a receipt
    S03 -> Foto -> camera or gallery -> thumbnail -> Simpan
F07 Back up / move phones
    S10 -> Ekspor cadangan (JSON) -> Impor on new phone
```

## Inferred data model

```
Wallet       id, name, currency, initial_balance, colour, icon      evidence: "multiple wallets", "multi-currency"   high
Category     id, name, type (expense|income), icon, colour          evidence: "pre-defined ... customize"            high
Transaction  id, type (expense|income|transfer), amount, wallet,
             to_wallet, to_amount, category, date+time, note, photos evidence: listing text + What's new   high
Budget       id, name, period (daily|weekly|monthly|yearly), amount, categories   evidence: "daily, monthly, or yearly budgets", "limits for categories"  high
Recurring    id, template tx, frequency, start, auto_add            evidence: "bill organizer, recurring payments"   medium (auto vs reminder is a guess)
Goal         id, name, target, saved, deadline                      evidence: "working toward specific financial goals"  low (guess)
```

## Out of scope / skip

- Cloud sync between devices: needs a paid server. Replaced by free JSON backup/restore.
- Live exchange rates: paid/keyed APIs. Replaced by user-set rates.
- Their name, icon, screenshots, copy and colours.

## Size

10 screens, 7 flows, 7 entities. Hard parts: multi-currency totals, recurring
schedule maths (month ends), photo storage offline. Size: M.
