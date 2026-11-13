import { useState, useEffect } from 'react';
import { MapPin, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { bookingService } from '../lib/firestoreService';
import { format, parseISO } from 'date-fns';
import { PageHeader, Panel, Segmented, Pagination, EmptyState, STAGES, PipelineStatus, useToast, describeError, rm } from './ui';

const PAGE_SIZE = 8;

export default function Pipeline() {
  const [projects, setProjects] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<PipelineStatus | 'All'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const toast = useToast();

  useEffect(() => bookingService.subscribe(data => {
    setProjects([...data].sort((a, b) => String(b.date).localeCompare(String(a.date))));
  }), []);

  useEffect(() => { setCurrentPage(1); }, [filterStatus]);

  // Status changes are only allowed in the "All" view so a row never vanishes mid-click.
  const canSwitch = filterStatus === 'All';

  const updateStatus = async (project: any, newStatus: PipelineStatus) => {
    if (!canSwitch || project.status === newStatus) return;
    try {
      await bookingService.update(project.id, { status: newStatus });
    } catch (err) {
      toast('error', describeError(err));
    }
  };

  const filtered = filterStatus === 'All' ? projects : projects.filter(p => p.status === filterStatus);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const page = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const counts = Object.fromEntries(STAGES.map(s => [s.id, projects.filter(p => p.status === s.id).length]));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Production" title="Pipeline" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Filter by stage"
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: 'All' as const, label: <>All <span className="font-mono text-[11px] text-ink-500">{projects.length}</span></> },
            ...STAGES.map(s => ({ value: s.id, label: <>{s.id} <span className="font-mono text-[11px] text-ink-500">{counts[s.id]}</span></> })),
          ]}
        />
        {!canSwitch && <p className="text-xs text-ink-500">Viewing one stage. Switch to All to move projects.</p>}
      </div>

      <Panel className="overflow-hidden">
        {page.length === 0 ? (
          <EmptyState
            icon={Layers}
            title={filterStatus === 'All' ? 'No projects yet' : `Nothing in ${filterStatus}`}
            body={filterStatus === 'All' ? 'New clients start here as Booked.' : 'Projects will appear here when they reach this stage.'}
          />
        ) : (
          <ul className="divide-y divide-ink-800">
            <AnimatePresence initial={false} mode="popLayout">
              {page.map(project => {
                const activeIdx = STAGES.findIndex(s => s.id === project.status);
                return (
                  <motion.li
                    key={project.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid gap-4 p-4 md:p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8"
                  >
                    <div className="flex min-w-0 gap-4">
                      <div className="w-12 shrink-0 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-ink-500">{format(parseISO(project.date), 'MMM yy')}</p>
                        <p className="font-display font-semibold tracking-[-0.03em] text-2xl leading-none text-paper">{format(parseISO(project.date), 'd')}</p>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                          <h3 className="truncate text-base font-semibold text-paper">{project.clientName}</h3>
                          <span className="text-[13px] text-ink-400">{project.eventType}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-400">
                          <span className="font-mono text-ink-300 tabular">{rm(Number(project.price) || 0)}</span>
                          {project.location && <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={13} className="shrink-0 text-ink-500" /><span className="truncate">{project.location}</span></span>}
                        </div>
                        {project.remarks && <p className="mt-2 line-clamp-2 max-w-[70ch] text-[13px] leading-relaxed text-ink-500">{project.remarks}</p>}
                      </div>
                    </div>

                    {/* Stage track */}
                    <div role="radiogroup" aria-label={`Stage for ${project.clientName}`} className={cn('flex items-center', !canSwitch && 'opacity-50')}>
                      {STAGES.map((stage, i) => {
                        const isActive = i === activeIdx;
                        const isDone = i < activeIdx;
                        const Icon = stage.icon;
                        return (
                          <div key={stage.id} className="flex flex-1 items-center lg:flex-none">
                            {i > 0 && <span aria-hidden className={cn('h-px flex-1 lg:w-4 lg:flex-none', isDone || isActive ? 'bg-safelight/50' : 'bg-ink-800')} />}
                            <button
                              role="radio"
                              aria-checked={isActive}
                              disabled={!canSwitch}
                              onClick={() => updateStatus(project, stage.id)}
                              title={canSwitch ? `Move to ${stage.id}` : 'Switch to All to change stage'}
                              className={cn(
                                'group/s relative flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors duration-200',
                                isActive && 'bg-safelight text-safelight-ink',
                                isDone && 'text-safelight hover:bg-ink-850',
                                !isActive && !isDone && 'text-ink-500 hover:bg-ink-850 hover:text-paper',
                                !canSwitch && 'cursor-not-allowed',
                              )}
                            >
                              <Icon size={14} strokeWidth={isActive ? 2.25 : 1.75} />
                              <span className={cn(isActive ? 'inline' : 'sr-only xl:not-sr-only')}>{stage.id}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </Panel>

      <Pagination page={currentPage} totalPages={totalPages} total={filtered.length} pageSize={PAGE_SIZE} onChange={setCurrentPage} />
    </div>
  );
}
