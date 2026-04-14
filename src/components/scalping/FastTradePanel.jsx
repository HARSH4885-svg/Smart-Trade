import React from 'react';
import { Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

const FastTradePanel = ({ 
  currentPrice, 
  quantity, 
  setQuantity, 
  leverage, 
  setLeverage, 
  handleTrade, 
  signal 
}) => {
  const prevPrice = React.useRef(currentPrice);
  const [flash, setFlash] = React.useState(null);

  React.useEffect(() => {
    if (currentPrice > prevPrice.current) setFlash('up');
    else if (currentPrice < prevPrice.current) setFlash('down');
    
    prevPrice.current = currentPrice;
    const timer = setTimeout(() => setFlash(null), 300);
    return () => clearTimeout(timer);
  }, [currentPrice]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Zap size={16} className="text-warning animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest">Fast Execution</span>
        </div>
        <div className={cn(
          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter transition-colors duration-300",
          flash === 'up' ? "bg-success text-white" : 
          flash === 'down' ? "bg-danger text-white" :
          signal === "BUY" ? "bg-success/20 text-success" : 
          signal === "SELL" ? "bg-danger/20 text-danger" : "bg-border/20 text-text-secondary"
        )}>
          Signal: {signal}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-text-secondary uppercase">Quantity</label>
          <input 
            type="number" 
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold focus:border-primary outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-text-secondary uppercase">Leverage</label>
          <select 
            value={leverage}
            onChange={(e) => setLeverage(Number(e.target.value))}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-bold focus:border-primary outline-none"
          >
            {[1, 2, 5, 10, 20].map(l => (
              <option key={l} value={l}>{l}x</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => handleTrade("BUY")}
          className="group relative overflow-hidden bg-success hover:bg-success/90 text-white font-black py-4 rounded-xl transition-all active:scale-95 flex flex-col items-center justify-center"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
          <TrendingUp size={20} className="mb-1" />
          <span className="uppercase tracking-widest text-xs">Instant Buy</span>
          <span className="text-[10px] opacity-70 tabular-nums">{currentPrice.toFixed(2)}</span>
        </button>
        
        <button 
          onClick={() => handleTrade("SELL")}
          className="group relative overflow-hidden bg-danger hover:bg-danger/90 text-white font-black py-4 rounded-xl transition-all active:scale-95 flex flex-col items-center justify-center"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
          <TrendingDown size={20} className="mb-1" />
          <span className="uppercase tracking-widest text-xs">Instant Sell</span>
          <span className="text-[10px] opacity-70 tabular-nums">{currentPrice.toFixed(2)}</span>
        </button>
      </div>
    </div>
  );
};

export default FastTradePanel;
