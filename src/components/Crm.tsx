import React, { useState, useEffect } from 'react';
import { Search, UserPlus, FileText, Pencil, Trash2, Users, Aperture } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clientService, bookingService } from '../lib/firestoreService';
import InvoiceGenerator from './InvoiceGenerator';
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

      <InvoiceGenerator open={!!invoiceClient} client={invoiceClient || undefined} onClose={() => setInvoiceClient(null)} />
    </div>
  );
}
