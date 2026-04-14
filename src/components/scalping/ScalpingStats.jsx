import React from 'react';
import { Activity, Target, ShieldCheck, Clock } from 'lucide-react';

const ScalpingStats = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="p-3 bg-background/40 rounded-xl border border-border/50">
        <div className="flex items-center space-x-2 mb-1">
          <Activity size={12} className="text-primary" />
          <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary">Trades/Min</span>
        </div>
        <p className="text-sm font-black tabular-nums">{stats.tradesPerMinute.toFixed(1)}</p>
      </div>
      
      <div className="p-3 bg-background/40 rounded-xl border border-border/50">
        <div className="flex items-center space-x-2 mb-1">
          <Target size={12} className="text-success" />
          <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary">Win Rate</span>
        </div>
        <p className="text-sm font-black tabular-nums">{stats.winRate}%</p>
      </div>

      <div className="p-3 bg-background/40 rounded-xl border border-border/50">
        <div className="flex items-center space-x-2 mb-1">
          <ShieldCheck size={12} className="text-warning" />
          <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary">Total Trades</span>
        </div>
        <p className="text-sm font-black tabular-nums">{stats.totalTrades}</p>
      </div>

      <div className="p-3 bg-background/40 rounded-xl border border-border/50">
        <div className="flex items-center space-x-2 mb-1">
          <Clock size={12} className="text-info" />
          <span className="text-[9px] font-black uppercase tracking-widest text-text-secondary">Avg Duration</span>
        </div>
        <p className="text-sm font-black tabular-nums">{stats.avgDuration}s</p>
      </div>
    </div>
  );
};

export default ScalpingStats;
