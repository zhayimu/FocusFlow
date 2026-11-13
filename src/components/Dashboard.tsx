import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Trash2, MapPin, CalendarDays, Aperture, ArrowUpRight } from 'lucide-react';
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
  subMonths,
  differenceInCalendarDays,
} from 'date-fns';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import {
  Panel, PanelTitle, IconButton, Button, StatusPill, STAGES, NumberTicker, EmptyState, ConfirmDialog,
  useToast, describeError, rm,
} from './ui';
import InvoicesPanel from './InvoicesPanel';

type Tab = 'dashboard' | 'crm' | 'pipeline' | 'calendar' | 'finance';

const relativeDay = (date: string) => {
  const d = differenceInCalendarDays(parseISO(date), new Date());
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d > 1 && d < 7) return `In ${d} days`;
  return format(parseISO(date), 'EEE, d MMM');
};

export default function Dashboard({ onNavigate }: { onNavigate?: (tab: Tab) => void }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [clientCount, setClientCount] = useState(0);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const saved = sessionStorage.getItem('last_viewed_month');
    return saved ? new Date(saved) : new Date();
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(() => sessionStorage.getItem('last_selected_date') || null);

  useEffect(() => { sessionStorage.setItem('last_viewed_month', currentMonth.toISOString()); }, [currentMonth]);
  useEffect(() => {
    if (selectedDate) sessionStorage.setItem('last_selected_date', selectedDate);
    else sessionStorage.removeItem('last_selected_date');
  }, [selectedDate]);

  useEffect(() => {
    const unsubBookings = bookingService.subscribe(setBookings);
    const unsubClients = clientService.subscribe(data => setClientCount(data.length));
    return () => { unsubBookings(); unsubClients(); };
  }, []);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await bookingService.delete(toDelete.id);
      toast('success', `Removed the ${toDelete.eventType?.toLowerCase() || 'booking'} for ${toDelete.clientName}.`);
    } catch (err) {
      toast('error', describeError(err));
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  const totalRevenue = bookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0);
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const today = new Date();

  const upcomingEvents = bookings
    .filter(b => typeof b.date === 'string' && b.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextShoot = upcomingEvents[0];
  const openProjects = bookings.filter(b => b.status !== 'Delivered').length;

  const displayedBookings = selectedDate
    ? bookings.filter(b => b.date === selectedDate)
    : bookings.filter(b => b.date === todayStr);
  const effectiveBookings = displayedBookings.length === 0 && !selectedDate ? upcomingEvents.slice(0, 3) : displayedBookings;
  const agendaLabel = selectedDate
    ? format(parseISO(selectedDate), 'EEEE, d MMMM')
    : displayedBookings.length > 0 ? 'Today' : 'Coming up';

  // Calendar grid
  const monthStart = startOfMonth(currentMonth);
  const calendarDays: Date[] = [];
  for (let d = startOfWeek(monthStart); d <= endOfWeek(endOfMonth(monthStart)); d = addDays(d, 1)) calendarDays.push(d);

  const stats = [
    { label: 'Lifetime income', value: <NumberTicker value={totalRevenue} />, accent: true },
    { label: 'Open projects', value: <span className="tabular">{openProjects}</span> },
    { label: 'Shoots ahead', value: <span className="tabular">{upcomingEvents.length}</span> },
    { label: 'Clients', value: <span className="tabular">{clientCount}</span> },
  ];

  return (
    <div className="space-y-6">
      {/* Masthead row: next shoot + numbers */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <Panel className="relative col-span-12 overflow-hidden p-6 md:p-8 lg:col-span-7">
          <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-safelight/[0.07] blur-3xl" />
          <p className="eyebrow">Next shoot</p>
          {nextShoot ? (
            <div className="relative mt-5 flex gap-5 md:gap-7">
              {/* Date as a slide mount */}
              <div className="flex w-[76px] shrink-0 flex-col items-center rounded-xl bg-ink-850 py-3 ring-1 ring-inset ring-ink-800">
                <span className="eyebrow !text-[10px]">{format(parseISO(nextShoot.date), 'MMM')}</span>
                <span className="font-display font-semibold tracking-[-0.03em] text-4xl leading-none text-paper">{format(parseISO(nextShoot.date), 'd')}</span>
                <span className="mt-1 text-[11px] text-ink-400">{format(parseISO(nextShoot.date), 'EEE')}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-safelight">{relativeDay(nextShoot.date)} · {nextShoot.eventType}</p>
                <h2 className="mt-1 font-display font-semibold tracking-[-0.03em] text-3xl leading-[1.05] text-paper md:text-4xl">{nextShoot.clientName}</h2>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-300">
                  <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-ink-500" />{nextShoot.location || 'Studio'}</span>
                  <span className="font-mono tabular">{rm(Number(nextShoot.price) || 0)}</span>
                  <StatusPill status={nextShoot.status} />
                </div>
                {nextShoot.remarks && (
                  <p className="mt-4 max-w-[60ch] border-l-2 border-ink-700 pl-3 text-sm leading-relaxed text-ink-400">{nextShoot.remarks}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <h2 className="font-display font-semibold tracking-[-0.03em] text-4xl text-paper">Nothing booked yet.</h2>
              <p className="mt-2 max-w-[44ch] text-sm text-ink-400">Add a client with a shoot date and it will show up here, on the calendar and in the pipeline.</p>
              <Button variant="primary" className="mt-5" onClick={() => onNavigate?.('crm')}>Add a client</Button>
            </div>
          )}
        </Panel>

        <Panel className="col-span-12 grid grid-cols-2 lg:col-span-5">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={cn(
                'flex flex-col justify-between gap-6 p-5 md:p-6',
                i % 2 === 0 && 'border-r border-ink-800',
                i < 2 && 'border-b border-ink-800',
              )}
            >
              <p className="text-[13px] text-ink-400">{s.label}</p>
              <p className={cn('font-display font-semibold tracking-[-0.03em] leading-none', s.accent ? 'text-[1.75rem] md:text-[2.1rem] text-safelight' : 'text-[2rem] md:text-[2.6rem] text-paper')}>
                {s.value}
              </p>
            </div>
          ))}
        </Panel>
      </div>

      <InvoicesPanel />

      {/* Calendar + agenda */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <Panel className="col-span-12 p-5 md:p-6 lg:col-span-7">
          <PanelTitle title={format(currentMonth, 'MMMM yyyy')} meta="Tap a day to see what's booked">
            <div className="flex gap-1">
              <IconButton label="Previous month" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft size={17} /></IconButton>
              <IconButton label="Next month" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight size={17} /></IconButton>
            </div>
          </PanelTitle>

          <div className="mt-5 grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="pb-2 text-center text-[11px] text-ink-500">{d.slice(0, 1)}<span className="hidden sm:inline">{d.slice(1)}</span></div>
            ))}
            {calendarDays.map(d => {
              const dateStr = format(d, 'yyyy-MM-dd');
              const count = bookings.filter(b => b.date === dateStr).length;
              const isToday = isSameDay(d, today);
              const inMonth = isSameMonth(d, monthStart);
              const isSelected = selectedDate === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  aria-pressed={isSelected}
                  aria-label={`${format(d, 'd MMMM')}${count ? `, ${count} booking${count > 1 ? 's' : ''}` : ''}`}
                  className={cn(
                    'relative flex h-11 sm:h-12 flex-col items-center justify-center rounded-lg text-sm tabular transition-colors duration-150',
                    !inMonth && 'text-ink-700',
                    inMonth && !isSelected && 'text-ink-300 hover:bg-ink-850 hover:text-paper',
                    isToday && !isSelected && 'ring-1 ring-inset ring-safelight/60 text-paper',
                    count > 0 && !isSelected && inMonth && 'bg-ink-850 text-paper font-medium',
                    isSelected && 'bg-paper text-ink-950 font-semibold',
                  )}
                >
                  {format(d, 'd')}
                  {count > 0 && (
                    <span className="absolute bottom-1.5 flex gap-0.5">
                      {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                        <span key={i} className={cn('size-1 rounded-full', isSelected ? 'bg-ink-950' : 'bg-safelight')} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel className="col-span-12 flex flex-col p-5 md:p-6 lg:col-span-5">
          <PanelTitle title={agendaLabel} meta={`${effectiveBookings.length} booking${effectiveBookings.length === 1 ? '' : 's'}`}>
            {selectedDate && <Button size="sm" variant="ghost" onClick={() => setSelectedDate(null)}>Back to today</Button>}
          </PanelTitle>

          <div className="mt-4 flex-1 divide-y divide-ink-800">
            {effectiveBookings.length > 0 ? effectiveBookings.map((event, idx) => (
              <motion.article
                key={event.id || idx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.3 }}
                className="group flex gap-4 py-4 first:pt-1"
              >
                <div className="w-11 shrink-0 pt-0.5 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-ink-500">{format(parseISO(event.date), 'EEE')}</p>
                  <p className="font-display font-semibold tracking-[-0.03em] text-2xl leading-none text-paper">{format(parseISO(event.date), 'd')}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-semibold text-paper">{event.clientName}</h3>
                      <p className="text-[13px] text-ink-400">{event.eventType} · {event.location || 'Studio'}</p>
                    </div>
                    <IconButton
                      label={`Delete booking for ${event.clientName}`}
                      tone="danger"
                      className="-mr-2 opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => setToDelete(event)}
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <StatusPill status={event.status} />
                    <span className="font-mono text-xs text-ink-500 tabular">{rm(Number(event.price) || 0)}</span>
                  </div>
                  {event.remarks && <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-400">{event.remarks}</p>}
                </div>
              </motion.article>
            )) : (
              <EmptyState icon={Aperture} title="A free day" body="No shoots on this date. Good time for culling and edits." className="py-10" />
            )}
          </div>

          <Button variant="secondary" className="mt-4 w-full justify-between" onClick={() => onNavigate?.('calendar')}>
            <span className="inline-flex items-center gap-2"><CalendarDays size={15} /> Open full calendar</span>
            <ChevronRight size={15} className="text-ink-500" />
          </Button>
        </Panel>
      </div>

      {/* Pipeline strip */}
      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 md:px-6">
          <PanelTitle title="Production" meta="Where each project sits right now" />
          <Button size="sm" variant="ghost" onClick={() => onNavigate?.('pipeline')}>
            Pipeline <ArrowUpRight size={14} />
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-1 border-t border-ink-800 sm:grid-cols-2 lg:grid-cols-5">
          {STAGES.map((stage, i) => {
            const items = bookings.filter(b => b.status === stage.id);
            return (
              <div
                key={stage.id}
                className={cn(
                  'min-h-[168px] p-5 border-ink-800',
                  i < STAGES.length - 1 && 'border-b lg:border-b-0 lg:border-r',
                  i % 2 === 0 && i < STAGES.length - 1 && 'sm:border-r',
                )}
              >
                <div className="flex items-baseline justify-between">
                  <StatusPill status={stage.id} />
                  <span className="font-display font-semibold tracking-[-0.03em] text-2xl leading-none text-paper tabular">{items.length}</span>
                </div>
                <ul className="mt-4 space-y-2.5">
                  {items.slice(0, 3).map(b => (
                    <li key={b.id} className="min-w-0">
                      <p className="truncate text-sm text-paper">{b.clientName}</p>
                      <p className="truncate text-xs text-ink-500">{b.eventType} · <span className="font-mono">{rm(Number(b.price) || 0)}</span></p>
                    </li>
                  ))}
                  {items.length === 0 && <li className="text-xs text-ink-500">{stage.hint}: none</li>}
                  {items.length > 3 && <li className="text-xs text-ink-500">+{items.length - 3} more</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </Panel>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this booking?"
        body={toDelete && <>The {toDelete.eventType?.toLowerCase()} for <strong className="text-paper">{toDelete.clientName}</strong> on {format(parseISO(toDelete.date), 'd MMMM yyyy')} will be removed. The client record stays.</>}
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
