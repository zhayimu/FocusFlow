import { useState } from 'react';
import {
  LayoutGrid,
  Users,
  Layers,
  CalendarDays,
  LineChart,
  Aperture,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { cn } from './lib/utils';
import { useAuth } from './lib/AuthContext';

import Dashboard from './components/Dashboard';
import Crm from './components/Crm';
import Pipeline from './components/Pipeline';
import Finance from './components/Finance';
import Calendar from './components/Calendar';

type Tab = 'dashboard' | 'crm' | 'pipeline' | 'calendar' | 'finance';

const NAV: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
  { id: 'crm', label: 'Clients', icon: Users },
  { id: 'pipeline', label: 'Pipeline', icon: Layers },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'finance', label: 'Income', icon: LineChart },
];

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-[9px] bg-safelight text-safelight-ink">
        <Aperture size={17} strokeWidth={2} />
      </span>
      <div className="leading-none">
        <p className="font-display font-semibold tracking-[-0.03em] text-[19px] text-paper">zhayimuuu</p>
        {!compact && <p className="eyebrow mt-1 !text-[10px]">Studio desk</p>}
      </div>
    </div>
  );
}

function LoginScreen({ login, loggingIn }: { login: () => void; loggingIn: boolean }) {
  return (
    <div className="grain relative min-h-dvh overflow-hidden bg-ink-950">
      {/* Safelight glow */}
      <div aria-hidden className="pointer-events-none absolute -left-40 top-1/3 size-[640px] rounded-full bg-safelight/10 blur-[140px]" />
      {/* Film-strip edge */}
      <div aria-hidden className="absolute inset-y-0 right-0 hidden w-14 flex-col justify-around border-l border-ink-800 bg-ink-900 lg:flex">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="mx-auto h-5 w-6 rounded-[3px] bg-ink-950 ring-1 ring-inset ring-ink-800" />
        ))}
      </div>

      <main className="relative mx-auto grid min-h-dvh max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.2fr_1fr] lg:pr-24">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          <Wordmark />
          <h1 className="mt-12 font-display font-semibold tracking-[-0.03em] text-5xl leading-[0.98] text-paper sm:text-6xl lg:text-7xl">
            Every shoot,
            <br />
            <span className="text-safelight">from enquiry</span>
            <br />
            to delivery.
          </h1>
          <p className="mt-6 max-w-[44ch] text-base leading-relaxed text-ink-300">
            Bookings, clients, editing progress and income for the studio, kept in one place.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-[1.25rem] bg-ink-900 p-7 ring-1 ring-ink-800 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] sm:p-9"
        >
          <p className="eyebrow">Sign in</p>
          <p className="mt-3 font-display font-semibold tracking-[-0.03em] text-2xl leading-tight text-paper">Welcome back to the desk.</p>
          <p className="mt-2 text-sm text-ink-400">Use the Google account the studio is registered to.</p>
          <button
            onClick={login}
            disabled={loggingIn}
            className={cn(
              'mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-[var(--radius-control)] bg-paper text-[15px] font-medium text-ink-950',
              'transition-[transform,background-color] duration-200 hover:bg-white active:translate-y-px disabled:opacity-70',
            )}
          >
            {loggingIn ? (
              <span className="size-4 animate-spin rounded-full border-2 border-ink-950/25 border-t-ink-950" />
            ) : (
              <svg aria-hidden width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>
            )}
            {loggingIn ? 'Opening Google…' : 'Continue with Google'}
          </button>
        </motion.div>
      </main>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { user, loading, loggingIn, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-ink-950">
        <div className="flex items-center gap-3 text-ink-400">
          <Aperture size={18} className="animate-spin [animation-duration:2.4s]" />
          <span className="text-sm">Loading the desk…</span>
        </div>
      </div>
    );
  }

  if (!user) return <LoginScreen login={login} loggingIn={loggingIn} />;

  const firstName = user.displayName?.split(' ')[0];

  return (
    <div className="grain min-h-dvh bg-ink-950 text-paper md:grid md:grid-cols-[236px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:bg-paper focus:px-4 focus:py-2 focus:text-ink-950">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-ink-800 bg-ink-950 px-4 py-6 md:flex">
        <div className="px-2"><Wordmark /></div>

        <nav aria-label="Main" className="mt-10 space-y-0.5">
          {NAV.map(item => {
            const active = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex h-10 w-full items-center gap-3 rounded-[var(--radius-control)] px-3 text-sm transition-colors duration-200',
                  active ? 'bg-ink-900 text-paper' : 'text-ink-400 hover:bg-ink-900/60 hover:text-paper',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute left-0 top-2.5 h-5 w-[3px] rounded-r-full bg-safelight"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
                  />
                )}
                <Icon size={17} strokeWidth={1.75} className={cn(active && 'text-safelight')} />
                <span className={cn(active && 'font-medium')}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-ink-800 pt-5">
          <div className="flex items-center gap-3 px-2">
            {user.photoURL ? (
              <img src={user.photoURL} referrerPolicy="no-referrer" className="size-8 rounded-[9px] object-cover ring-1 ring-ink-800" alt={user.displayName || 'Your profile photo'} />
            ) : (
              <span className="grid size-8 place-items-center rounded-[9px] bg-ink-850 text-xs text-safelight">{firstName?.[0]}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-paper">{user.displayName}</p>
              <p className="truncate text-[11px] text-ink-500">{user.email}</p>
            </div>
            <button
              onClick={logout}
              aria-label="Sign out"
              title="Sign out"
              className="grid size-8 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-900 hover:text-rust"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink-800 bg-ink-950/85 px-4 py-3 backdrop-blur-md md:hidden">
        <Wordmark compact />
        <button onClick={logout} aria-label="Sign out" className="grid size-10 place-items-center rounded-lg text-ink-400 hover:text-rust">
          <LogOut size={18} />
        </button>
      </header>

      <main id="main" className="min-w-0 px-4 pb-28 pt-6 md:px-10 md:pb-16 md:pt-10">
        <div className="mx-auto max-w-[1180px]">
          <p className="mb-6 hidden text-sm text-ink-500 md:block">
            {format(new Date(), 'EEEE, d MMMM')}{firstName ? ` · Hi ${firstName}` : ''}
          </p>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
              {activeTab === 'crm' && <Crm />}
              {activeTab === 'pipeline' && <Pipeline />}
              {activeTab === 'calendar' && <Calendar />}
              {activeTab === 'finance' && <Finance />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/92 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex h-16 max-w-md items-stretch justify-between">
          {NAV.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn('relative flex flex-1 flex-col items-center justify-center gap-1 transition-colors', active ? 'text-paper' : 'text-ink-500')}
              >
                {active && <motion.span layoutId="mobile-nav-active" className="absolute top-0 h-[2px] w-8 rounded-b-full bg-safelight" />}
                <Icon size={19} strokeWidth={1.75} className={cn(active && 'text-safelight')} />
                <span className="text-[10.5px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
