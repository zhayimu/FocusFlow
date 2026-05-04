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
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-4 md:mb-8">
      <div>
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">Temporal Calendar</span>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-white mt-1">{format(currentMonth, 'MMMM yyyy')}</h1>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="flex-1 sm:flex-none p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors flex justify-center"><ChevronLeft size={20} /></button>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="flex-1 sm:flex-none p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors flex justify-center"><ChevronRight size={20} /></button>
      </div>
    </header>
  );

  const renderDays = () => (
    <div className="grid grid-cols-7 mb-2 border-b border-zinc-800">
      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
        <div key={idx} className="py-3 md:py-4 text-center text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">{day}</div>
      ))}
    </div>
  );

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarWeeks = [];
    let day = startDate;

    while (day <= endDate) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayEvents = events.filter(e => e.date === dateStr);
        const isToday = isSameDay(day, new Date());
        const isCurrMonth = isSameMonth(day, monthStart);

        days.push(
          <div 
            key={day.toString()} 
            className={cn(
              "min-h-[70px] md:min-h-[120px] p-2 md:p-4 border border-zinc-900 transition-all bg-zinc-900/20 relative group hover:bg-zinc-800/40", 
              !isCurrMonth ? "text-zinc-700" : "text-zinc-100", 
              isToday && "bg-indigo-500/5"
            )}
          >
            <span className={cn("text-[10px] md:text-xs font-mono font-bold", isToday && "text-indigo-400")}>{format(day, 'd')}</span>
            <div className="mt-1 md:mt-3 space-y-1 md:space-y-1.5 flex flex-col items-start overflow-hidden">
              {dayEvents.slice(0, 3).map(event => (
                <div key={event.id} className="w-full px-1.5 py-0.5 md:px-2 md:py-1 bg-indigo-600/90 text-white rounded text-[8px] md:text-[9px] font-bold leading-tight truncate border border-indigo-400/20 shadow-lg shadow-indigo-500/20">
                  <span className="md:inline hidden">{event.clientName}</span>
                  <span className="md:hidden inline-block w-1.5 h-1.5 bg-white rounded-full mx-auto" />
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="text-[8px] text-zinc-500 font-mono pl-1">+{dayEvents.length - 3}</div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      calendarWeeks.push(<div className="grid grid-cols-7" key={day.toString()}>{days}</div>);
    }
    return <div className="border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl bg-zinc-900/10 backdrop-blur-md">{calendarWeeks}</div>;
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
