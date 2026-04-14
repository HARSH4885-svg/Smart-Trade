import React from 'react';
import { Zap, ShieldAlert, Cpu, Settings2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import FastTradePanel from './FastTradePanel';
import ScalpingStats from './ScalpingStats';

const ScalpingPanel = ({ scalping }) => {
  const {
    isEnabled,
    setIsEnabled,
    isAutoTrade,
    setIsAutoTrade,
    leverage,
    setLeverage,
    quantity,
    setQuantity,
    stopLoss,
    setStopLoss,
    takeProfit,
    setTakeProfit,
    currentPrice,
    signal,
    stats,
    handleTrade
  } = scalping;

  return (
    <div className={cn(
      "card relative overflow-hidden transition-all duration-500",
      isEnabled ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10" : "opacity-80"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between bg-surface/50">
        <div className="flex items-center space-x-3">
          <div className={cn(
            "p-2 rounded-lg transition-colors",
            isEnabled ? "bg-primary text-white" : "bg-border text-text-secondary"
          )}>
            <Zap size={18} className={cn(isEnabled && "animate-pulse")} />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">Scalping Mode</h3>
            <div className="flex items-center space-x-2">
              <span className={cn(
                "w-2 h-2 rounded-full",
                isEnabled ? "bg-success animate-ping" : "bg-text-secondary/30"
              )}></span>
              <span className="text-[10px] font-bold text-text-secondary uppercase">
                {isEnabled ? "LIVE ⚡" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setIsEnabled(!isEnabled)}
          className={cn(
            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
            isEnabled 
              ? "bg-danger text-white hover:bg-danger/80" 
              : "bg-primary text-white hover:bg-primary/80"
          )}
        >
          {isEnabled ? "Disable" : "Enable"}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Auto Trade Toggle */}
        <div className="flex items-center justify-between p-3 bg-background/40 rounded-xl border border-border/50">
          <div className="flex items-center space-x-3">
            <Cpu size={18} className={cn(isAutoTrade ? "text-primary" : "text-text-secondary")} />
            <div>
              <p className="text-xs font-black uppercase tracking-tight">AI Auto-Trade</p>
              <p className="text-[9px] text-text-secondary font-medium">Algorithmic execution</p>
            </div>
          </div>
          <button 
            disabled={!isEnabled}
            onClick={() => setIsAutoTrade(!isAutoTrade)}
            className={cn(
              "w-10 h-5 rounded-full relative transition-colors",
              isAutoTrade ? "bg-primary" : "bg-border",
              !isEnabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className={cn(
              "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
              isAutoTrade ? "left-6" : "left-1"
            )}></div>
          </button>
        </div>

        {/* Risk Management */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-text-secondary">
            <ShieldAlert size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Risk Management</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[9px] font-black text-text-secondary uppercase">Stop Loss</label>
                <span className="text-[9px] font-bold text-danger">{stopLoss}%</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="5" 
                step="0.1"
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value))}
                className="w-full accent-danger h-1 bg-border rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[9px] font-black text-text-secondary uppercase">Take Profit</label>
                <span className="text-[9px] font-bold text-success">{takeProfit}%</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="10" 
                step="0.1"
                value={takeProfit}
                onChange={(e) => setTakeProfit(Number(e.target.value))}
                className="w-full accent-success h-1 bg-border rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Trade Panel */}
        <FastTradePanel 
          currentPrice={currentPrice}
          quantity={quantity}
          setQuantity={setQuantity}
          leverage={leverage}
          setLeverage={setLeverage}
          handleTrade={handleTrade}
          signal={signal}
        />

        {/* Stats */}
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center space-x-2 text-text-secondary mb-3">
            <Settings2 size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Performance Analytics</span>
          </div>
          <ScalpingStats stats={stats} />
        </div>
      </div>
    </div>
  );
};

export default ScalpingPanel;
