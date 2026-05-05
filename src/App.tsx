import { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Kanban, 
  Calendar as CalendarIcon, 
  Wallet, 
  Camera,
  LogOut,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { useAuth } from './lib/AuthContext';

import Dashboard from './components/Dashboard';
import Crm from './components/Crm';
import Pipeline from './components/Pipeline';
import Finance from './components/Finance';
import Calendar from './components/Calendar';

// Helper Components
const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void, key?: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group",
      active ? "bg-bento-accent text-white" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-100"
    )}
  >
    <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    <span className={cn("text-sm font-medium", active && "font-semibold")}>{label}</span>
    {active && (
      <motion.div 
        layoutId="active-indicator" 
        className="ml-auto w-1 h-4 bg-white/20 rounded-full"
      />
    )}
  </button>
);

const LoginScreen = ({ login, loggingIn }: { login: () => void, loggingIn: boolean }) => (
  <div className="min-h-screen flex items-center justify-center bg-bento-bg p-6">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full bg-bento-card p-12 rounded-[2.5rem] border border-bento-border shadow-2xl text-center space-y-8 backdrop-blur-xl"
    >
      <div className="w-16 h-16 bg-bento-accent rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-indigo-500/20">
        <Camera size={32} strokeWidth={2.5} />
      </div>
      <div>
        <h1 className="text-4xl font-bold text-white tracking-tighter uppercase">ZHAYIMUUU</h1>
      </div>
      <p className="text-zinc-400 text-sm leading-relaxed">A specialized bento-grid system for the modern imagery artisan. Manage your bookings, production, and financials with precision.</p>
      <button 
        onClick={login}
        disabled={loggingIn}
        className={cn(
          "w-full flex items-center justify-center gap-3 bg-bento-accent text-white py-4 rounded-2xl transition-all duration-500 font-semibold shadow-lg shadow-indigo-500/20",
          loggingIn ? "opacity-70 cursor-not-allowed" : "hover:bg-bento-accent-hover"
        )}
      >
        {loggingIn ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <LogIn size={20} />
        )}
        {loggingIn ? "Authenticating..." : "Continue with Google"}
      </button>
    </motion.div>
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'crm' | 'pipeline' | 'calendar' | 'finance'>('dashboard');
  const { user, loading, loggingIn, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bento-bg">
        <div className="w-8 h-8 border-4 border-zinc-800 border-t-bento-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen login={login} loggingIn={loggingIn} />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'crm', label: 'Clients', icon: Users },
    { id: 'pipeline', label: 'Pipeline', icon: Kanban },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'finance', label: 'Report', icon: Wallet },
  ] as const;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-bento-bg text-zinc-100 font-sans overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-bento-border p-6 space-y-8 sticky top-0 h-screen bg-bento-bg">
        <div className="flex items-center gap-4 px-2">
          <div className="w-10 h-10 bg-bento-accent rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/10">
            <Camera size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white uppercase italic">ZHAYIMUUU</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest leading-none">POS SYSTEM</p>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => (
            <SidebarItem 
              key={item.id}
              icon={item.icon} 
              label={item.label} 
              active={activeTab === item.id} 
              onClick={() => { setActiveTab(item.id); }} 
            />
          ))}
        </nav>

        <div className="pt-8 border-t border-bento-border mt-auto space-y-6">
          <div className="flex items-center gap-3 px-2">
            <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-bento-border" alt="Avatar" />
            <div className="min-w-0">
               <p className="text-[11px] font-semibold truncate leading-none text-zinc-100">{user.displayName}</p>
               <button onClick={logout} className="text-[10px] text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1 mt-1 font-mono uppercase tracking-widest">
                  <LogOut size={10} /> Logout
               </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-bento-border bg-bento-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-bento-accent rounded-lg flex items-center justify-center text-white">
            <Camera size={18} strokeWidth={2.5} />
          </div>
          <h1 className="text-base font-bold tracking-tight text-white uppercase italic">ZHAYIMUUU</h1>
        </div>
        <button onClick={logout} className="text-zinc-500 hover:text-red-400 transition-colors">
          <LogOut size={18} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden scrollbar-hide pb-24 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-w-6xl mx-auto h-full"
          >
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'crm' && <Crm />}
            {activeTab === 'pipeline' && <Pipeline />}
            {activeTab === 'calendar' && <Calendar />}
            {activeTab === 'finance' && <Finance />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/90 backdrop-blur-xl border-t border-bento-border flex items-center justify-around px-2 z-50 pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors relative px-4",
                isActive ? "text-indigo-400" : "text-zinc-500"
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="mobile-indicator" 
                  className="absolute -bottom-2 w-8 h-1 bg-indigo-400 rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
