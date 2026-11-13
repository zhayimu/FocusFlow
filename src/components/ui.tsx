import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, animate, useReducedMotion } from 'motion/react';
import { Check, AlertTriangle, X, Clock, Camera, Scissors, Eye, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/* Pipeline status vocabulary — shared by Dashboard, Pipeline, Calendar */
/* ------------------------------------------------------------------ */

export type PipelineStatus = 'Booked' | 'Shot' | 'Editing' | 'Review' | 'Delivered';

export const STAGES: { id: PipelineStatus; icon: typeof Clock; dot: string; text: string; hint: string }[] = [
  { id: 'Booked',    icon: Clock,        dot: 'bg-transparent ring-1 ring-inset ring-ink-400', text: 'text-ink-300',          hint: 'Date confirmed' },
  { id: 'Shot',      icon: Camera,       dot: 'bg-paper',                                    text: 'text-paper',            hint: 'Files on card' },
  { id: 'Editing',   icon: Scissors,     dot: 'bg-safelight',                                text: 'text-safelight',        hint: 'In post' },
  { id: 'Review',    icon: Eye,          dot: 'bg-transparent ring-2 ring-inset ring-safelight', text: 'text-safelight-strong', hint: 'With client' },
  { id: 'Delivered', icon: CheckCircle2, dot: 'bg-sage',                                     text: 'text-sage',             hint: 'Gallery sent' },
];

export const stageOf = (status?: string) => STAGES.find(s => s.id === status) ?? STAGES[0];

export function StatusPill({ status, className }: { status?: string; className?: string }) {
  const s = stageOf(status);
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', s.text, className)}>
      <span aria-hidden className={cn('size-1.5 rounded-full', s.dot)} />
      {s.id}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function PageHeader({ eyebrow, title, children, className }: {
  eyebrow?: React.ReactNode; title: React.ReactNode; children?: React.ReactNode; className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between pb-2', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display font-semibold tracking-[-0.03em] text-4xl md:text-5xl leading-[1.02] tracking-[-0.01em] text-paper">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{children}</div>}
    </header>
  );
}

export function Panel({ as: Tag = 'section', className, children, ...rest }: {
  as?: React.ElementType; className?: string; children?: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn(
        'rounded-[var(--radius-card)] bg-ink-900 ring-1 ring-inset ring-ink-800',
        'shadow-[0_1px_0_0_rgba(237,230,218,0.03)_inset,0_20px_40px_-24px_rgba(0,0,0,0.6)]',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function PanelTitle({ title, meta, children }: { title: React.ReactNode; meta?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-paper">{title}</h2>
        {meta && <p className="text-xs text-ink-500 mt-0.5">{meta}</p>}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] text-sm font-medium ' +
  'transition-[background-color,color,box-shadow,transform] duration-200 ease-[var(--ease-out-soft)] ' +
  'active:translate-y-px disabled:opacity-50 disabled:pointer-events-none select-none';

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-safelight text-safelight-ink hover:bg-safelight-strong shadow-[0_8px_24px_-12px_rgba(224,164,88,0.55)]',
  secondary: 'bg-ink-850 text-paper ring-1 ring-inset ring-ink-800 hover:bg-ink-800 hover:ring-ink-700',
  ghost: 'text-ink-300 hover:text-paper hover:bg-ink-850',
  danger: 'bg-rust text-ink-950 hover:brightness-110',
};

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg';
}>(function Button({ variant = 'secondary', size = 'md', className, type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        buttonBase,
        buttonVariants[variant],
        size === 'sm' && 'h-8 px-3 text-[13px]',
        size === 'md' && 'h-10 px-4',
        size === 'lg' && 'h-12 px-5 text-[15px]',
        className,
      )}
      {...rest}
    />
  );
});

export function IconButton({ label, className, tone = 'default', children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string; tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-[var(--radius-control)] text-ink-400',
        'transition-colors duration-200 hover:bg-ink-850 active:translate-y-px disabled:opacity-40 disabled:pointer-events-none',
        tone === 'danger' ? 'hover:text-rust' : 'hover:text-paper',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Segmented control: years, filters. */
export function Segmented<T extends string | number>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex max-w-full gap-1 overflow-x-auto scrollbar-hide rounded-[var(--radius-control)] bg-ink-900 p-1 ring-1 ring-inset ring-ink-800">
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative shrink-0 h-8 px-3 rounded-[7px] text-[13px] font-medium transition-colors duration-200',
              active ? 'text-paper' : 'text-ink-400 hover:text-paper',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${label}`}
                className="absolute inset-0 rounded-[7px] bg-ink-800 ring-1 ring-inset ring-ink-700"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const inputClass =
  'w-full h-11 px-3.5 rounded-[var(--radius-control)] bg-ink-850 text-paper placeholder:text-ink-500 ' +
  'ring-1 ring-inset ring-ink-800 outline-none transition-shadow duration-200 ' +
  'hover:ring-ink-700 focus:ring-2 focus:ring-safelight/70';

export function Field({ label, htmlFor, hint, className, children }: {
  label: string; htmlFor: string; hint?: string; className?: string; children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-300">{label}</label>
      {children}
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  );
}

export function Pagination({ page, totalPages, total, pageSize, onChange }: {
  page: number; totalPages: number; total: number; pageSize: number; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4 pt-4">
      <p className="text-xs text-ink-500 tabular">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="ghost" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</Button>
        <span className="px-2 font-mono text-xs text-ink-400 tabular">{page} / {totalPages}</span>
        <Button size="sm" variant="ghost" disabled={page === totalPages} onClick={() => onChange(page + 1)}>Next</Button>
      </div>
    </nav>
  );
}

export function EmptyState({ icon: Icon, title, body, action, className }: {
  icon: React.ElementType; title: string; body?: string; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-14', className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-ink-850 ring-1 ring-inset ring-ink-800 text-ink-400">
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <p className="font-display font-semibold tracking-[-0.03em] text-xl text-paper">{title}</p>
      {body && <p className="mt-1 max-w-[34ch] text-sm text-ink-400">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Square-ish monogram instead of a generic circle avatar. */
export function Monogram({ name, className }: { name?: string; className?: string }) {
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <span className={cn('grid size-10 shrink-0 place-items-center rounded-[10px] bg-ink-850 ring-1 ring-inset ring-ink-800 font-display font-semibold tracking-[-0.03em] text-[15px] text-safelight', className)}>
      {initials}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

export const rm = (n: number) => `RM ${Math.round(n).toLocaleString('en-MY')}`;

export function NumberTicker({ value, prefix = 'RM ' }: { value: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce) {
      node.textContent = `${prefix}${Math.round(value).toLocaleString('en-MY')}`;
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: v => { node.textContent = `${prefix}${Math.round(v).toLocaleString('en-MY')}`; },
      onComplete: () => { prev.current = value; },
    });
    return () => controls.stop();
  }, [value, prefix, reduce]);

  return <span ref={ref} className="tabular">{prefix}{Math.round(value).toLocaleString('en-MY')}</span>;
}

/* ------------------------------------------------------------------ */
/* Overlays                                                            */
/* ------------------------------------------------------------------ */

/** Escape closes, body scroll locks while open. */
function useOverlay(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);
}

/** Slide-over panel from the right on desktop, bottom sheet on mobile. */
export function Sheet({ open, onClose, title, description, children, footer }: {
  open: boolean; onClose: () => void; title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode;
}) {
  useOverlay(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div
            className="absolute inset-0 bg-ink-950/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative flex max-h-[92dvh] w-full flex-col bg-ink-900 ring-1 ring-ink-800 rounded-t-[1.25rem] sm:max-h-none sm:h-dvh sm:max-w-md sm:rounded-none sm:rounded-l-[1.25rem]"
            initial={{ x: 0, y: 40, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-ink-800">
              <div>
                <h2 className="font-display font-semibold tracking-[-0.03em] text-2xl leading-tight text-paper">{title}</h2>
                {description && <p className="mt-2 text-sm text-ink-400">{description}</p>}
              </div>
              <IconButton label="Close" onClick={onClose} className="-mr-2 -mt-1"><X size={18} /></IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
            {footer && <div className="border-t border-ink-800 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel = 'Delete', onConfirm, onCancel, busy }: {
  open: boolean; title: string; body: React.ReactNode; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; busy?: boolean;
}) {
  useOverlay(open, onCancel);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) setTimeout(() => confirmRef.current?.focus(), 50); }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-5" role="alertdialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-ink-950/75 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel} />
          <motion.div
            className="relative w-full max-w-sm rounded-[var(--radius-card)] bg-ink-900 p-6 ring-1 ring-ink-800 shadow-2xl"
            initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          >
            <h2 className="font-display font-semibold tracking-[-0.03em] text-2xl leading-tight text-paper">{title}</h2>
            <div className="mt-3 text-sm leading-relaxed text-ink-300">{body}</div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" onClick={onCancel}>Cancel</Button>
              <Button ref={confirmRef} variant="danger" onClick={onConfirm} disabled={busy}>{busy ? 'Deleting…' : confirmLabel}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Toasts — replaces window.alert()                                    */
/* ------------------------------------------------------------------ */

type Toast = { id: number; tone: 'success' | 'error'; message: string };
const ToastContext = createContext<(tone: Toast['tone'], message: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((tone: Toast['tone'], message: string) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, tone, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), tone === 'error' ? 7000 : 3500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[80] flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl bg-ink-850 px-4 py-3 text-sm text-paper ring-1 ring-ink-700 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.7)]"
            >
              <span className={cn('mt-0.5', t.tone === 'success' ? 'text-sage' : 'text-rust')}>
                {t.tone === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
              </span>
              <span className="whitespace-pre-line leading-snug">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/** Turn the JSON error thrown by firestoreService into a readable sentence. */
export function describeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  try {
    const parsed = JSON.parse(raw);
    if (String(parsed.error).toLowerCase().includes('permission')) return "You don't have permission to change this record.";
    return parsed.error || raw;
  } catch {
    return raw || 'Something went wrong. Please try again.';
  }
}
