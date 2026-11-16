import { HashRouter, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ChartPie, Home as HomeIcon, List, Menu, Plus, Target } from 'lucide-react'
import { DataProvider } from './state'
import { cx } from './components/ui'
import Home from './pages/Home'
import Transactions from './pages/Transactions'
import TxForm from './pages/TxForm'
import Reports from './pages/Reports'
import Budgets from './pages/Budgets'
import Wallets from './pages/Wallets'
import Categories from './pages/Categories'
import Bills from './pages/Bills'
import Goals from './pages/Goals'
import More from './pages/More'

const NAV = [
  { to: '/', label: 'Beranda', icon: HomeIcon },
  { to: '/transaksi', label: 'Transaksi', icon: List },
  { to: '/anggaran', label: 'Anggaran', icon: Target },
  { to: '/laporan', label: 'Laporan', icon: ChartPie },
  { to: '/lainnya', label: 'Lainnya', icon: Menu },
]

function Layout() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const showFab = ['/', '/transaksi', '/laporan'].includes(pathname)
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-bg">
      <main className="flex-1 pb-28">
        <Outlet />
      </main>
      {showFab && (
        <button
          type="button"
          onClick={() => nav('/tx/new')}
          aria-label="Tambah transaksi"
          className="fixed right-[max(1rem,calc(50%-14rem+1rem))] bottom-24 z-20 grid size-14 place-items-center rounded-2xl bg-accent text-accent-fg shadow-lg shadow-black/20 active:scale-95"
        >
          <Plus className="size-7" />
        </button>
      )}
      <nav aria-label="Navigasi utama" className="pb-safe fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-line bg-surface/95 backdrop-blur">
        <ul className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) => cx('flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium', isActive ? 'text-accent' : 'text-muted')}
              >
                {({ isActive }) => (
                  <>
                    <span className={cx('grid h-7 w-12 place-items-center rounded-full transition', isActive && 'bg-accent-soft')}>
                      <Icon className="size-5" aria-hidden />
                    </span>
                    {label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="transaksi" element={<Transactions />} />
            <Route path="anggaran" element={<Budgets />} />
            <Route path="laporan" element={<Reports />} />
            <Route path="lainnya" element={<More />} />
          </Route>
          <Route element={<div className="mx-auto min-h-dvh max-w-md bg-bg pb-10"><Outlet /></div>}>
            <Route path="tx/new" element={<TxForm />} />
            <Route path="tx/:id" element={<TxForm />} />
            <Route path="dompet" element={<Wallets />} />
            <Route path="kategori" element={<Categories />} />
            <Route path="tagihan" element={<Bills />} />
            <Route path="target" element={<Goals />} />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  )
}
