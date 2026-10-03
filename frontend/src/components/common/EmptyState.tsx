import React from 'react';
import { Database, PlusCircle, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  onAddClick?: () => void;
  onSeedClick?: () => void;
  actionText?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No emissions data for this reporting period',
  description = 'Add your operational electricity, diesel, freight, or raw material activities, or seed demo data for instant analysis.',
  onAddClick,
  onSeedClick,
  actionText = 'Record Activity'
}) => {
  return (
    <div className="glass-panel rounded-2xl p-10 text-center max-w-lg mx-auto border border-dashed border-slate-700/80 my-8">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
        <Database className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {onAddClick && (
          <button
            onClick={onAddClick}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            {actionText}
          </button>
        )}
        {onSeedClick && (
          <button
            onClick={onSeedClick}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-all"
          >
            <Sparkles className="w-4 h-4 mr-2 text-cyan-400" />
            Seed Demo Dataset
          </button>
        )}
      </div>
    </div>
  );
};
