import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { bookingService } from '../lib/firestoreService';

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    return bookingService.subscribe(setEvents);
  }, []);

  const renderHeader = () => (
    <header className="flex justify-between items-end mb-8">
      <div>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">Temporal Calendar</span>
        <h1 className="text-4xl font-bold tracking-tighter text-white mt-1">{format(currentMonth, 'MMMM yyyy')}</h1>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors"><ChevronLeft size={20} /></button>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors"><ChevronRight size={20} /></button>
      </div>
    </header>
  );

  const renderDays = () => (
    <div className="grid grid-cols-7 mb-2 border-b border-zinc-800">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
        <div key={idx} className="py-4 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">{day}</div>
      ))}
    </div>
  );

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'd');
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayEvents = events.filter(e => e.date === dateStr);

        days.push(
          <div key={day.toString()} className={cn("min-h-[120px] p-4 border border-zinc-900 transition-all bg-zinc-900/20 relative group hover:bg-zinc-800/40", !isSameMonth(day, monthStart) ? "text-zinc-700" : "text-zinc-100", isSameDay(day, new Date()) && "bg-indigo-500/5 ring-1 ring-inset ring-indigo-500/20")}>
            <span className={cn("text-xs font-mono font-bold", isSameDay(day, new Date()) && "text-indigo-400")}>{formattedDate}</span>
            <div className="mt-3 space-y-1.5 flex flex-col items-start">
              {dayEvents.map(event => (
                <div key={event.id} className="w-full px-2 py-1 bg-indigo-600/90 text-white rounded text-[9px] font-bold leading-tight truncate border border-indigo-400/20 shadow-lg shadow-indigo-500/20">
                  {event.clientName}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div className="border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl bg-zinc-900/10 backdrop-blur-md">{rows}</div>;
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      {renderHeader()}
      <div className="flex-grow">
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
}
