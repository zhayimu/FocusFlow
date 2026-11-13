import { useEffect, useState } from 'react';
import { FilePlus2, Receipt, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { invoiceService } from '../lib/firestoreService';
import { cn } from '../lib/utils';
import { Panel, PanelTitle, Button, EmptyState } from './ui';
import InvoiceGenerator, { rm2 } from './InvoiceGenerator';

const SHOW = 6;

export default function InvoicesPanel() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [nextNumber, setNextNumber] = useState('');
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState<any | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => invoiceService.subscribe(setInvoices), []);
  useEffect(() => { invoiceService.peekNextNumber().then(setNextNumber); }, [invoices.length]);

  const outstanding = invoices.reduce((a, i) => a + Math.max(Number(i.balance) || 0, 0), 0);
  const unpaidCount = invoices.filter(i => (Number(i.balance) || 0) > 0).length;
  const list = showAll ? invoices : invoices.slice(0, SHOW);

  const openNew = () => { setSaved(null); setOpen(true); };
  const openSaved = (inv: any) => { setSaved(inv); setOpen(true); };

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between md:p-6">
        <PanelTitle
          title="Invoices"
          meta={nextNumber ? <>Next number <span className="font-mono text-ink-300">{nextNumber}</span> · issued automatically</> : 'Numbered automatically'}
        />
        <div className="flex items-center gap-5">
          {invoices.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-ink-500">Outstanding{unpaidCount ? ` · ${unpaidCount} unpaid` : ''}</p>
              <p className={cn('font-mono text-lg tabular', outstanding > 0 ? 'text-safelight' : 'text-sage')}>{rm2(outstanding)}</p>
            </div>
          )}
          <Button variant="primary" onClick={openNew}><FilePlus2 size={16} /> New invoice</Button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          body="Create one with line items, a discount and a deposit. It's saved, numbered and downloaded as an A4 PDF."
          className="border-t border-ink-800 py-10"
        />
      ) : (
        <>
          <ul className="divide-y divide-ink-800 border-t border-ink-800">
            {list.map(inv => {
              const balance = Number(inv.balance) || 0;
              return (
                <li key={inv.id}>
                  <button
                    onClick={() => openSaved(inv)}
                    className="group grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 px-5 py-3.5 text-left transition-colors hover:bg-ink-850/60 md:grid-cols-[130px_1fr_110px_120px_130px_16px] md:px-6"
                  >
                    <span className="font-mono text-[13px] text-ink-300 md:order-none">{inv.number}</span>
                    <span className="truncate text-right font-medium text-paper md:text-left">{inv.clientName}</span>
                    <span className="font-mono text-xs text-ink-500 tabular md:text-[13px]">{inv.issueDate ? format(parseISO(inv.issueDate), 'd MMM yyyy') : ''}</span>
                    <span className="text-right font-mono text-[13px] text-paper tabular">{rm2(Number(inv.total) || 0)}</span>
                    <span className={cn('hidden text-right text-xs font-medium md:block', balance > 0 ? 'text-safelight' : 'text-sage')}>
                      {balance > 0 ? `${rm2(balance)} due` : 'Paid'}
                    </span>
                    <ChevronRight size={15} className="hidden text-ink-700 transition-colors group-hover:text-ink-400 md:block" />
                  </button>
                </li>
              );
            })}
          </ul>
          {invoices.length > SHOW && (
            <div className="border-t border-ink-800 px-5 py-2 md:px-6">
              <Button size="sm" variant="ghost" onClick={() => setShowAll(s => !s)}>{showAll ? 'Show fewer' : `Show all ${invoices.length}`}</Button>
            </div>
          )}
        </>
      )}

      <InvoiceGenerator open={open} saved={saved} onClose={() => setOpen(false)} />
    </Panel>
  );
}
