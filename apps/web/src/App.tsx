import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BarChart3, Home, MoreHorizontal, PanelLeftClose, PanelLeftOpen, ShoppingBag, Users, FileText, CreditCard, LogOut, UserCog } from 'lucide-react';
import type { Session } from './pages/Login';
import { FeedbackProvider } from './components/Feedback';
import { queryKeys, useAuthSession, useCustomers, useProducts, useSignOut, useTransactions } from './hooks/useApiQueries';

const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Products = React.lazy(() => import('./pages/Products'));
const Customers = React.lazy(() => import('./pages/Customers'));
const Invoices = React.lazy(() => import('./pages/Invoices'));
const Transactions = React.lazy(() => import('./pages/Transactions'));
const Reports = React.lazy(() => import('./pages/Reports'));
const TransactionDetail = React.lazy(() => import('./pages/TransactionDetail'));
const InvoicePrintPage = React.lazy(() => import('./pages/InvoicePrintPage'));
const Admins = React.lazy(() => import('./pages/Admins'));
const Login = React.lazy(() => import('./pages/Login'));
const IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'hypercard:last-activity';

function AppLoader({ fullScreen = false, label = 'Memuat halaman...' }: { fullScreen?: boolean; label?: string }) {
  return (
    <div
      className={`app-loader premium-dark flex items-center justify-center bg-[#050506] ${
        fullScreen ? 'min-h-screen w-full' : 'h-full min-h-64 w-full'
      }`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="app-loader-wordmark" aria-hidden="true" />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}

function PageFallback() {
  return <AppLoader />;
}

function AppLayout({ children, session, onLogout }: { children: React.ReactNode; session: Session; onLogout: () => void }) {
  const location = useLocation();
  const currentPath = location.pathname;
  const productsCountQuery = useProducts({ page: 1, limit: 1 });
  const customersCountQuery = useCustomers({ page: 1, limit: 1 });
  const transactionsCountQuery = useTransactions({ page: 1, limit: 1 });
  const productCount = productsCountQuery.data?.pagination.total;
  const customerCount = customersCountQuery.data?.pagination.total;
  const transactionCount = transactionsCountQuery.data?.pagination.total;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);
  const sidebarResizeTimerRef = React.useRef<number | null>(null);

  const toggleSidebar = (collapsed: boolean) => {
    document.documentElement.dataset.sidebarResizing = 'true';
    if (sidebarResizeTimerRef.current) {
      window.clearTimeout(sidebarResizeTimerRef.current);
    }
    sidebarResizeTimerRef.current = window.setTimeout(() => {
      delete document.documentElement.dataset.sidebarResizing;
    }, 340);
    setIsSidebarCollapsed(collapsed);
  };

  React.useEffect(() => {
    return () => {
      if (sidebarResizeTimerRef.current) {
        window.clearTimeout(sidebarResizeTimerRef.current);
      }
      delete document.documentElement.dataset.sidebarResizing;
    };
  }, []);

  return (
    <div className="premium-dark flex h-screen min-h-0 w-full max-w-full overflow-hidden bg-[#070708] font-sans text-finance-900">
      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} relative hidden h-screen shrink-0 flex-col overflow-hidden border-r border-finance-200 bg-white transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width] md:flex`}>
        <img
          src="/hypercard-logo.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-1/2 h-full w-[190%] max-w-none -translate-x-1/2 object-cover opacity-[0.045]"
        />
        <div className={`${isSidebarCollapsed ? 'justify-center px-4' : 'justify-between px-6'} relative z-10 flex h-16 items-center border-b border-finance-100 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}>
          {isSidebarCollapsed ? (
            <button
              type="button"
              onClick={() => toggleSidebar(false)}
              className="interactive-click flex h-10 w-10 items-center justify-center rounded-lg text-finance-500 transition-colors hover:bg-finance-100 hover:text-finance-900"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen size={20} />
            </button>
          ) : (
            <>
              <div className="flex min-w-0 flex-1 items-center">
                <h1 className="font-brand truncate text-xl font-semibold">Hypercard</h1>
              </div>
            <button
              type="button"
              onClick={() => toggleSidebar(true)}
              className="interactive-click flex h-9 w-9 items-center justify-center rounded-md text-finance-500 transition-colors hover:bg-finance-100 hover:text-finance-900"
              aria-label="Minimize sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
            </>
          )}
        </div>
        <nav className="relative z-10 flex-1 space-y-1 p-4">
          <NavItem to="/" icon={<Home size={20} />} label="Dashboard" active={currentPath === '/'} collapsed={isSidebarCollapsed} />
          <NavItem to="/products" icon={<ShoppingBag size={20} />} label="Produk" count={productCount} active={currentPath.startsWith('/products')} collapsed={isSidebarCollapsed} />
          <NavItem to="/customers" icon={<Users size={20} />} label="Pembeli" count={customerCount} active={currentPath.startsWith('/customers')} collapsed={isSidebarCollapsed} />
          <NavItem to="/invoices" icon={<FileText size={20} />} label="Invoice" active={currentPath.startsWith('/invoices')} collapsed={isSidebarCollapsed} />
          <NavItem to="/transactions" icon={<CreditCard size={20} />} label="Transaksi" count={transactionCount} active={currentPath.startsWith('/transactions')} collapsed={isSidebarCollapsed} />
          <NavItem to="/reports" icon={<BarChart3 size={20} />} label="Laporan" active={currentPath.startsWith('/reports')} collapsed={isSidebarCollapsed} />
          {session.role === 'superadmin' && (
            <NavItem to="/admins" icon={<UserCog size={20} />} label="Admin" active={currentPath.startsWith('/admins')} collapsed={isSidebarCollapsed} />
          )}
        </nav>
        <div className={`${isSidebarCollapsed ? 'px-3 text-center' : 'px-6'} relative z-10 border-t border-finance-200 py-4 transition-[padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}>
          <p className="text-[11px] font-medium leading-relaxed text-finance-500">
            {isSidebarCollapsed ? '©' : '© 2026 dmrhdz.iq'}
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex h-screen min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-16 md:pb-0">
        <header className="hidden h-16 shrink-0 min-w-0 items-center justify-between gap-3 border-b border-finance-200 bg-white px-8 md:flex">
          <h2 className="min-w-0 truncate text-lg font-semibold md:text-xl">
            {currentPath === '/' ? 'Dashboard Utama' : 
             currentPath.startsWith('/products') ? 'Manajemen Produk' :
             currentPath.startsWith('/customers') ? 'Data Pembeli' :
             currentPath.startsWith('/invoices') ? 'Buat Invoice' :
             currentPath.startsWith('/transactions') ? 'Daftar Transaksi' :
             currentPath.startsWith('/reports') ? 'Laporan Penjualan' :
             currentPath.startsWith('/admins') ? 'Manajemen Admin' : 'Dashboard Utama'}
          </h2>
          <div className="flex shrink-0 items-center space-x-3 md:space-x-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-none">{session.name}</p>
              <p className="mt-1 text-xs capitalize text-finance-500">{session.role}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="interactive-click hidden h-9 w-9 items-center justify-center rounded-full bg-finance-100 text-finance-600 transition-colors hover:bg-finance-200 hover:text-finance-900 md:flex"
              aria-label="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <div
          key={currentPath}
          className={`app-content-scroll animate-soft-in min-h-0 min-w-0 flex-1 overflow-x-hidden p-4 md:px-8 md:py-5 ${
            currentPath.startsWith('/transactions/') ? 'overflow-y-auto md:overflow-y-hidden' : 'overflow-y-auto'
          }`}
        >
          {children}
        </div>
      </main>

      {isMoreOpen && (
        <button
          type="button"
          className="animate-fade-in fixed inset-0 z-30 bg-transparent md:hidden"
          onClick={() => setIsMoreOpen(false)}
          aria-label="Tutup menu lainnya"
        />
      )}

      <nav className="mobile-tabbar fixed inset-x-0 bottom-0 z-40 grid h-16 w-screen max-w-full grid-cols-5 items-stretch border-t border-finance-200 bg-[#0c0c0f]/95 px-2 backdrop-blur md:hidden">
        <MobileNavItem to="/" icon={<Home size={20} />} label="Home" active={currentPath === '/'} />
        <MobileNavItem to="/products" icon={<ShoppingBag size={20} />} label="Produk" active={currentPath.startsWith('/products')} />
        <MobileNavItem to="/customers" icon={<Users size={20} />} label="Pembeli" active={currentPath.startsWith('/customers')} />
        <MobileNavItem to="/invoices" icon={<FileText size={20} />} label="Invoice" active={currentPath.startsWith('/invoices')} />
        <div className="relative">
          {isMoreOpen && (
            <div className="animate-dropdown-in absolute bottom-[calc(100%+10px)] right-0 w-52 overflow-hidden rounded-lg border border-finance-200 bg-white shadow-xl">
              <MobileMoreItem to="/transactions" icon={<CreditCard size={17} />} label="Transaksi" onSelect={() => setIsMoreOpen(false)} />
              <MobileMoreItem to="/reports" icon={<BarChart3 size={17} />} label="Laporan" onSelect={() => setIsMoreOpen(false)} />
              {session.role === 'superadmin' && (
                <MobileMoreItem to="/admins" icon={<UserCog size={17} />} label="Admin" onSelect={() => setIsMoreOpen(false)} />
              )}
              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  onLogout();
                }}
                className="interactive-click flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-primary transition-colors hover:bg-finance-50"
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsMoreOpen((value) => !value)}
            className={`interactive-click flex h-full w-full flex-col items-center justify-center gap-1 rounded-md text-[11px] font-medium transition-all duration-150 ${
              currentPath.startsWith('/transactions') || currentPath.startsWith('/reports') || currentPath.startsWith('/admins') || isMoreOpen ? 'text-accent' : 'text-finance-500'
            }`}
          >
            <MoreHorizontal size={20} />
            <span>More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function formatSidebarCount(count: number) {
  if (count > 999) return '999+';
  return count.toLocaleString('id-ID');
}

function NavItem({
  to,
  icon,
  label,
  count,
  active = false,
  collapsed = false,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  collapsed?: boolean;
}) {
  const hasCount = typeof count === 'number' && count > 0;

  return (
    <Link
      to={to}
      title={collapsed ? `${label}${hasCount ? ` (${count})` : ''}` : undefined}
      className={`group relative flex h-11 items-center overflow-hidden rounded-lg border py-2.5 text-sm font-medium transition-[background-color,border-color,color,box-shadow,padding] duration-200 ease-out active:brightness-95 ${collapsed ? 'justify-center px-0' : 'justify-start px-3'} ${
        active 
          ? 'border-accent/45 bg-[linear-gradient(90deg,rgba(214,180,93,0.18),rgba(220,38,38,0.07)_58%,rgba(20,20,23,0.72))] text-accent shadow-[inset_3px_0_0_#d6b45d,0_10px_28px_rgba(0,0,0,0.16)]' 
          : 'border-transparent text-finance-500 hover:border-accent/20 hover:bg-finance-50 hover:text-accent'
      }`}
    >
      <span className="shrink-0 text-inherit transition-colors">
        {icon}
      </span>
      <span className={`${collapsed ? 'ml-0 max-w-0 opacity-0' : 'ml-3 max-w-40 flex-1 opacity-100'} min-w-0 truncate transition-[margin,max-width,opacity] duration-200 ease-out`}>
        {label}
      </span>
      {hasCount && (
        <span
          className={`${collapsed ? 'absolute right-1.5 top-1 min-w-4 px-1 text-[9px]' : 'ml-2 min-w-6 px-2 text-[10px]'} flex h-5 shrink-0 items-center justify-center rounded-full border border-accent/25 bg-accent/12 font-bold tabular-nums text-accent transition-all duration-200`}
          aria-label={`${count} ${label.toLowerCase()}`}
        >
          {formatSidebarCount(count)}
        </span>
      )}
    </Link>
  );
}

function MobileNavItem({ to, icon, label, active = false }: { to: string, icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <Link
      to={to}
      className={`interactive-click relative flex min-w-[72px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-200 ${
        active ? 'text-accent' : 'text-finance-500 hover:text-finance-900'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MobileMoreItem({ to, icon, label, onSelect }: { to: string, icon: React.ReactNode, label: string, onSelect: () => void }) {
  return (
    <Link
      to={to}
      onClick={onSelect}
      className="interactive-click flex items-center gap-3 px-4 py-3 text-sm font-medium text-finance-700 transition-colors hover:bg-finance-50"
    >
      {icon}
      {label}
    </Link>
  );
}

function SuperadminRoute({ session }: { session: Session }) {
  if (session.role !== 'superadmin') {
    return (
      <div className="animate-soft-in rounded-lg border border-finance-200 bg-white p-6">
        <h1 className="text-xl font-bold text-finance-950">Akses dibatasi</h1>
        <p className="mt-2 text-sm text-finance-500">Halaman ini hanya dapat dibuka oleh superadmin.</p>
      </div>
    );
  }

  return <Admins />;
}

function App() {
  const queryClient = useQueryClient();
  const sessionQuery = useAuthSession();
  const signOut = useSignOut();
  const [appStartedAt] = React.useState(() => Date.now());
  const session = sessionQuery.data ?? null;
  const persistedActivity = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
  const isPersistedSessionIdle = Boolean(
    session && persistedActivity && appStartedAt - persistedActivity >= IDLE_TIMEOUT_MS,
  );
  const [isOpeningAdmin, setIsOpeningAdmin] = React.useState(false);
  const openingTimerRef = React.useRef<number | null>(null);

  const handleLogin = (authenticatedSession: Session) => {
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    setIsOpeningAdmin(true);
    queryClient.setQueryData(queryKeys.authSession, authenticatedSession);
    window.history.replaceState(null, '', '/');

    void import('./pages/Dashboard');

    if (openingTimerRef.current) {
      window.clearTimeout(openingTimerRef.current);
    }
    openingTimerRef.current = window.setTimeout(() => {
      setIsOpeningAdmin(false);
      openingTimerRef.current = null;
    }, 2200);
  };

  const handleLogout = React.useCallback(async () => {
    setIsOpeningAdmin(false);
    window.localStorage.removeItem(LAST_ACTIVITY_KEY);
    await signOut.mutateAsync();
  }, [signOut]);

  React.useEffect(() => {
    if (!session) return;

    let timeoutId: number;
    let lastPersistedAt = 0;

    const logoutWhenIdle = () => {
      const lastActivity = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - lastActivity);
      window.clearTimeout(timeoutId);
      if (remaining <= 0) {
        void handleLogout();
        return;
      }
      timeoutId = window.setTimeout(logoutWhenIdle, remaining);
    };

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastPersistedAt < 15_000) return;
      lastPersistedAt = now;
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      logoutWhenIdle();
    };

    const storedActivity = Number(window.localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
    if (!storedActivity) {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }
    logoutWhenIdle();

    const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, recordActivity, { passive: true }));
    window.addEventListener('focus', logoutWhenIdle);
    window.addEventListener('hypercard:session-expired', handleLogout);

    return () => {
      window.clearTimeout(timeoutId);
      events.forEach((event) => window.removeEventListener(event, recordActivity));
      window.removeEventListener('focus', logoutWhenIdle);
      window.removeEventListener('hypercard:session-expired', handleLogout);
    };
  }, [handleLogout, session]);

  React.useEffect(() => () => {
    if (openingTimerRef.current) {
      window.clearTimeout(openingTimerRef.current);
    }
  }, []);

  if (sessionQuery.isLoading) {
    return <AppLoader fullScreen label="Memuat sesi..." />;
  }

  if (isPersistedSessionIdle) {
    return <AppLoader fullScreen label="Mengakhiri sesi..." />;
  }

  if (session && isOpeningAdmin) {
    return <AppLoader fullScreen label="Menyiapkan dashboard..." />;
  }

  if (!session) {
    return (
      <React.Suspense fallback={<PageFallback />}>
        <Login onLogin={handleLogin} />
      </React.Suspense>
    );
  }

  return (
    <FeedbackProvider>
      <BrowserRouter>
        <AppRoutes session={session} onLogout={handleLogout} />
      </BrowserRouter>
    </FeedbackProvider>
  );
}

function AppRoutes({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const location = useLocation();

  if (location.pathname.startsWith('/print/invoice/')) {
    return (
      <React.Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/print/invoice/:id" element={<InvoicePrintPage />} />
        </Routes>
      </React.Suspense>
    );
  }

  return (
    <AppLayout session={session} onLogout={onLogout}>
      <React.Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/transactions/:id" element={<TransactionDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/admins" element={<SuperadminRoute session={session} />} />
        </Routes>
      </React.Suspense>
    </AppLayout>
  );
}

export default App;
