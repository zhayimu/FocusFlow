import { useState, useEffect } from 'react';
import { 
  Camera, Scissors, Eye, CheckCircle, Clock, ArrowRightLeft, ChevronRight 
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { bookingService } from '../lib/firestoreService';

type PipelineStatus = 'Booked' | 'Shot' | 'Editing' | 'Review' | 'Delivered';

const STAGES: { id: PipelineStatus; icon: any; color: string }[] = [
  { id: 'Booked', icon: Clock, color: 'bg-blue-500' },
  { id: 'Shot', icon: Camera, color: 'bg-purple-500' },
  { id: 'Editing', icon: Scissors, color: 'bg-amber-500' },
  { id: 'Review', icon: Eye, color: 'bg-indigo-500' },
  { id: 'Delivered', icon: CheckCircle, color: 'bg-emerald-500' },
];

export default function Pipeline() {
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    return bookingService.subscribe(setProjects);
  }, []);

  const moveProject = async (projectId: string, newStatus: PipelineStatus) => {
    try {
      await bookingService.update(projectId, { status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-10 overflow-x-auto pb-8 h-full">
      <header className="flex justify-between items-end">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-500 font-bold">Production Control</span>
          <h1 className="text-4xl font-bold tracking-tighter text-white mt-1">Workflow Pipeline</h1>
        </div>
      </header>

      <div className="flex gap-6 min-w-[1200px] h-[calc(100%-8rem)]">
        {STAGES.map((stage) => {
          const stageProjects = projects.filter(p => p.status === stage.id);
          return (
            <div key={stage.id} className="flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                  <h3 className="font-bold text-[11px] uppercase tracking-widest text-zinc-400">{stage.id}</h3>
                </div>
                <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-500 font-mono">
                  {stageProjects.length}
                </span>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-3 flex-grow space-y-3 backdrop-blur-sm">
                {stageProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    layoutId={project.id}
                    className="bg-zinc-950/40 border border-zinc-800 p-4 rounded-xl shadow-sm group hover:border-indigo-500/30 transition-all cursor-grab active:cursor-grabbing"
                  >
                    <p className="font-semibold text-sm text-zinc-100">{project.clientName}</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[9px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md font-mono uppercase tracking-widest">
                        {project.eventType}
                      </span>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-end gap-1">
                      {STAGES.map((s) => (
                        s.id !== stage.id && (
                          <button 
                            key={s.id}
                            onClick={() => moveProject(project.id, s.id)}
                            className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-indigo-400 hover:bg-zinc-700 transition-all"
                            title={`Shift to ${s.id}`}
                          >
                            <ChevronRight size={12} />
                          </button>
                        )
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
