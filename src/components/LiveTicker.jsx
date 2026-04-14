import React from 'react';
import { useTickerData } from '../hooks/useTickerData';
import { cn } from '../lib/utils';
import { useFormatters } from '../hooks/useFormatters';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

const LiveTicker = () => {
  const trades = useTickerData(20);
  const { formatCurrency } = useFormatters();

  if (trades.length === 0) return null;

  return (
    <div className="w-full bg-surface/60 backdrop-blur-xl border-y border-border/50 overflow-hidden h-11 flex items-center group relative shadow-sm">
      {/* Live Badge */}
      <div className="absolute left-0 z-20 bg-primary px-3 h-full flex items-center shadow-[4px_0_15px_rgba(59,130,246,0.3)]">
        <div className="flex items-center space-x-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live</span>
        </div>
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-y-0 left-16 w-12 bg-gradient-to-r from-surface to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-surface to-transparent z-10 pointer-events-none" />

      <div className="flex animate-ticker whitespace-nowrap group-hover:pause-animation pl-16">
        {/* Duplicate content for seamless loop */}
        {[...trades, ...trades].map((trade, idx) => (
          <Link
            key={`${trade.id}-${idx}`}
            to={`/market/${trade.stock}`}
            className="inline-flex items-center space-x-3 px-8 hover:bg-primary/5 transition-all h-full border-r border-border/30 group/item"
          >
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              trade.action === 'BUY' ? "bg-success shadow-[0_0_8px_rgba(0,255,157,0.5)]" : "bg-danger shadow-[0_0_8px_rgba(255,62,62,0.5)]"
            )} />
            
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-black text-text-primary group-hover/item:text-primary transition-colors">
                {trade.user}
              </span>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                trade.action === 'BUY' ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              )}>
                {trade.action}
              </span>
            </div>

            <div className="flex items-center space-x-1.5 text-[11px]">
              <span className="text-text-secondary font-medium">
                {trade.quantity}
              </span>
              <span className="text-text-secondary/60">shares of</span>
              <span className="font-black text-primary tracking-tighter">
                {trade.stock}
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] text-text-secondary/60">@</span>
              <span className="text-[11px] font-bold tabular-nums text-text-primary">
                {formatCurrency(trade.price)}
              </span>
            </div>

            {trade.isReal && (
              <Zap size={12} className="text-warning animate-pulse fill-warning/20" />
            )}
          </Link>
        ))}
      </div>

      <style>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker {
          animation: ticker 80s linear infinite;
        }
        .pause-animation {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default LiveTicker;
