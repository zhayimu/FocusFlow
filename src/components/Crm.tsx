import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, UserPlus, X, FileText, Pencil, Trash2, Download, Printer, Users, Aperture } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { clientService, bookingService } from '../lib/firestoreService';
import { downloadElementAsPdf, DOC } from '../lib/pdf';
import {
  PageHeader, Panel, Button, IconButton, Field, inputClass, Sheet, ConfirmDialog, EmptyState, Pagination, Monogram,
  useToast, describeError, rm,
} from './ui';

const PAGE_SIZE = 10;
const SHOOT_TYPES = ['Wedding', 'Convocation', 'Portrait', 'Commercial', 'Event'];

const emptyForm = () => ({
  name: '',
  phone: '',
  eventType: 'Wedding',
  eventDate: format(new Date(), 'yyyy-MM-dd'),
  price: 0,
  location: '',
  remarks: '',
});

const safeDate = (d?: string, fmt = 'd MMM yyyy') => {
  if (!d) return '—';
  try { return format(parseISO(d), fmt); } catch { return d; }
};

/* ------------------------------------------------------------------ */
/* Invoice document                                                    */
/* ------------------------------------------------------------------ */

function InvoiceModal({ client, onClose }: { client: any; onClose: () => void }) {
  const toast = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // Stable for the life of the modal (previously regenerated on every render).
  const { today, dueDate, invoiceNumber } = useMemo(() => {
    const t = new Date();
    return {
      today: t,
      dueDate: new Date(t.getTime() + 14 * 24 * 60 * 60 * 1000),
      invoiceNumber: `INV-${t.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const amount = Number(client.price) || 0;

  const downloadPDF = async () => {
    if (!invoiceRef.current) return;
    setIsGenerating(true);
    try {
      await downloadElementAsPdf(invoiceRef.current, 'invoice-content', `${invoiceNumber}_${client.name.replace(/\s+/g, '_')}.pdf`);
      toast('success', `${invoiceNumber} saved as PDF.`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      toast('error', 'Could not create the PDF. Try again, or use Print instead.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/90 backdrop-blur-sm sm:p-6 print:bg-white print:p-0" role="dialog" aria-modal="true" aria-label={`Invoice for ${client.name}`}>
      <motion.div
        id="invoice-print-area"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
        className="flex h-full w-full flex-col overflow-hidden bg-ink-900 ring-1 ring-ink-800 sm:h-[92dvh] sm:max-w-4xl sm:rounded-[1.25rem] print:h-auto print:max-w-none print:rounded-none print:bg-white print:ring-0"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-800 px-4 py-3 sm:px-6 print:hidden">
          <div className="min-w-0">
            <p className="font-display font-semibold tracking-[-0.03em] text-xl leading-tight text-paper">Invoice</p>
            <p className="mt-1 truncate font-mono text-xs text-ink-500">{invoiceNumber} · {client.name}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => window.print()}><Printer size={14} /> <span className="hidden sm:inline">Print</span></Button>
            <Button size="sm" variant="primary" onClick={downloadPDF} disabled={isGenerating}>
              <Download size={14} /> {isGenerating ? 'Preparing…' : 'Download PDF'}
            </Button>
            <IconButton label="Close invoice" onClick={onClose}><X size={18} /></IconButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-ink-950 p-0 sm:p-8 print:bg-white print:p-0">
          <div
            id="invoice-content"
            ref={invoiceRef}
            className="mx-auto w-full max-w-[800px] space-y-12 p-7 sm:min-h-[1060px] sm:p-14 sm:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]"
            style={{ backgroundColor: '#ffffff', color: DOC.ink, fontFamily: '"Geist", system-ui, sans-serif' }}
          >
            {/* Masthead */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p style={{ fontFamily: '"Geist", system-ui, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', fontSize: 40, lineHeight: 1, color: DOC.ink }}>zhayimuuu</p>
                <p className="mt-2 text-xs" style={{ color: DOC.muted }}>Photography · Malaysia</p>
              </div>
              <div className="sm:text-right">
                <p style={{ fontFamily: '"Geist", system-ui, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', fontSize: 30, lineHeight: 1, color: DOC.accent }}>Invoice</p>
                <p className="mt-2 font-mono text-xs" style={{ color: DOC.muted }}>{invoiceNumber}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-8 border-t pt-8 sm:grid-cols-2" style={{ borderTopColor: DOC.line }}>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: DOC.muted }}>Billed to</p>
                <p className="mt-3 text-lg font-semibold" style={{ color: DOC.ink }}>{client.name}</p>
                <p className="mt-1 text-sm" style={{ color: DOC.body }}>{client.phone}</p>
                {client.location && <p className="text-sm" style={{ color: DOC.body }}>{client.location}</p>}
              </div>
              <div className="space-y-2 sm:text-right">
                <p className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: DOC.muted }}>Dates</p>
                <p className="mt-3 text-sm" style={{ color: DOC.body }}>Issued <span className="font-mono font-medium" style={{ color: DOC.ink }}>{format(today, 'd MMM yyyy')}</span></p>
                <p className="text-sm" style={{ color: DOC.body }}>Due <span className="font-mono font-medium" style={{ color: DOC.accent }}>{format(dueDate, 'd MMM yyyy')}</span></p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-left">
                <thead>
                  <tr className="text-[11px] font-medium uppercase tracking-[0.08em]" style={{ color: DOC.muted, borderBottom: `1.5px solid ${DOC.ink}` }}>
                    <th className="pb-3 font-medium">Description</th>
                    <th className="pb-3 text-center font-medium">Shoot date</th>
                    <th className="pb-3 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${DOC.line}` }}>
                    <td className="py-5 pr-4 align-top">
                      <p className="font-semibold" style={{ color: DOC.ink }}>{client.eventType} photography</p>
                      <p className="mt-1 text-sm" style={{ color: DOC.body }}>{client.remarks || 'Coverage, culling, colour grading and online gallery delivery.'}</p>
                    </td>
                    <td className="py-5 text-center align-top font-mono text-sm" style={{ color: DOC.body }}>{safeDate(client.eventDate)}</td>
                    <td className="py-5 text-right align-top font-mono font-medium" style={{ color: DOC.ink }}>{rm(amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <div className="w-full space-y-3 sm:w-72">
                <div className="flex justify-between text-sm" style={{ color: DOC.body }}><span>Subtotal</span><span className="font-mono">{rm(amount)}</span></div>
                <div className="flex justify-between text-sm" style={{ color: DOC.body }}><span>Tax (0%)</span><span className="font-mono">RM 0</span></div>
                <div className="flex items-baseline justify-between pt-4" style={{ borderTop: `1.5px solid ${DOC.ink}` }}>
                  <span className="text-sm font-semibold" style={{ color: DOC.ink }}>Total due</span>
                  <span style={{ fontFamily: '"Geist", system-ui, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', fontSize: 34, lineHeight: 1, color: DOC.ink }}>{rm(amount)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-16 text-center">
              <p style={{ fontFamily: '"Geist", system-ui, sans-serif', fontWeight: 600, letterSpacing: '-0.03em', fontSize: 22, color: DOC.body }}>Thank you for letting us photograph your day.</p>
              <p className="font-mono text-[11px]" style={{ color: DOC.muted }}>zaimzaidi04@gmail.com · www.zhayimuuu.my</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Clients                                                             */
/* ------------------------------------------------------------------ */

export default function Crm() {
  const toast = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);
  const [invoiceClient, setInvoiceClient] = useState<any | null>(null);

  useEffect(() => clientService.subscribe(setClients), []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const set = (patch: Partial<ReturnType<typeof emptyForm>>) => setFormData(f => ({ ...f, ...patch }));

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    const { id, name } = clientToDelete;
    setIsDeleting(id);
    try {
      try {
        await bookingService.deleteAllByClientId(id);
      } catch (bookingErr) {
        console.warn('Booking cleanup failed, proceeding with client deletion:', bookingErr);
      }
      await clientService.delete(id);
      toast('success', `${name} and their bookings were removed.`);
    } catch (err) {
      console.error('Failed to delete client:', err);
      toast('error', `Couldn't delete ${name}. ${describeError(err)}`);
    } finally {
      setIsDeleting(null);
      setClientToDelete(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingClient) {
        await clientService.update(editingClient.id, {
          name: formData.name,
          phone: formData.phone,
          remarks: formData.remarks,
          eventType: formData.eventType,
          eventDate: formData.eventDate,
          price: formData.price,
          location: formData.location,
        });
        await bookingService.updateByClientId(editingClient.id, editingClient.name, {
          clientName: formData.name,
          eventType: formData.eventType,
          date: formData.eventDate,
          price: Number(formData.price),
          location: formData.location,
          remarks: formData.remarks,
        });
        toast('success', `Saved changes to ${formData.name}.`);
      } else {
        const clientRef = await clientService.add({
          name: formData.name,
          phone: formData.phone,
          remarks: formData.remarks,
          eventType: formData.eventType,
          eventDate: formData.eventDate,
          price: formData.price,
          location: formData.location,
        });
        if (clientRef) {
          await bookingService.add({
            clientId: clientRef.id,
            clientName: formData.name,
            date: formData.eventDate,
            eventType: formData.eventType,
            price: Number(formData.price),
            location: formData.location,
            status: 'Booked',
            remarks: formData.remarks,
          });
        }
        toast('success', `${formData.name} added and booked for ${safeDate(formData.eventDate, 'd MMM')}.`);
      }
      setIsFormOpen(false);
      setEditingClient(null);
      setFormData(emptyForm());
    } catch (err) {
      console.error(err);
      toast('error', `Couldn't save. ${describeError(err)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (client: any) => {
    setEditingClient(client);
    setFormData({
      name: client.name || '',
      phone: client.phone || '',
      remarks: client.remarks || '',
      eventType: client.eventType || 'Wedding',
      eventDate: client.eventDate || format(new Date(), 'yyyy-MM-dd'),
      price: client.price || 0,
      location: client.location || '',
    });
    setIsFormOpen(true);
  };

  const openAdd = () => {
    setEditingClient(null);
    setFormData(emptyForm());
    setIsFormOpen(true);
  };

  const q = searchTerm.trim().toLowerCase();
  const filteredClients = clients.filter(c =>
    !q ||
    String(c.name || '').toLowerCase().includes(q) ||
    String(c.phone || '').toLowerCase().includes(q) ||
    String(c.eventType || '').toLowerCase().includes(q),
  );
  const totalPages = Math.ceil(filteredClients.length / PAGE_SIZE);
  const paginated = filteredClients.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const RowActions = ({ client }: { client: any }) => (
    <div className="flex justify-end gap-0.5">
      <IconButton label={`Invoice for ${client.name}`} onClick={() => setInvoiceClient(client)}><FileText size={16} /></IconButton>
      <IconButton label={`Edit ${client.name}`} onClick={() => openEdit(client)}><Pencil size={16} /></IconButton>
      <IconButton
        label={`Delete ${client.name}`}
        tone="danger"
        disabled={isDeleting === client.id}
        onClick={() => setClientToDelete({ id: client.id, name: client.name })}
      >
        {isDeleting === client.id ? <Aperture size={16} className="animate-spin" /> : <Trash2 size={16} />}
      </IconButton>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={`${clients.length} on file`} title="Clients">
        <Button variant="primary" onClick={openAdd} className="w-full sm:w-auto"><UserPlus size={16} /> New client</Button>
      </PageHeader>

      <div className="relative">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
        <label htmlFor="client-search" className="sr-only">Search clients</label>
        <input
          id="client-search"
          type="search"
          placeholder="Search by name, phone or shoot type"
          className={inputClass + ' h-12 pl-10'}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <Panel className="overflow-hidden">
        {paginated.length === 0 ? (
          <EmptyState
            icon={Users}
            title={q ? 'No matches' : 'No clients yet'}
            body={q ? `Nothing matches “${searchTerm}”. Try a phone number or shoot type.` : 'Add your first client. Their shoot will be booked automatically.'}
            action={!q && <Button variant="primary" onClick={openAdd}><UserPlus size={16} /> New client</Button>}
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-left md:table">
              <thead>
                <tr className="border-b border-ink-800 text-xs text-ink-500">
                  <th className="px-5 py-3 font-normal">Client</th>
                  <th className="px-5 py-3 font-normal">Shoot</th>
                  <th className="px-5 py-3 font-normal">Date</th>
                  <th className="px-5 py-3 text-right font-normal">Fee</th>
                  <th className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800">
                {paginated.map(client => (
                  <tr key={client.id} className="transition-colors hover:bg-ink-850/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Monogram name={client.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-paper">{client.name}</p>
                          <p className="font-mono text-xs text-ink-500">{client.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-ink-300">
                      {client.eventType || '—'}
                      {client.location && <span className="block max-w-[22ch] truncate text-xs text-ink-500">{client.location}</span>}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[13px] text-ink-300 tabular">{safeDate(client.eventDate)}</td>
                    <td className="px-5 py-3.5 text-right font-mono text-[13px] text-paper tabular">{client.price ? rm(Number(client.price)) : '—'}</td>
                    <td className="px-3 py-3.5"><RowActions client={client} /></td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile list */}
            <ul className="divide-y divide-ink-800 md:hidden">
              {paginated.map(client => (
                <li key={client.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Monogram name={client.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-paper">{client.name}</p>
                      <p className="text-[13px] text-ink-400">
                        {client.eventType} · {safeDate(client.eventDate, 'd MMM')} · <span className="font-mono text-paper">{rm(Number(client.price) || 0)}</span>
                      </p>
                      <p className="font-mono text-xs text-ink-500">{client.phone}</p>
                    </div>
                  </div>
                  {client.remarks && <p className="mt-3 line-clamp-2 border-l-2 border-ink-700 pl-3 text-[13px] text-ink-400">{client.remarks}</p>}
                  <div className="mt-2 -mr-2"><RowActions client={client} /></div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <Pagination page={currentPage} totalPages={totalPages} total={filteredClients.length} pageSize={PAGE_SIZE} onChange={setCurrentPage} />

      {/* Add / edit sheet */}
      <Sheet
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingClient ? 'Edit client' : 'New client'}
        description={editingClient ? 'Changes also update their bookings.' : 'Saving also books the shoot as Booked.'}
        footer={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsFormOpen(false)} className="flex-1 sm:flex-none">Cancel</Button>
            <Button variant="primary" type="submit" form="client-form" disabled={isSaving} className="flex-[2] sm:ml-auto sm:flex-none">
              {isSaving ? 'Saving…' : editingClient ? 'Save changes' : 'Add client'}
            </Button>
          </div>
        }
      >
        <form id="client-form" onSubmit={handleSave} className="space-y-5">
          <Field label="Client name" htmlFor="f-name">
            <input id="f-name" required autoFocus type="text" autoComplete="off" placeholder="e.g. Nur Aisyah & Hakim" className={inputClass} value={formData.name} onChange={e => set({ name: e.target.value })} />
          </Field>
          <Field label="Phone" htmlFor="f-phone">
            <input id="f-phone" required type="tel" inputMode="tel" pattern="[0-9+\-\s()]{7,}" title="Digits, spaces, + and - only" placeholder="+60 12-847 3091" className={inputClass + ' font-mono'} value={formData.phone} onChange={e => set({ phone: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Shoot type" htmlFor="f-type">
              <select id="f-type" className={inputClass + ' appearance-none'} value={formData.eventType} onChange={e => set({ eventType: e.target.value })}>
                {SHOOT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Shoot date" htmlFor="f-date">
              <input id="f-date" required type="date" className={inputClass} value={formData.eventDate} onChange={e => set({ eventDate: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fee (RM)" htmlFor="f-price">
              <input id="f-price" required type="number" min={0} step={1} inputMode="numeric" placeholder="2850" className={inputClass + ' font-mono'} value={formData.price} onChange={e => set({ price: Number(e.target.value) })} />
            </Field>
            <Field label="Location" htmlFor="f-loc">
              <input id="f-loc" type="text" placeholder="Venue or city" className={inputClass} value={formData.location} onChange={e => set({ location: e.target.value })} />
            </Field>
          </div>
          <Field label="Notes" htmlFor="f-notes" hint="Shot list, timing, parking, anything you'll need on the day.">
            <textarea id="f-notes" rows={4} className={inputClass + ' h-auto resize-none py-3 leading-relaxed'} value={formData.remarks} onChange={e => set({ remarks: e.target.value })} />
          </Field>
        </form>
      </Sheet>

      <ConfirmDialog
        open={!!clientToDelete}
        title="Delete this client?"
        body={clientToDelete && <><strong className="text-paper">{clientToDelete.name}</strong> and every booking linked to them will be permanently removed. This can't be undone.</>}
        busy={!!isDeleting}
        onConfirm={confirmDeleteClient}
        onCancel={() => setClientToDelete(null)}
      />

      <AnimatePresence>
        {invoiceClient && <InvoiceModal client={invoiceClient} onClose={() => setInvoiceClient(null)} />}
      </AnimatePresence>
    </div>
  );
}
