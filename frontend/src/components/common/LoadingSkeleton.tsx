import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-800/50 rounded-2xl border border-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-slate-800/40 rounded-2xl border border-slate-800" />
        <div className="h-72 bg-slate-800/40 rounded-2xl border border-slate-800" />
      </div>
      <div className="h-64 bg-slate-800/40 rounded-2xl border border-slate-800" />
    </div>
  );
};
