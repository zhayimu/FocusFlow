import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, Plus, Printer, Trash2, X, FilePlus2, Lock } from 'lucide-react';
import { addDays, format, parseISO } from 'date-fns';
import { clientService, invoiceService } from '../lib/firestoreService';
import { downloadElementAsPdf, DOC } from '../lib/pdf';
import { cn } from '../lib/utils';
import { Button, Field, IconButton, Segmented, inputClass, useToast, describeError } from './ui';

/* ------------------------------------------------------------------ */
/* Types & maths                                                       */
/* ------------------------------------------------------------------ */

type Item = { id: string; description: string; qty: number; price: number };

type Draft = {
  clientId: string;
  clientName: string;
  phone: string;
  email: string;
  address: string;
  eventType: string;
  eventDate: string;
  issueDate: string;
  dueDate: string;
  items: Item[];
  discount: number;
  taxRate: number;
  deposit: number;
  depositDate: string;
  notes: string;
  paymentDetails: string;
};

/** Default "How to pay" block on new invoices (editable per invoice). */
const DEFAULT_PAYMENT_DETAILS = 'Bank transfer\nMaybank\nMohammad Zaimmudin\nAccount no. 164061919744';

const LS_TERMS = 'invoice_terms';
const LS_PAYMENT = 'invoice_payment_details';
const lsGet = (k: string) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => format(new Date(), 'yyyy-MM-dd');
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const rm2 = (n: number) => `RM ${round2(n).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const nice = (d?: string) => { if (!d) return ''; try { return format(parseISO(d), 'd MMM yyyy'); } catch { return d; } };

export function totalsOf(d: Pick<Draft, 'items' | 'discount' | 'taxRate' | 'deposit'>) {
  const subtotal = round2(d.items.reduce((a, i) => a + (Number(i.qty) || 0) * (Number(i.price) || 0), 0));
  const discount = round2(Math.min(Math.max(Number(d.discount) || 0, 0), subtotal));
  const taxable = subtotal - discount;
  const taxAmount = round2((taxable * (Number(d.taxRate) || 0)) / 100);
  const total = round2(taxable + taxAmount);
  const deposit = round2(Math.max(Number(d.deposit) || 0, 0));
  const balance = round2(total - deposit);
  return { subtotal, discount, taxAmount, total, deposit, balance };
}

function blankDraft(client?: any): Draft {
  const issue = today();
  return {
    clientId: client?.id || '',
    clientName: client?.name || '',
    phone: client?.phone || '',
    email: client?.email || '',
    address: client?.location || '',
    eventType: client?.eventType || '',
    eventDate: client?.eventDate || '',
    issueDate: issue,
    dueDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    items: client
      ? [{ id: uid(), description: `${client.eventType || 'Photography'} photography coverage`, qty: 1, price: Number(client.price) || 0 }]
      : [{ id: uid(), description: '', qty: 1, price: 0 }],
    discount: 0,
    taxRate: 0,
    deposit: 0,
    depositDate: '',
    notes: lsGet(LS_TERMS),
    paymentDetails: lsGet(LS_PAYMENT) || DEFAULT_PAYMENT_DETAILS,
  };
}

function draftFromSaved(inv: any): Draft {
  return {
    ...blankDraft(),
    ...inv,
    items: (inv.items || []).map((i: any) => ({ id: uid(), description: i.description, qty: i.qty, price: i.price })),
  };
}

const nextFrame = () => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));

/* ------------------------------------------------------------------ */
/* A4 document                                                         */
/* ------------------------------------------------------------------ */

const sans = '"Geist", system-ui, sans-serif';
const head = { fontFamily: sans, fontWeight: 600, letterSpacing: '-0.03em' } as const;
const label = 'text-[11px] font-medium uppercase tracking-[0.08em]';

const InvoiceDocument = React.forwardRef<HTMLDivElement, { d: Draft; number: string; draft: boolean }>(function InvoiceDocument({ d, number, draft }, ref) {
  const t = totalsOf(d);
  const paid = t.total > 0 && t.balance <= 0;
  const items = d.items.filter(i => i.description.trim() || i.price);

  return (
    <div
      id="invoice-content"
      ref={ref}
      className="mx-auto flex w-full max-w-[800px] flex-col gap-10 p-8 sm:min-h-[1131px] sm:p-12"
      style={{ backgroundColor: '#ffffff', color: DOC.ink, fontFamily: sans }}
    >
      {/* Masthead */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <p style={{ ...head, fontSize: 30, lineHeight: 1 }}>zhayimuuu</p>
          <p className="mt-2 text-xs" style={{ color: DOC.muted }}>Photography · Malaysia</p>
        </div>
        <div className="text-right">
          <p style={{ ...head, fontSize: 28, lineHeight: 1, color: DOC.accent }}>Invoice</p>
          <p className="mt-2 font-mono text-sm font-medium" style={{ color: DOC.ink }}>{number}</p>
          {draft && <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: DOC.muted }}>Draft · number issued on save</p>}
        </div>
      </div>

      {/* Parties & dates */}
      <div className="grid grid-cols-2 gap-8 pt-8" style={{ borderTop: `1px solid ${DOC.line}` }}>
        <div className="min-w-0">
          <p className={label} style={{ color: DOC.muted }}>Billed to</p>
          <p className="mt-3 text-lg font-semibold break-words" style={{ color: DOC.ink }}>{d.clientName || 'Client name'}</p>
          {d.phone && <p className="mt-1 text-sm" style={{ color: DOC.body }}>{d.phone}</p>}
          {d.email && <p className="text-sm break-all" style={{ color: DOC.body }}>{d.email}</p>}
          {d.address && <p className="whitespace-pre-line text-sm" style={{ color: DOC.body }}>{d.address}</p>}
        </div>
        <div className="space-y-1.5 text-right text-sm" style={{ color: DOC.body }}>
          <p className={label} style={{ color: DOC.muted }}>Details</p>
          <p className="pt-2">Issued <span className="font-mono font-medium" style={{ color: DOC.ink }}>{nice(d.issueDate)}</span></p>
          <p>Due <span className="font-mono font-medium" style={{ color: DOC.accent }}>{nice(d.dueDate)}</span></p>
          {d.eventDate && <p>Shoot date <span className="font-mono font-medium" style={{ color: DOC.ink }}>{nice(d.eventDate)}</span></p>}
        </div>
      </div>

      {/* Items */}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className={label} style={{ color: DOC.muted, borderBottom: `1.5px solid ${DOC.ink}` }}>
            <th className="pb-3 font-medium">Description</th>
            <th className="w-14 pb-3 text-center font-medium">Qty</th>
            <th className="w-32 pb-3 text-right font-medium">Unit price</th>
            <th className="w-32 pb-3 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr style={{ borderBottom: `1px solid ${DOC.line}` }}><td colSpan={4} className="py-5" style={{ color: DOC.muted }}>Add a line item</td></tr>
          )}
          {items.map(i => (
            <tr key={i.id} style={{ borderBottom: `1px solid ${DOC.line}` }}>
              <td className="py-4 pr-4 align-top break-words" style={{ color: DOC.ink }}>{i.description}</td>
              <td className="py-4 text-center align-top font-mono" style={{ color: DOC.body }}>{i.qty}</td>
              <td className="py-4 text-right align-top font-mono" style={{ color: DOC.body }}>{rm2(Number(i.price) || 0)}</td>
              <td className="py-4 text-right align-top font-mono font-medium" style={{ color: DOC.ink }}>{rm2((Number(i.qty) || 0) * (Number(i.price) || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end">
        <div className="w-full max-w-[320px] space-y-2.5 text-sm">
          <div className="flex justify-between" style={{ color: DOC.body }}><span>Subtotal</span><span className="font-mono">{rm2(t.subtotal)}</span></div>
          {t.discount > 0 && <div className="flex justify-between" style={{ color: DOC.body }}><span>Discount</span><span className="font-mono">− {rm2(t.discount)}</span></div>}
          {Number(d.taxRate) > 0 && <div className="flex justify-between" style={{ color: DOC.body }}><span>Tax ({d.taxRate}%)</span><span className="font-mono">{rm2(t.taxAmount)}</span></div>}
          <div className="flex justify-between pt-3 font-semibold" style={{ color: DOC.ink, borderTop: `1px solid ${DOC.line}` }}><span>Total</span><span className="font-mono">{rm2(t.total)}</span></div>
          {t.deposit > 0 && (
            <div className="flex justify-between" style={{ color: DOC.body }}>
              <span>Deposit paid{d.depositDate ? ` · ${nice(d.depositDate)}` : ''}</span>
              <span className="font-mono">− {rm2(t.deposit)}</span>
            </div>
          )}
          <div className="mt-2 flex items-baseline justify-between rounded-xl px-4 py-4" style={{ backgroundColor: DOC.wash }}>
            <span className="font-semibold" style={{ color: DOC.ink }}>{paid ? 'Paid in full' : 'Balance due'}</span>
            <span style={{ ...head, fontSize: 26, lineHeight: 1, color: paid ? '#4e6b3a' : DOC.ink }}>{rm2(Math.max(t.balance, 0))}</span>
          </div>
        </div>
      </div>

      {/* Notes & payment */}
      {(d.notes || d.paymentDetails) && (
        <div className="grid grid-cols-2 gap-8 pt-8 text-sm" style={{ borderTop: `1px solid ${DOC.line}` }}>
          <div>
            {d.notes && <>
              <p className={label} style={{ color: DOC.muted }}>Terms & notes</p>
              <p className="mt-2 whitespace-pre-line leading-relaxed" style={{ color: DOC.body }}>{d.notes}</p>
            </>}
          </div>
          <div>
            {d.paymentDetails && <>
              <p className={label} style={{ color: DOC.muted }}>How to pay</p>
              <p className="mt-2 whitespace-pre-line leading-relaxed" style={{ color: DOC.body }}>{d.paymentDetails}</p>
            </>}
          </div>
        </div>
      )}

      <div className="mt-auto space-y-1.5 pt-10 text-center">
        <p className="text-sm" style={{ color: DOC.body }}>Thank you for letting us photograph your day.</p>
        <p className="font-mono text-[11px]" style={{ color: DOC.muted }}>zaimzaidi04@gmail.com · www.zhayimuuu.my</p>
      </div>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

export default function InvoiceGenerator({ open, onClose, client, saved }: {
  open: boolean;
  onClose: () => void;
  /** Prefill from a client record (Clients page). */
  client?: any;
  /** Open an already-issued invoice (read-only, re-download). */
  saved?: any;
}) {
  const toast = useToast();
  const docRef = useRef<HTMLDivElement>(null);
  const [d, setD] = useState<Draft>(() => blankDraft(client));
  const [clients, setClients] = useState<any[]>([]);
  const [nextNumber, setNextNumber] = useState('INV-…');
  const [issued, setIssued] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Reset each time it opens.
  useEffect(() => {
    if (!open) return;
    if (saved) { setD(draftFromSaved(saved)); setIssued(saved.number); }
    else { setD(blankDraft(client)); setIssued(null); invoiceService.peekNextNumber().then(setNextNumber); }
    setErrors({});
    setMobileView('edit');
  }, [open, saved, client]);

  useEffect(() => (open ? clientService.subscribe(setClients) : undefined), [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, busy, onClose]);

  const locked = !!issued;
  const t = useMemo(() => totalsOf(d), [d]);
  const set = (patch: Partial<Draft>) => setD(prev => ({ ...prev, ...patch }));
  const setItem = (id: string, patch: Partial<Item>) => set({ items: d.items.map(i => (i.id === id ? { ...i, ...patch } : i)) });

  const pickClient = (id: string) => {
    const c = clients.find(x => x.id === id);
    if (!c) { set({ clientId: '' }); return; }
    const hasItems = d.items.some(i => i.description.trim() || i.price);
    set({
      clientId: c.id,
      clientName: c.name || '',
      phone: c.phone || '',
      address: c.location || d.address,
      eventType: c.eventType || '',
      eventDate: c.eventDate || '',
      items: hasItems ? d.items : [{ id: uid(), description: `${c.eventType || 'Photography'} photography coverage`, qty: 1, price: Number(c.price) || 0 }],
    });
  };

  const validate = () => {
    const e: Record<string, boolean> = {};
    if (!d.clientName.trim()) e.clientName = true;
    const valid = d.items.filter(i => i.description.trim() && (Number(i.qty) || 0) > 0);
    if (valid.length === 0) e.items = true;
    if (t.total <= 0) e.items = true;
    setErrors(e);
    if (Object.keys(e).length) {
      setMobileView('edit');
      toast('error', e.clientName ? 'Add who the invoice is for.' : 'Add at least one item with a description and price.');
      return false;
    }
    return true;
  };

  const fileName = (num: string) => `${num}_${(d.clientName || 'client').replace(/[^\w]+/g, '_')}.pdf`;

  const renderPdf = async (num: string) => {
    setMobileView('preview');
    await nextFrame();
    if (!docRef.current) throw new Error('Preview not ready');
    await downloadElementAsPdf(docRef.current, 'invoice-content', fileName(num));
  };

  const saveAndDownload = async () => {
    if (locked) {
      setBusy(true);
      try { await renderPdf(issued!); toast('success', `${issued} downloaded.`); }
      catch (err) { console.error(err); toast('error', 'Could not create the PDF. Try again, or use Print.'); }
      finally { setBusy(false); }
      return;
    }
    if (!validate()) return;
    setBusy(true);
    let number: string | null = null;
    try {
      const items = d.items
        .filter(i => i.description.trim())
        .map(i => ({ description: i.description.trim(), qty: Number(i.qty) || 0, price: round2(Number(i.price) || 0) }));
      number = await invoiceService.create({
        clientId: d.clientId,
        clientName: d.clientName.trim(),
        phone: d.phone,
        email: d.email,
        address: d.address,
        eventType: d.eventType,
        eventDate: d.eventDate,
        issueDate: d.issueDate,
        dueDate: d.dueDate,
        items,
        discount: t.discount,
        taxRate: Number(d.taxRate) || 0,
        taxAmount: t.taxAmount,
        subtotal: t.subtotal,
        total: t.total,
        deposit: t.deposit,
        depositDate: d.depositDate,
        balance: t.balance,
        notes: d.notes,
        paymentDetails: d.paymentDetails,
      });
      lsSet(LS_TERMS, d.notes);
      lsSet(LS_PAYMENT, d.paymentDetails);
      setD(prev => ({ ...prev, items: prev.items.filter(i => i.description.trim()) }));
      setIssued(number);
      await renderPdf(number);
      toast('success', `${number} saved and downloaded.`);
    } catch (err) {
      console.error(err);
      if (!number) {
        const msg = describeError(err);
        toast('error', `Invoice not saved. ${msg}${/permission/i.test(msg) ? '\nDeploy the updated firestore.rules to enable invoices.' : ''}`);
      } else {
        toast('error', `${number} is saved, but the PDF failed. Press Download again.`);
      }
    } finally {
      setBusy(false);
    }
  };

  const startAnother = () => {
    setD(prev => ({ ...blankDraft(), notes: prev.notes, paymentDetails: prev.paymentDetails }));
    setIssued(null);
    setErrors({});
    invoiceService.peekNextNumber().then(setNextNumber);
  };

  const money = (key: 'discount' | 'taxRate' | 'deposit', labelText: string, hint?: string) => (
    <Field label={labelText} htmlFor={`inv-${key}`} hint={hint}>
      <input id={`inv-${key}`} type="number" min={0} step="0.01" inputMode="decimal" disabled={locked}
        className={inputClass + ' font-mono'} value={d[key] || ''} placeholder="0"
        onChange={e => set({ [key]: e.target.value === '' ? 0 : Number(e.target.value) } as any)} />
    </Field>
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/90 backdrop-blur-sm sm:p-5 print:bg-white print:p-0" role="dialog" aria-modal="true" aria-label="Invoice generator">
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            className="flex h-full w-full flex-col overflow-hidden bg-ink-900 ring-1 ring-ink-800 sm:h-[94dvh] sm:max-w-[1320px] sm:rounded-[1.25rem] print:h-auto print:rounded-none print:ring-0"
          >
            {/* Top bar */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-800 px-4 py-3 sm:px-6 print:hidden">
              <div className="min-w-0">
                <p className="font-display font-semibold tracking-[-0.03em] text-xl leading-tight text-paper">
                  {locked ? issued : 'New invoice'}
                </p>
                <p className="truncate text-xs text-ink-500">
                  {locked
                    ? <span className="inline-flex items-center gap-1"><Lock size={11} /> Issued · numbers can't be reused</span>
                    : <>Will be issued as <span className="font-mono text-ink-300">{nextNumber}</span></>}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {locked && !saved && <Button size="sm" variant="ghost" onClick={startAnother} className="hidden sm:inline-flex"><FilePlus2 size={14} /> Another</Button>}
                <Button size="sm" variant="ghost" onClick={() => window.print()} className="hidden sm:inline-flex"><Printer size={14} /> Print</Button>
                <Button size="sm" variant="primary" onClick={saveAndDownload} disabled={busy}>
                  <Download size={14} />
                  {busy ? 'Working…' : locked ? 'Download PDF' : <><span className="sm:hidden">Save PDF</span><span className="hidden sm:inline">Save & download PDF</span></>}
                </Button>
                <IconButton label="Close" onClick={onClose} disabled={busy}><X size={18} /></IconButton>
              </div>
            </div>

            <div className="border-b border-ink-800 px-4 py-2 sm:hidden print:hidden">
              <Segmented label="Invoice view" value={mobileView} onChange={setMobileView}
                options={[{ value: 'edit' as const, label: 'Edit' }, { value: 'preview' as const, label: 'Preview' }]} />
            </div>

            <div className="flex min-h-0 flex-1">
              {/* Form */}
              <div className={cn('w-full shrink-0 overflow-y-auto border-ink-800 p-5 sm:block sm:w-[400px] sm:border-r sm:p-6 print:hidden', mobileView === 'edit' ? 'block' : 'hidden')}>
                <fieldset disabled={locked} className="space-y-7">
                  <section className="space-y-4">
                    <h3 className="eyebrow">Bill to</h3>
                    {!saved && (
                      <Field label="Existing client" htmlFor="inv-client" hint="Optional. Fills in their details and fee.">
                        <select id="inv-client" className={inputClass + ' appearance-none'} value={d.clientId} onChange={e => pickClient(e.target.value)}>
                          <option value="">Type details manually</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.eventType ? ` · ${c.eventType}` : ''}</option>)}
                        </select>
                      </Field>
                    )}
                    <Field label="Name" htmlFor="inv-name">
                      <input id="inv-name" className={cn(inputClass, errors.clientName && 'ring-2 ring-rust')} value={d.clientName}
                        onChange={e => { set({ clientName: e.target.value }); setErrors(x => ({ ...x, clientName: false })); }} placeholder="Client or company" />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Phone" htmlFor="inv-phone"><input id="inv-phone" type="tel" className={inputClass + ' font-mono'} value={d.phone} onChange={e => set({ phone: e.target.value })} /></Field>
                      <Field label="Email" htmlFor="inv-email"><input id="inv-email" type="email" className={inputClass} value={d.email} onChange={e => set({ email: e.target.value })} /></Field>
                    </div>
                    <Field label="Address" htmlFor="inv-address">
                      <textarea id="inv-address" rows={2} className={inputClass + ' h-auto resize-none py-2.5'} value={d.address} onChange={e => set({ address: e.target.value })} />
                    </Field>
                  </section>

                  <section className="space-y-4">
                    <h3 className="eyebrow">Dates</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Issue date" htmlFor="inv-issue"><input id="inv-issue" type="date" className={inputClass} value={d.issueDate} onChange={e => set({ issueDate: e.target.value })} /></Field>
                      <Field label="Due date" htmlFor="inv-due"><input id="inv-due" type="date" className={inputClass} value={d.dueDate} onChange={e => set({ dueDate: e.target.value })} /></Field>
                    </div>
                    <Field label="Shoot date" htmlFor="inv-shoot" hint="Optional. Shown on the invoice."><input id="inv-shoot" type="date" className={inputClass} value={d.eventDate} onChange={e => set({ eventDate: e.target.value })} /></Field>
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="eyebrow">Items</h3>
                      {!locked && <Button size="sm" variant="ghost" onClick={() => set({ items: [...d.items, { id: uid(), description: '', qty: 1, price: 0 }] })}><Plus size={14} /> Add item</Button>}
                    </div>
                    <div className={cn('space-y-2 rounded-xl', errors.items && 'ring-2 ring-rust ring-offset-4 ring-offset-ink-900')}>
                      {d.items.map((item, idx) => (
                        <div key={item.id} className="rounded-xl bg-ink-850/60 p-3 ring-1 ring-inset ring-ink-800">
                          <div className="flex items-start gap-2">
                            <label htmlFor={`desc-${item.id}`} className="sr-only">Item {idx + 1} description</label>
                            <input id={`desc-${item.id}`} className={inputClass + ' h-10 bg-ink-900'} placeholder="e.g. Wedding coverage, 8 hours"
                              value={item.description} onChange={e => { setItem(item.id, { description: e.target.value }); setErrors(x => ({ ...x, items: false })); }} />
                            {!locked && d.items.length > 1 && (
                              <IconButton label={`Remove item ${idx + 1}`} tone="danger" onClick={() => set({ items: d.items.filter(i => i.id !== item.id) })}><Trash2 size={15} /></IconButton>
                            )}
                          </div>
                          <div className="mt-2 grid grid-cols-[72px_1fr_auto] items-center gap-2">
                            <label className="sr-only" htmlFor={`qty-${item.id}`}>Quantity</label>
                            <input id={`qty-${item.id}`} type="number" min={0} step="1" inputMode="numeric" className={inputClass + ' h-10 bg-ink-900 font-mono'}
                              value={item.qty} onChange={e => setItem(item.id, { qty: Number(e.target.value) })} />
                            <div className="relative">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-ink-500">RM</span>
                              <label className="sr-only" htmlFor={`price-${item.id}`}>Unit price</label>
                              <input id={`price-${item.id}`} type="number" min={0} step="0.01" inputMode="decimal" className={inputClass + ' h-10 bg-ink-900 pl-10 font-mono'}
                                value={item.price || ''} placeholder="0.00" onChange={e => { setItem(item.id, { price: Number(e.target.value) }); setErrors(x => ({ ...x, items: false })); }} />
                            </div>
                            <span className="w-24 text-right font-mono text-[13px] text-paper tabular">{rm2((Number(item.qty) || 0) * (Number(item.price) || 0))}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="eyebrow">Adjustments & deposit</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {money('discount', 'Discount (RM)')}
                      {money('taxRate', 'Tax (%)', 'e.g. 8 for SST')}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {money('deposit', 'Deposit paid (RM)')}
                      <Field label="Deposit date" htmlFor="inv-depdate"><input id="inv-depdate" type="date" className={inputClass} value={d.depositDate} onChange={e => set({ depositDate: e.target.value })} /></Field>
                    </div>
                    <div className="rounded-xl bg-ink-850/60 p-4 text-sm ring-1 ring-inset ring-ink-800">
                      <div className="flex justify-between text-ink-400"><span>Total</span><span className="font-mono tabular text-paper">{rm2(t.total)}</span></div>
                      <div className="mt-1 flex justify-between text-ink-400"><span>Deposit</span><span className="font-mono tabular">− {rm2(t.deposit)}</span></div>
                      <div className="mt-2 flex justify-between border-t border-ink-800 pt-2 font-medium">
                        <span className="text-paper">Balance due</span>
                        <span className={cn('font-mono tabular', t.balance <= 0 && t.total > 0 ? 'text-sage' : 'text-safelight')}>{rm2(Math.max(t.balance, 0))}</span>
                      </div>
                      {t.balance < 0 && <p className="mt-2 text-xs text-rust">Deposit is more than the total.</p>}
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="eyebrow">Notes</h3>
                    <Field label="Terms & notes" htmlFor="inv-notes" hint="Remembered for your next invoice.">
                      <textarea id="inv-notes" rows={3} className={inputClass + ' h-auto resize-none py-2.5 leading-relaxed'} value={d.notes}
                        placeholder="e.g. 50% deposit secures the date. Balance due 7 days before the shoot." onChange={e => set({ notes: e.target.value })} />
                    </Field>
                    <Field label="How to pay" htmlFor="inv-pay" hint="Remembered for your next invoice.">
                      <textarea id="inv-pay" rows={3} className={inputClass + ' h-auto resize-none py-2.5 leading-relaxed'} value={d.paymentDetails}
                        placeholder={'Bank transfer\nBank · account name · account number'} onChange={e => set({ paymentDetails: e.target.value })} />
                    </Field>
                  </section>
                </fieldset>
              </div>

              {/* Preview */}
              <div className={cn('min-w-0 flex-1 overflow-y-auto bg-ink-950 p-3 sm:block sm:p-8 print:block print:bg-white print:p-0', mobileView === 'preview' ? 'block' : 'hidden')}>
                <div className="mx-auto max-w-[800px] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)] print:shadow-none">
                  <InvoiceDocument ref={docRef} d={d} number={issued || nextNumber} draft={!issued} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
