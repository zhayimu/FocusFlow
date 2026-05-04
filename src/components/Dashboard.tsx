import { useState, useEffect } from 'react';
import { Plus, Camera, Users, Wallet, ChevronRight, ChevronLeft, Trash2 } from 'lucide-react';
import { bookingService, clientService } from '../lib/firestoreService';
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay,
  addDays,
  addMonths,
  subMonths
} from 'date-fns';
import { cn } from '../lib/utils';

const Dashboard = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const saved = sessionStorage.getItem('last_viewed_month');
    return saved ? new Date(saved) : new Date();
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    return sessionStorage.getItem('last_selected_date') || null;
  });

  useEffect(() => {
    sessionStorage.setItem('last_viewed_month', currentMonth.toISOString());
  }, [currentMonth]);

  useEffect(() => {
    if (selectedDate) {
      sessionStorage.setItem('last_selected_date', selectedDate);
    } else {
      sessionStorage.removeItem('last_selected_date');
    }
  }, [selectedDate]);

  useEffect(() => {
    const unsubBookings = bookingService.subscribe(setBookings);
    const unsubClients = clientService.subscribe(data => setClientCount(data.length));
    return () => { unsubBookings(); unsubClients(); };
  }, []);

  const handleDeleteBooking = async (id: string) => {
    if (window.confirm('Delete this production log?')) {
      try {
        await bookingService.delete(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const totalRevenue = bookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0);
  
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const today = new Date();

  const upcomingEvents = bookings
    .filter(b => {
      try {
        return b.date >= todayStr;
      } catch { return false; }
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // If no date is selected, we show events for "today"
  const displayedBookings = selectedDate 
    ? bookings.filter(b => b.date === selectedDate)
    : bookings.filter(b => b.date === todayStr);

  // If we are showing today but today is empty, we fallback to showing the next few upcoming events
  const effectiveBookings = (displayedBookings.length === 0 && !selectedDate)
    ? upcomingEvents.slice(0, 3) 
    : displayedBookings;

  const selectedDisplayDate = selectedDate || (effectiveBookings[0]?.date || todayStr);

  // Calendar Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = [];
  let day = startDate;
  while (day <= endDate) {
    calendarDays.push(day);
    day = addDays(day, 1);
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-full pb-10">
      {/* Header Stat Cards */}
      <div className="col-span-4 bg-bento-card border border-bento-border rounded-2xl p-6 flex flex-col justify-between backdrop-blur-md">
        <div className="flex justify-between items-start text-zinc-500">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Income</span>
          <Wallet size={20} className="opacity-40" />
        </div>
        <div>
          <p className="text-3xl font-bold tracking-tight italic text-white">${totalRevenue.toLocaleString()}</p>
          <div className="text-sm text-emerald-400 flex items-center gap-1 mt-1 font-medium">
             Lifetime Earnings
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
             {upcomingEvents.length} active events
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

      {/* Hero Section - Replaced with Bento Calendar */}
      <section className="col-span-12 lg:col-span-8 bg-bento-card border border-bento-border rounded-2xl p-6 backdrop-blur-md">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500/10 rounded flex items-center justify-center text-indigo-400">
              <Plus size={16} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Timeline Logistics</h2>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{format(currentMonth, 'MMMM yyyy')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-center text-[10px] font-mono text-zinc-600 py-1 font-bold">{d}</div>
          ))}
          {calendarDays.map((d, i) => {
            const dateStr = format(d, 'yyyy-MM-dd');
            const hasEvent = bookings.some(b => b.date === dateStr);
            const isToday = isSameDay(d, today);
            const isCurrMonth = isSameMonth(d, monthStart);
            const isSelected = selectedDate === dateStr;
            
            return (
              <button 
                key={i} 
                onClick={() => setSelectedDate(dateStr)}
                className={cn(
                  "relative aspect-square min-h-[44px] flex items-center justify-center rounded-lg text-sm transition-all",
                  isToday && !isSelected && "bg-indigo-600/20 text-indigo-400 font-bold",
                  isSelected && "bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400 ring-offset-2 ring-offset-zinc-950",
                  !isSelected && (isCurrMonth ? "hover:bg-zinc-800 text-zinc-300" : "text-zinc-800"),
                  hasEvent && !isSelected && "bg-indigo-500/10 ring-1 ring-indigo-500/30 text-indigo-400"
                )}
              >
                <span className="relative z-10">{format(d, 'd')}</span>
                {hasEvent && !isSelected && (
                  <div className="absolute bottom-2 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Appointment / Next Event Sidebar */}
      <div className="col-span-12 lg:col-span-4 bg-bento-card border border-bento-border rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-indigo-400 font-bold block">
              {selectedDate ? 'Day Logistics' : 'Upcoming Event'}: {format(parseISO(selectedDisplayDate), 'MMM dd')}
            </span>
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate(null)}
                className="text-[10px] text-zinc-500 hover:text-white transition-colors underline decoration-zinc-800 underline-offset-4"
              >
                Clear
              </button>
            )}
          </div>

          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
            {effectiveBookings.length > 0 ? effectiveBookings.map((event, idx) => (
              <div key={event.id || idx} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-4">
                  <div className="min-w-[50px] h-12 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-[8px] text-zinc-500 uppercase leading-none mb-1">{format(parseISO(event.date), 'EEE')}</span>
                    <span className="text-xl font-bold text-white leading-none">{format(parseISO(event.date), 'dd')}</span>
                  </div>
                  <div className="overflow-hidden flex-grow">
                    <h3 className="font-bold text-white text-base leading-tight truncate">{event.clientName}</h3>
                    <p className="text-indigo-400 text-[10px] font-semibold uppercase tracking-tight">{event.eventType}</p>
                  </div>
                  <button 
                    onClick={() => handleDeleteBooking(event.id)}
                    className="p-2 hover:bg-rose-500/10 text-zinc-600 hover:text-rose-500 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                <div className="space-y-3 py-4 border-y border-zinc-800/50">
                  <div className="flex items-start gap-3">
                     <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                     <div className="space-y-1">
                       <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Location</p>
                       <p className="text-zinc-300 text-sm leading-snug">{event.location || 'Remote/Studio'}</p>
                     </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                     <div className="w-1.5 h-1.5 rounded-full bg-zinc-600 mt-1.5 shrink-0" />
                     <div className="space-y-1">
                       <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Remarks & Clues</p>
                       <p className="text-zinc-400 text-xs italic leading-relaxed">
                         "{event.remarks || 'No specific logistics noted for this booking.'}"
                       </p>
                     </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-40">
                <div className="w-16 h-16 bg-zinc-900/50 rounded-2xl flex items-center justify-center text-zinc-600 border border-zinc-800">
                  <Camera size={28} />
                </div>
                <div className="space-y-1">
                  <p className="text-zinc-400 font-bold text-sm">Open Schedule</p>
                  <p className="text-zinc-600 text-[10px] italic">No production logs for this date.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-zinc-800">
          <button className="w-full py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 font-bold text-sm hover:bg-zinc-800 transition-all flex items-center justify-center gap-2">
            Detailed Daily Logistics <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Large Kanban Stage Preview (Simplified for Bento) */}
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {['Booked', 'Shot', 'Editing', 'Delivered'].map((status) => (
          <div key={status} className="bg-bento-card border border-bento-border rounded-2xl p-4 flex flex-col gap-4 overflow-hidden backdrop-blur-md min-h-[200px]">
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
