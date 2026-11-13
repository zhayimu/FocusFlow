import { useState, useEffect, useMemo, useRef } from 'react';
import { FileText, Download, X, Printer, Receipt } from 'lucide-react';
import { bookingService } from '../lib/firestoreService';
import { format, parseISO, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth } from 'date-fns';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { downloadElementAsPdf, DOC } from '../lib/pdf';
import {
  PageHeader, Panel, PanelTitle, Button, IconButton, Segmented, Field, inputClass, NumberTicker, EmptyState,
  useToast, rm,
} from './ui';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const yearOf = (d: unknown) => (typeof d === 'string' ? Number(d.slice(0, 4)) : NaN);

/* ------------------------------------------------------------------ */
/* Payslip                                                             */
/* ------------------------------------------------------------------ */

function PayslipModal({ onClose, monthlyData }: { onClose: () => void; monthlyData: { name: string; income: number }[] }) {
  const toast = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [data, setData] = useState({
    name: '',
    role: 'Photographer',
    month: format(new Date(), 'MMMM'),
    year: format(new Date(), 'yyyy'),
    basicSalary: '0',
    allowance: '0',
    deduction: '0',
    bonus: '0',
  });
  const set = (patch: Partial<typeof data>) => setData(prev => ({ ...prev, ...patch }));

  // Default the basic salary to that month's income.
  useEffect(() => {
    const record = monthlyData.find(m => m.name === data.month.substring(0, 3));
    if (record) setData(prev => ({ ...prev, basicSalary: record.income.toString() }));
  }, [data.month, monthlyData]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const payslipId = useMemo(() => `PS-${format(new Date(), 'yyyyMM')}-${Math.floor(1000 + Math.random() * 9000)}`, []);
  const basic = Number(data.basicSalary) || 0;
  const allow = Number(data.allowance) || 0;
  const bon = Number(data.bonus) || 0;
  const ded = Number(data.deduction) || 0;
  const netPay = basic + allow + bon - ded;
  const contentRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!contentRef.current) return;
    setIsGenerating(true);
    try {
      await downloadElementAsPdf(contentRef.current, 'payslip-content', `Payslip_${data.name.replace(/\s+/g, '_') || 'Staff'}_${data.month}.pdf`);
      toast('success', `Payslip for ${data.month} saved as PDF.`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast('error', 'Could not create the PDF. Try again, or use Print instead.');
    } finally {
      setIsGenerating(false);
    }
  };

  const serif = { fontFamily: '"Geist", system-ui, sans-serif', fontWeight: 600, letterSpacing: '-0.03em' };
  const Row = ({ label, value, tone }: { label: string; value: string; tone?: 'neg' }) => (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${DOC.line}` }}>
      <span className="text-sm" style={{ color: tone === 'neg' ? '#a6452a' : DOC.body }}>{label}</span>
      <span className="font-mono text-sm font-medium" style={{ color: tone === 'neg' ? '#a6452a' : DOC.ink }}>{value}</span>
    </div>
  );

  const money = (key: 'basicSalary' | 'allowance' | 'bonus' | 'deduction', label: string) => (
    <Field label={label} htmlFor={`ps-${key}`}>
      <input id={`ps-${key}`} type="number" min={0} inputMode="decimal" className={inputClass + ' font-mono'} value={data[key]} onChange={e => set({ [key]: e.target.value } as any)} />
    </Field>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/90 backdrop-blur-sm sm:p-6 print:bg-white print:p-0" role="dialog" aria-modal="true" aria-label="Payslip">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
        className="flex h-full w-full flex-col overflow-hidden bg-ink-900 ring-1 ring-ink-800 sm:h-[92dvh] sm:max-w-6xl sm:flex-row sm:rounded-[1.25rem] print:rounded-none print:ring-0"
      >
        {/* Form */}
        <div className="w-full shrink-0 space-y-5 overflow-y-auto border-b border-ink-800 p-6 sm:w-80 sm:border-b-0 sm:border-r print:hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display font-semibold tracking-[-0.03em] text-2xl leading-tight text-paper">Payslip</p>
              <p className="mt-1 text-xs text-ink-500">Basic salary defaults to that month's income.</p>
            </div>
            <IconButton label="Close payslip" onClick={onClose} className="-mr-2"><X size={18} /></IconButton>
          </div>

          <Field label="Staff name" htmlFor="ps-name">
            <input id="ps-name" type="text" value={data.name} onChange={e => set({ name: e.target.value })} placeholder="Full name" className={inputClass} />
          </Field>
          <Field label="Role" htmlFor="ps-role">
            <input id="ps-role" type="text" value={data.role} onChange={e => set({ role: e.target.value })} className={inputClass} />
          </Field>
          <div className="grid grid-cols-[1fr_88px] gap-3">
            <Field label="Month" htmlFor="ps-month">
              <select id="ps-month" value={data.month} onChange={e => set({ month: e.target.value })} className={inputClass + ' appearance-none'}>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Year" htmlFor="ps-year">
              <input id="ps-year" type="text" inputMode="numeric" value={data.year} onChange={e => set({ year: e.target.value })} className={inputClass + ' font-mono'} />
            </Field>
          </div>

          <div className="space-y-4 border-t border-ink-800 pt-5">
            {money('basicSalary', 'Basic salary (RM)')}
            <div className="grid grid-cols-2 gap-3">
              {money('allowance', 'Allowance')}
              {money('bonus', 'Bonus')}
            </div>
            {money('deduction', 'Deductions (RM)')}
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" onClick={() => window.print()} className="flex-1"><Printer size={15} /> Print</Button>
            <Button variant="primary" onClick={downloadPDF} disabled={isGenerating} className="flex-[2]">
              <Download size={15} /> {isGenerating ? 'Preparing…' : 'Download PDF'}
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="h-full flex-1 overflow-y-auto bg-ink-950 p-4 sm:p-10 print:bg-white print:p-0">
          <div
            id="payslip-content"
            ref={contentRef}
            className="mx-auto w-full max-w-[800px] space-y-12 p-8 sm:min-h-[1060px] sm:p-14 sm:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]"
            style={{ backgroundColor: '#ffffff', color: DOC.ink, fontFamily: '"Geist", system-ui, sans-serif' }}
          >
            <div className="flex items-end justify-between gap-6">
              <div>
                <p style={{ ...serif, fontSize: 40, lineHeight: 1, color: DOC.ink }}>zhayimuuu</p>
                <p className="mt-2 text-xs" style={{ color: DOC.muted }}>Photography · Malaysia</p>
              </div>
              <div className="text-right">
                <p style={{ ...serif, fontSize: 30, lineHeight: 1, color: DOC.accent }}>Payslip</p>
                <p className="mt-2 font-mono text-xs" style={{ color: DOC.muted }}>{payslipId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-8" style={{ borderTop: `1px solid ${DOC.line}` }}>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: DOC.muted }}>Paid to</p>
                <p className="mt-3 text-lg font-semibold" style={{ color: DOC.ink }}>{data.name || '—'}</p>
                <p className="text-sm" style={{ color: DOC.body }}>{data.role}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: DOC.muted }}>Pay period</p>
                <p className="mt-3 text-lg font-semibold" style={{ color: DOC.ink }}>{data.month} {data.year}</p>
                <p className="text-sm" style={{ color: DOC.body }}>Paid <span className="font-mono">{format(new Date(), 'd MMM yyyy')}</span></p>
              </div>
            </div>

            <div>
              <p className="pb-2 text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: DOC.muted, borderBottom: `1.5px solid ${DOC.ink}` }}>Earnings & deductions</p>
              <Row label="Basic salary" value={rm(basic)} />
              <Row label="Allowance" value={rm(allow)} />
              {bon > 0 && <Row label="Bonus" value={rm(bon)} />}
              {ded > 0 && <Row label="Deductions" value={`− ${rm(ded)}`} tone="neg" />}
            </div>

            <div className="flex items-end justify-between rounded-2xl px-6 py-7" style={{ backgroundColor: DOC.wash }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: DOC.ink }}>Net pay</p>
                <p className="text-xs" style={{ color: DOC.muted }}>For {data.month} {data.year}</p>
              </div>
              <p style={{ ...serif, fontSize: 44, lineHeight: 1, color: DOC.ink }}>{rm(netPay)}</p>
            </div>

            <p className="pt-10 text-center text-[11px]" style={{ color: DOC.muted }}>
              Computer-generated payslip. No signature required.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Income                                                              */
/* ------------------------------------------------------------------ */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-ink-850 px-3 py-2 ring-1 ring-ink-700 shadow-xl">
      <p className="text-[11px] text-ink-400">{label}</p>
      <p className="font-mono text-sm font-medium text-paper tabular">{rm(payload[0].value)}</p>
    </div>
  );
}

export default function Finance() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showPayslip, setShowPayslip] = useState(false);

  useEffect(() => bookingService.subscribe(setBookings), []);

  const years = useMemo(() => {
    const s = new Set<number>([new Date().getFullYear()]);
    bookings.forEach(b => { const y = yearOf(b.date); if (!isNaN(y)) s.add(y); });
    return Array.from(s).sort((a, b) => b - a);
  }, [bookings]);

  const yearBookings = useMemo(
    () => bookings.filter(b => yearOf(b.date) === selectedYear).sort((a, b) => b.date.localeCompare(a.date)),
    [bookings, selectedYear],
  );
  const yearIncome = yearBookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0);
  const allTimeIncome = bookings.reduce((acc, b) => acc + (Number(b.price) || 0), 0);

  const monthlyData = useMemo(() => {
    const start = startOfYear(new Date(selectedYear, 0, 1));
    return eachMonthOfInterval({ start, end: endOfYear(start) }).map(month => ({
      name: format(month, 'MMM'),
      income: bookings
        .filter(b => typeof b.date === 'string' && isSameMonth(parseISO(b.date), month))
        .reduce((acc, b) => acc + (Number(b.price) || 0), 0),
    }));
  }, [bookings, selectedYear]);

  const bestMonth = monthlyData.reduce((best, m) => (m.income > best.income ? m : best), { name: '—', income: 0 });

  const categoryDistribution = useMemo(() => {
    if (yearIncome === 0) return [];
    const dist: Record<string, number> = {};
    yearBookings.forEach(b => { const c = b.eventType || 'Other'; dist[c] = (dist[c] || 0) + (Number(b.price) || 0); });
    return Object.entries(dist)
      .map(([label, amount]) => ({ label, amount, value: Math.round((amount / yearIncome) * 100) }))
      .sort((a, b) => b.amount - a.amount);
  }, [yearBookings, yearIncome]);

  const kpis = [
    { label: `Income in ${selectedYear}`, value: <NumberTicker value={yearIncome} />, accent: true },
    { label: 'Monthly average', value: <NumberTicker value={yearIncome / 12} /> },
    { label: 'Best month', value: <>{bestMonth.income > 0 ? bestMonth.name : '—'}</>, sub: bestMonth.income > 0 ? rm(bestMonth.income) : undefined },
    { label: 'All-time income', value: <NumberTicker value={allTimeIncome} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Income" title={<>The year in <span className="text-safelight">ringgit</span></>}>
        <Segmented label="Year" value={selectedYear} onChange={setSelectedYear} options={years.map(y => ({ value: y, label: y }))} />
        <Button variant="secondary" onClick={() => setShowPayslip(true)}><FileText size={15} /> Payslip</Button>
      </PageHeader>

      <Panel className="grid grid-cols-2 lg:grid-cols-4">
        {kpis.map((k, i) => (
          <div
            key={k.label}
            className={cn(
              'flex flex-col justify-between gap-5 p-5 md:p-6 border-ink-800',
              i % 2 === 0 && 'border-r',
              i < 2 && 'border-b lg:border-b-0',
              i === 1 && 'lg:border-r',
            )}
          >
            <p className="text-[13px] text-ink-400">{k.label}</p>
            <div>
              <p className={cn('font-display font-semibold tracking-[-0.03em] leading-none', k.accent ? 'text-[1.75rem] md:text-[2.2rem] text-safelight' : 'text-[1.6rem] md:text-[2rem] text-paper')}>{k.value}</p>
              {k.sub && <p className="mt-1 font-mono text-xs text-ink-500 tabular">{k.sub}</p>}
            </div>
          </div>
        ))}
      </Panel>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <Panel className="col-span-12 p-5 md:p-6 lg:col-span-8">
          <PanelTitle title="By month" meta={`Booked fees, ${selectedYear}`} />
          <div className="mt-6 h-[280px] w-full md:h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e0a458" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#e0a458" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#2a251f" vertical={false} />
                <XAxis dataKey="name" stroke="#7a7064" fontSize={11} axisLine={false} tickLine={false} dy={8} />
                <YAxis
                  stroke="#7a7064" fontSize={11} axisLine={false} tickLine={false} width={56}
                  tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 ? 1 : 0)}k` : `${v}`)}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#3a332b', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="income" stroke="#e0a458" strokeWidth={2} fill="url(#incomeFill)" animationDuration={900}
                  activeDot={{ r: 4, fill: '#e0a458', stroke: '#12100e', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="col-span-12 flex flex-col p-5 md:p-6 lg:col-span-4">
          <PanelTitle title="By shoot type" meta="Share of the year's income" />
          <div className="mt-6 flex-1 space-y-5">
            {categoryDistribution.length === 0 ? (
              <p className="text-sm text-ink-500">No bookings in {selectedYear} yet.</p>
            ) : categoryDistribution.map((item, i) => (
              <div key={item.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm text-paper">{item.label}</p>
                  <p className="font-mono text-xs text-ink-400 tabular">{rm(item.amount)} · <span className="text-paper">{item.value}%</span></p>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-850">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: item.value / 100 }}
                    transition={{ duration: 0.8, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    style={{ transformOrigin: 'left' }}
                    className={cn('h-full w-full rounded-full', i === 0 ? 'bg-safelight' : 'bg-ink-500')}
                  />
                </div>
              </div>
            ))}
          </div>
          {categoryDistribution[0] && (
            <p className="mt-6 border-t border-ink-800 pt-4 text-[13px] leading-relaxed text-ink-400">
              <span className="text-paper">{categoryDistribution[0].label}</span> brought in {categoryDistribution[0].value}% of {selectedYear}'s income.
            </p>
          )}
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 md:px-6">
          <PanelTitle title="Transactions" meta={`${yearBookings.length} booking${yearBookings.length === 1 ? '' : 's'} in ${selectedYear}`} />
        </div>
        {yearBookings.length === 0 ? (
          <EmptyState icon={Receipt} title={`Nothing in ${selectedYear}`} body="Booked fees appear here as soon as a client is added." className="border-t border-ink-800" />
        ) : (
          <>
            <table className="hidden w-full border-t border-ink-800 text-left md:table">
              <thead>
                <tr className="border-b border-ink-800 text-xs text-ink-500">
                  <th className="px-6 py-3 font-normal">Client</th>
                  <th className="px-6 py-3 font-normal">Shoot</th>
                  <th className="px-6 py-3 font-normal">Date</th>
                  <th className="px-6 py-3 text-right font-normal">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {yearBookings.map(b => (
                  <tr key={b.id} className="transition-colors hover:bg-ink-850/60">
                    <td className="px-6 py-3.5 font-medium text-paper">{b.clientName}</td>
                    <td className="px-6 py-3.5 text-sm text-ink-300">{b.eventType}</td>
                    <td className="px-6 py-3.5 font-mono text-[13px] text-ink-400 tabular">{format(parseISO(b.date), 'd MMM yyyy')}</td>
                    <td className="px-6 py-3.5 text-right font-mono text-sm text-sage tabular">+{rm(Number(b.price) || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="divide-y divide-ink-800 border-t border-ink-800 md:hidden">
              {yearBookings.map(b => (
                <li key={b.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-paper">{b.clientName}</p>
                    <p className="text-xs text-ink-500">{b.eventType} · <span className="font-mono">{format(parseISO(b.date), 'd MMM')}</span></p>
                  </div>
                  <p className="shrink-0 font-mono text-sm text-sage tabular">+{rm(Number(b.price) || 0)}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <AnimatePresence>
        {showPayslip && <PayslipModal onClose={() => setShowPayslip(false)} monthlyData={monthlyData} />}
      </AnimatePresence>
    </div>
  );
}
