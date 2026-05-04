import { useState, useEffect } from 'react';
import { Plus, Camera, Users, Wallet, ChevronRight } from 'lucide-react';
import { bookingService, clientService } from '../lib/firestoreService';
import { format, isAfter, parseISO, compareAsc } from 'date-fns';

const Dashboard = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [clientCount, setClientCount] = useState(0);

  useEffect(() => {
    const unsubBookings = bookingService.subscribe(setBookings);
    const unsubClients = clientService.subscribe(data => setClientCount(data.length));
    return () => { unsubBookings(); unsubClients(); };
  }, []);

  const totalRevenue = bookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0);
  
  const upcomingEvents = bookings
    .filter(b => isAfter(parseISO(b.date), new Date()))
    .sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));

  const nearest = upcomingEvents[0];

  return (
    <div className="grid grid-cols-12 grid-rows-6 gap-6 h-full">
      {/* Header Stat Cards */}
      <div className="col-span-4 bg-bento-card border border-bento-border rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md">
        <div className="flex justify-between items-start text-zinc-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
          <Wallet size={20} className="opacity-40" />
        </div>
        <div>
          <p className="text-3xl font-bold tracking-tight italic text-white">${totalRevenue.toLocaleString()}</p>
          <div className="text-sm text-emerald-400 flex items-center gap-1 mt-1 font-medium">
             Current Season
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 font-mono">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase">Avg per project</p>
            <p className="text-sm">${bookings.length > 0 ? (totalRevenue / bookings.length).toFixed(0) : 0}</p>
          </div>
        </div>
      </div>
      
      <div className="col-span-4 bg-bento-card border border-bento-border rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md">
        <div className="flex justify-between items-start text-zinc-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Active Projects</span>
          <Camera size={20} className="opacity-40" />
        </div>
        <div>
          <p className="text-3xl font-bold tracking-tight italic text-indigo-400">{bookings.filter(b => b.status !== 'Delivered').length}</p>
          <div className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
             {upcomingEvents.length} upcoming shoots
          </div>
        </div>
      </div>

      <div className="col-span-4 bg-bento-card border border-bento-border rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md">
        <div className="flex justify-between items-start text-zinc-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Success Rate</span>
          <Users size={20} className="opacity-40" />
        </div>
        <div>
          <p className="text-3xl font-bold tracking-tight italic text-emerald-400">100%</p>
          <div className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
             {clientCount} satisfied clients
          </div>
        </div>
      </div>

      {/* Hero Section - Nearest Event */}
      <section className="col-span-12 row-span-2 bg-gradient-to-r from-indigo-900/40 to-transparent border border-bento-accent/30 rounded-2xl p-8 flex items-center justify-between backdrop-blur-md group hover:border-bento-accent/50 transition-all duration-500">
        <div className="flex items-center gap-8">
          <div className="bg-bento-accent/20 p-6 rounded-2xl ring-1 ring-bento-accent/30">
            {nearest ? (
              <div className="text-center">
                <span className="block text-[10px] uppercase tracking-widest text-indigo-400 font-bold mb-1">{format(parseISO(nearest.date), 'MMM')}</span>
                <span className="text-4xl font-bold text-white">{format(parseISO(nearest.date), 'dd')}</span>
              </div>
            ) : (
              <Camera size={32} className="text-indigo-400" />
            )}
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-bold">Priority Logistical Alert</span>
            <h2 className="text-2xl font-bold text-white mt-1">
              {nearest ? `${nearest.clientName} - ${nearest.eventType}` : 'No Upcoming Shoots'}
            </h2>
            <p className="text-zinc-400 font-mono text-sm mt-1">
              {nearest ? `${format(parseISO(nearest.date), 'MMM dd, yyyy')} • ${nearest.location || 'Location Pending'}` : 'All caught up with production.'}
            </p>
          </div>
        </div>
        {nearest && (
          <button className="px-6 py-2.5 border border-zinc-700 bg-zinc-900/50 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:border-zinc-500 transition-all">
            Open Logistics
          </button>
        )}
      </section>

      {/* Large Kanban Stage Preview (Simplified for Bento) */}
      <div className="col-span-12 row-span-3 grid grid-cols-4 gap-6">
        {['Booked', 'Shot', 'Editing', 'Delivered'].map((status) => (
          <div key={status} className="bg-bento-card border border-bento-border rounded-2xl p-4 flex flex-col gap-4 overflow-hidden backdrop-blur-md">
            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between items-center px-1">
              {status} 
              <span className="w-5 h-5 flex items-center justify-center bg-zinc-800 rounded text-[9px]">
                {bookings.filter(b => b.status === status).length}
              </span>
            </div>
            <div className="space-y-3 overflow-y-auto pr-1 flex-grow scrollbar-hide">
              {bookings.filter(b => b.status === status).slice(0, 3).map(b => (
                <div key={b.id} className="p-3 bg-zinc-800/40 border border-zinc-700/50 rounded-xl space-y-2 group hover:bg-zinc-800/60 transition-colors">
                  <p className="text-sm font-medium text-zinc-200">{b.clientName}</p>
                  <div className="text-[10px] text-indigo-400 font-semibold uppercase tracking-tight">
                    {b.eventType} • ${b.price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
