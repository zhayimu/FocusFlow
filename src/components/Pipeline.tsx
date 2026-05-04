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

  useEffect(() => {
    return bookingService.subscribe((data) => {
      // Sort by date descending
      const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
      setProjects(sorted);
    });
  }, []);

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

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">Production Control</span>
          <h1 className="text-4xl font-bold tracking-tighter text-white mt-1">Workflow Pipeline</h1>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFilterStatus('All')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all border",
              filterStatus === 'All' 
                ? "bg-zinc-100 text-black border-zinc-100 font-bold" 
                : "bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700"
            )}
          >
            All Projects
          </button>
          {STAGES.map(stage => (
            <button 
              key={stage.id}
              onClick={() => setFilterStatus(stage.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all border flex items-center gap-2",
                filterStatus === stage.id 
                  ? `${stage.colorClass} text-white border-transparent font-bold` 
                  : "bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700"
              )}
            >
              <stage.icon size={12} />
              {stage.id}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="py-20 text-center bg-zinc-900/30 border border-dashed border-zinc-800 rounded-3xl">
            <p className="text-zinc-600 font-medium">No projects found in this stage.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {filteredProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-bento-card border border-bento-border rounded-2xl p-6 backdrop-blur-sm group hover:border-zinc-700 transition-all"
                >
                  <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                    {/* Project Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-white truncate">{project.clientName}</h3>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-md font-mono uppercase tracking-widest whitespace-nowrap text-white",
                          STAGES.find(s => s.id === project.status)?.colorClass || "bg-zinc-800"
                        )}>
                          {project.eventType}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-zinc-600" />
                          <span className="font-mono">{format(parseISO(project.date), 'dd MMM yyyy')}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Tag size={14} className="text-zinc-600" />
                          <span>${Number(project.price).toLocaleString()}</span>
                        </div>
                        {project.location && (
                          <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                            <ChevronRight size={14} className="text-zinc-600" />
                            <span className="truncate">{project.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status Switcher */}
                    <div className="w-full lg:w-auto">
                      <div className={cn(
                        "flex items-center gap-1 bg-zinc-950/50 p-1.5 rounded-2xl border border-zinc-800/50 transition-opacity",
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
                                "flex-1 lg:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all relative group/btn",
                                isActive 
                                  ? `${stage.activeVariant} ring-1 ring-inset ${stage.borderVariant}`
                                  : isSwitchable ? "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800/50" : "text-zinc-800 cursor-not-allowed"
                              )}
                              title={isSwitchable ? `Set status to ${stage.label}` : "Status changes only available in 'All Projects' view"}
                            >
                              <stage.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider lg:hidden xl:block",
                                isActive ? "opacity-100" : "opacity-0 group-hover/btn:opacity-100 transition-opacity hidden sm:block"
                              )}>
                                {stage.label}
                              </span>
                              {isActive && (
                                <motion.div 
                                  layoutId={`active-stage-${project.id}`}
                                  className={cn("absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full", stage.colorClass)}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {filterStatus !== 'All' && (
                        <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-tighter mt-2 text-center lg:text-right">
                          Switch to 'All Projects' to change status
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
    </div>
  );
}
