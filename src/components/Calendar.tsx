import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays } from 'date-fns';
import { cn } from '../lib/utils';
import { bookingService } from '../lib/firestoreService';
import { PageHeader, Panel, IconButton, Button, stageOf } from './ui';

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => bookingService.subscribe(setEvents), []);

  const monthStart = startOfMonth(currentMonth);
  const days: Date[] = [];
  for (let d = startOfWeek(monthStart); d <= endOfWeek(endOfMonth(monthStart)); d = addDays(d, 1)) days.push(d);

  const monthPrefix = format(currentMonth, 'yyyy-MM');
  const monthCount = events.filter(e => typeof e.date === 'string' && e.date.startsWith(monthPrefix)).length;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`${monthCount} shoot${monthCount === 1 ? '' : 's'} this month`} title={format(currentMonth, 'MMMM yyyy')}>
        <Button size="sm" variant="ghost" onClick={() => setCurrentMonth(new Date())}>Today</Button>
        <IconButton label="Previous month" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={18} /></IconButton>
        <IconButton label="Next month" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={18} /></IconButton>
      </PageHeader>

      <Panel className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-ink-800">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs text-ink-500">
              {day.slice(0, 1)}<span className="hidden md:inline">{day.slice(1)}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayEvents = events.filter(e => e.date === dateStr);
            const isToday = isSameDay(day, new Date());
            const inMonth = isSameMonth(day, monthStart);
            return (
              <div
                key={dateStr}
                className={cn(
                  'min-h-[78px] border-ink-800 p-1.5 md:min-h-[128px] md:p-2.5',
                  (i + 1) % 7 !== 0 && 'border-r',
                  i < days.length - 7 && 'border-b',
                  !inMonth && 'bg-ink-950/50',
                )}
              >
                <span
                  className={cn(
                    'inline-grid size-6 place-items-center rounded-md text-xs tabular md:size-7 md:text-[13px]',
                    inMonth ? 'text-ink-300' : 'text-ink-700',
                    isToday && 'bg-safelight font-semibold text-safelight-ink',
                  )}
                >
                  {format(day, 'd')}
                </span>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, 3).map(event => {
                    const s = stageOf(event.status);
                    return (
                      <div
                        key={event.id}
                        title={`${event.clientName} · ${event.eventType} · ${s.id}`}
                        className="flex items-center gap-1.5 rounded-md bg-ink-850 px-1.5 py-1 ring-1 ring-inset ring-ink-800 md:px-2"
                      >
                        <span className={cn('size-1.5 shrink-0 rounded-full', s.dot)} />
                        <span className="hidden truncate text-[11.5px] font-medium text-paper md:block">{event.clientName}</span>
                      </div>
                    );
                  })}
                  {dayEvents.length > 3 && <p className="pl-1 text-[10.5px] text-ink-500">+{dayEvents.length - 3} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
