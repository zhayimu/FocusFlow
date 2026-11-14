// Run: npx tsx src/lib/reminders.check.ts
import assert from 'node:assert/strict';
import { dueSoon } from './reminders';

const today = new Date(2026, 10, 14); // 14 Nov 2026
const ids = dueSoon([
  { id: 'past', date: '2026-11-13', status: 'Booked' },
  { id: 'today', date: '2026-11-14', status: 'Booked' },
  { id: 'd3', date: '2026-11-17', status: 'Shot' },
  { id: 'd4', date: '2026-11-18', status: 'Booked' },
  { id: 'done', date: '2026-11-15', status: 'Delivered' },
  { id: 'bad', date: undefined, status: 'Booked' },
], today).map(b => b.id);

assert.deepEqual(ids, ['today', 'd3']);
console.log('reminders ok');
