import { useState, useEffect } from 'react';
import { 
  Camera, Scissors, Eye, CheckCircle, Clock, ChevronRight, Calendar, User, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { bookingService } from '../lib/firestoreService';
import { format, parseISO } from 'date-fns';

type PipelineStatus = 'Booked' | 'Shot' | 'Editing' | 'Review' | 'Delivered';

const STAGES: { id: PipelineStatus; icon: any; colorClass: string; activeVariant: string; borderVariant: string; label: string }[] = [
  { id: 'Booked', icon: Clock, colorClass: 'bg-indigo-500', activeVariant: 'text-indigo-400 bg-indigo-500/10', borderVariant: 'ring-indigo-500/20', label: 'Booked' },
  { id: 'Shot', icon: Camera, colorClass: 'bg-purple-500', activeVariant: 'text-purple-400 bg-purple-500/10', borderVariant: 'ring-purple-500/20', label: 'Shot' },
  { id: 'Editing', icon: Scissors, colorClass: 'bg-amber-500', activeVariant: 'text-amber-400 bg-amber-500/10', borderVariant: 'ring-amber-500/20', label: 'Editing' },
  { id: 'Review', icon: Eye, colorClass: 'bg-blue-500', activeVariant: 'text-blue-400 bg-blue-500/10', borderVariant: 'ring-blue-500/20', label: 'Review' },
  { id: 'Delivered', icon: CheckCircle, colorClass: 'bg-emerald-500', activeVariant: 'text-emerald-400 bg-emerald-500/10', borderVariant: 'ring-emerald-500/20', label: 'Delivered' },
];

export default function Pipeline() {
  const [projects, setProjects] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<PipelineStatus | 'All'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 7;

  useEffect(() => {
    return bookingService.subscribe((data) => {
      // Sort by date descending
      const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
      setProjects(sorted);
    });
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  const updateStatus = async (projectId: string, newStatus: PipelineStatus) => {
    if (filterStatus !== 'All') return; // Restriction applied here as well
    try {
      await bookingService.update(projectId, { status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProjects = filterStatus === 'All' 
    ? projects 
    : projects.filter(p => p.status === filterStatus);

  const totalPages = Math.ceil(filteredProjects.length / PAGE_SIZE);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="space-y-6 md:space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">Production Control</span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-white mt-1">Workflow Pipeline</h1>
        </div>
        
        <div className="flex flex-nowrap md:flex-wrap gap-2 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
          <button 
            onClick={() => setFilterStatus('All')}
            className={cn(
              "px-3 md:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-mono uppercase tracking-widest transition-all border shrink-0",
              filterStatus === 'All' 
                ? "bg-zinc-100 text-black border-zinc-100 font-bold" 
                : "bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700"
            )}
          >
            All
          </button>
          {STAGES.map(stage => (
            <button 
              key={stage.id}
              onClick={() => setFilterStatus(stage.id)}
              className={cn(
                "px-3 md:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-mono uppercase tracking-widest transition-all border flex items-center gap-1.5 md:gap-2 shrink-0",
                filterStatus === stage.id 
                  ? `${stage.colorClass} text-white border-transparent font-bold` 
                  : "bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700"
              )}
            >
              <stage.icon size={12} className="shrink-0" />
              <span className="inline">{stage.id}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-4">
        {paginatedProjects.length === 0 ? (
          <div className="py-20 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl">
            <p className="text-zinc-600 font-medium">No projects found in this stage.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {paginatedProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-bento-card border border-bento-border rounded-2xl p-4 md:p-6 backdrop-blur-sm group hover:border-zinc-700 transition-all"
                >
                  <div className="flex flex-col lg:flex-row gap-4 md:gap-6 items-start lg:items-center">
                    {/* Project Info */}
                    <div className="flex-1 min-w-0 space-y-2 w-full">
                      <div className="flex items-center justify-between lg:justify-start gap-3">
                        <h3 className="text-base md:text-lg font-bold text-white truncate">{project.clientName}</h3>
                        <span className={cn(
                          "text-[9px] md:text-[10px] px-2 py-0.5 rounded-md font-mono uppercase tracking-widest whitespace-nowrap text-white",
                          STAGES.find(s => s.id === project.status)?.colorClass || "bg-zinc-800"
                        )}>
                          {project.eventType}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 md:gap-x-6 gap-y-2 text-[11px] md:text-xs text-zinc-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-zinc-600" />
                          <span className="font-mono">{format(parseISO(project.date), 'dd MMM yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Tag size={13} className="text-zinc-600" />
                          <span>RM {Number(project.price).toLocaleString()}</span>
                        </div>
                        {project.location && (
                          <div className="flex items-center gap-1.5 truncate max-w-full sm:max-w-[200px]">
                            <ChevronRight size={13} className="text-zinc-600" />
                            <span className="truncate">{project.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Switcher */}
                    <div className="w-full lg:w-auto relative group/switcher mt-2 lg:mt-0">
                      <div className={cn(
                        "flex flex-wrap items-center gap-1 bg-zinc-950/50 p-1 md:p-1.5 rounded-xl md:rounded-2xl border border-zinc-800/50 transition-opacity",
                        filterStatus !== 'All' && "opacity-40"
                      )}>
                        {STAGES.map((stage) => {
                          const isActive = project.status === stage.id;
                          const isSwitchable = filterStatus === 'All';
                          
                          return (
                            <button
                              key={stage.id}
                              disabled={!isSwitchable}
                              onClick={() => updateStatus(project.id, stage.id)}
                              className={cn(
                                "flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 px-2 sm:px-3 lg:px-4 py-2 md:py-2 rounded-lg md:rounded-xl transition-all relative group/btn",
                                isActive 
                                  ? `${stage.activeVariant} ring-1 ring-inset ${stage.borderVariant}`
                                  : isSwitchable ? "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50" : "text-zinc-800 cursor-not-allowed"
                              )}
                              title={isSwitchable ? `Set status to ${stage.label}` : "Status changes only available in 'All' view"}
                            >
                              <stage.icon size={14} className="md:w-4 md:h-4 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                              <span className={cn(
                                "text-[9px] md:text-[10px] font-bold uppercase tracking-wider truncate",
                                isActive ? "opacity-100" : "opacity-0 hidden lg:group-hover/btn:inline transition-opacity"
                              )}>
                                {stage.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {filterStatus !== 'All' && (
                        <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-tighter mt-2 text-center lg:text-right">
                          Switch to 'All' to change status
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {project.remarks && (
                    <div className="mt-4 pt-4 border-t border-zinc-800/50">
                      <p className="text-xs text-zinc-500 italic leading-relaxed">
                        "{project.remarks}"
                      </p>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 px-2 py-4 border-t border-zinc-800 shrink-0">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            Showing {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredProjects.length)} of {filteredProjects.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={cn(
                "px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold transition-all",
                currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:text-white hover:border-zinc-600"
              )}
            >
              Previous
            </button>
            <div className="text-xs font-bold text-zinc-400 font-mono">
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={cn(
                "px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-bold transition-all",
                currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:text-white hover:border-zinc-600"
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
