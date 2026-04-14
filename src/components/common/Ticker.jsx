import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const indices = [
  { name: 'S&P 500', value: '5,137.08', change: '+0.80%', isUp: true },
  { name: 'NASDAQ', value: '16,274.94', change: '+1.14%', isUp: true },
  { name: 'DOW J', value: '39,087.38', change: '-0.12%', isUp: false },
  { name: 'FTSE 100', value: '7,640.33', change: '+0.69%', isUp: true },
  { name: 'DAX', value: '17,735.07', change: '+0.32%', isUp: true },
  { name: 'NIFTY 50', value: '22,493.55', change: '+1.62%', isUp: true },
  { name: 'BTC/USD', value: '67,241.00', change: '+2.45%', isUp: true },
  { name: 'GOLD', value: '2,128.60', change: '+0.15%', isUp: true },
];

const Ticker = () => {
  return (
    <div className="w-full bg-surface border-b border-border overflow-hidden h-12 flex items-center">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...indices, ...indices].map((index, i) => (
          <div key={i} className="flex items-center space-x-4 px-8 border-r border-border/50">
            <span className="text-xs font-black uppercase tracking-widest text-text-secondary">
              {index.name}
            </span>
            <span className="text-sm font-mono font-bold tabular-nums">
              {index.value}
            </span>
            <div className={cn(
              "flex items-center space-x-1 text-xs font-bold",
              index.isUp ? "text-success" : "text-danger"
            )}>
              {index.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              <span>{index.change}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Ticker;
