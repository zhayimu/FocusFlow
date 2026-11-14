import { useEffect, useState } from 'react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { bookingService } from './firestoreService';

export const REMIND_DAYS = 3;

/** Bookings whose shoot date is today .. today+REMIND_DAYS and not yet delivered. */
export function dueSoon(bookings: any[], today = new Date()) {
  return bookings
    .filter(b => typeof b.date === 'string' && b.status !== 'Delivered')
    .map(b => ({ ...b, daysLeft: differenceInCalendarDays(parseISO(b.date), today) }))
    .filter(b => b.daysLeft >= 0 && b.daysLeft <= REMIND_DAYS)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export const whenLabel = (d: number) => (d === 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`);

const lsHas = (k: string) => { try { return !!localStorage.getItem(k); } catch { return false; } };
const lsSet = (k: string) => { try { localStorage.setItem(k, '1'); } catch { /* private mode */ } };

/**
 * Fires a system notification once per booking per day while the app is open.
 * ponytail: tab-open only. Closed-tab alerts need FCM + a scheduled Cloud Function.
 */
export function useShootReminders(uid: string | undefined, onInApp?: (msg: string) => void) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [tick, setTick] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );

  useEffect(() => (uid ? bookingService.subscribe(setBookings) : setBookings([])), [uid]);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 60 * 60 * 1000); return () => clearInterval(id); }, []);

  const upcoming = dueSoon(bookings);

  useEffect(() => {
    const day = format(new Date(), 'yyyy-MM-dd');
    for (const b of upcoming) {
      const key = `reminded:${b.id}:${day}`;
      if (lsHas(key)) continue;
      lsSet(key);
      const title = `Shoot ${whenLabel(b.daysLeft)}: ${b.clientName}`;
      const body = [b.eventType, b.location, format(parseISO(b.date), 'EEE d MMM')].filter(Boolean).join(' · ');
      if (permission === 'granted') {
        const n = new Notification(title, { body, tag: key });
        n.onclick = () => { window.focus(); n.close(); };
      } else {
        onInApp?.(`${title}\n${body}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, tick, permission]);

  const enable = async () => {
    if (typeof Notification === 'undefined') return;
    setPermission(await Notification.requestPermission());
  };

  return { upcoming, permission, enable };
}
