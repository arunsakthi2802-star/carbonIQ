import React from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  subValue?: string;
  changePct?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  accentColor?: 'emerald' | 'amber' | 'blue' | 'cyan';
  tooltip?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subValue,
  changePct,
  changeLabel = 'vs prev month',
  icon,
  accentColor = 'emerald',
  tooltip
}) => {
  const getAccentStyles = () => {
    switch (accentColor) {
      case 'amber':
        return {
          iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          glow: 'group-hover:border-amber-500/30'
        };
      case 'blue':
        return {
          iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
          glow: 'group-hover:border-blue-500/30'
        };
      case 'cyan':
        return {
          iconBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          glow: 'group-hover:border-cyan-500/30'
        };
      default:
        return {
          iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          glow: 'group-hover:border-emerald-500/30'
        };
    }
  };

  const styles = getAccentStyles();

  return (
    <div
      className={`glass-card p-5 rounded-2xl relative overflow-hidden group border border-slate-800 ${styles.glow}`}
      title={tooltip}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
          {subValue && (
            <p className="text-xs text-slate-400 mt-0.5">{subValue}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl border ${styles.iconBg} transition-transform group-hover:scale-105 duration-200`}>
          {icon}
        </div>
      </div>

      {changePct !== undefined && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5">
            {changePct < 0 ? (
              <span className="flex items-center font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                <TrendingDown className="w-3.5 h-3.5 mr-1" />
                {Math.abs(changePct)}%
              </span>
            ) : changePct > 0 ? (
              <span className="flex items-center font-medium text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                <TrendingUp className="w-3.5 h-3.5 mr-1" />
                +{changePct}%
              </span>
            ) : (
              <span className="flex items-center font-medium text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                <Minus className="w-3.5 h-3.5 mr-1" />
                0%
              </span>
            )}
            <span className="text-slate-400">{changeLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
};
