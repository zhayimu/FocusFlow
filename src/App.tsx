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
const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
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
        <h1 className="text-4xl font-bold text-white tracking-tighter">FocusFlow</h1>
        <p className="text-zinc-500 mt-2 font-mono uppercase text-[10px] tracking-[0.2em] italic">Architecture & Management</p>
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

  return (
    <div className="flex min-h-screen bg-bento-bg text-zinc-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-bento-border p-6 space-y-8 sticky top-0 h-screen overflow-y-auto bg-bento-bg">
        <div className="flex items-center gap-4 px-2">
          <div className="w-10 h-10 bg-bento-accent rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/10">
            <Camera size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">FocusFlow</h1>
            <p className="text-[10px] text-zinc-500 font-mono tracking-widest leading-none">POS SYSTEM</p>
          </div>
        </div>

        <nav className="space-y-1">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Home" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <SidebarItem 
            icon={Users} 
            label="Inquiries" 
            active={activeTab === 'crm'} 
            onClick={() => setActiveTab('crm')} 
          />
          <SidebarItem 
            icon={Kanban} 
            label="Pipeline" 
            active={activeTab === 'pipeline'} 
            onClick={() => setActiveTab('pipeline')} 
          />
          <SidebarItem 
            icon={CalendarIcon} 
            label="Logistics" 
            active={activeTab === 'calendar'} 
            onClick={() => setActiveTab('calendar')} 
          />
          <SidebarItem 
            icon={Wallet} 
            label="Report" 
            active={activeTab === 'finance'} 
            onClick={() => setActiveTab('finance')} 
          />
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

      {/* Main Content */}
      <main className="flex-1 p-8 h-screen overflow-y-auto">
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
    </div>
  );
}
