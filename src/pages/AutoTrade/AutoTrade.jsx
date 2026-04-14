import React, { useState, useMemo } from 'react';
import { useMarket } from '../../context/MarketContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { useFormatters } from '../../hooks/useFormatters';
import { 
  Target, Plus, X, ArrowUpCircle, ArrowDownCircle, 
  Clock, CheckCircle2, Search, TrendingUp, TrendingDown,
  Activity, Zap, ShieldCheck, Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

const AutoTrade = () => {
  const { stocks } = useMarket();
  const { limitOrders, addLimitOrder, cancelLimitOrder, holdings } = usePortfolio();
  const { formatCurrency, formatPercent, formatCompactCurrency } = useFormatters();
  
  const [selectedStockId, setSelectedStockId] = useState('');
  const [type, setType] = useState('BUY');
  const [targetPrice, setTargetPrice] = useState('');
  const [shares, setShares] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const userHolding = useMemo(() => 
    holdings.find(h => h.stockId === selectedStockId),
  [holdings, selectedStockId]);

  const pendingSellShares = useMemo(() => {
    return limitOrders
      .filter(o => o.stockId === selectedStockId && o.type === 'SELL' && o.status === 'PENDING')
      .reduce((sum, o) => sum + o.shares, 0);
  }, [limitOrders, selectedStockId]);

  const availableToSell = useMemo(() => {
    if (!userHolding) return 0;
    return Math.max(0, userHolding.shares - pendingSellShares);
  }, [userHolding, pendingSellShares]);

  const selectedStock = useMemo(() => 
    stocks.find(s => s.id === selectedStockId), 
  [stocks, selectedStockId]);

  const filteredStocks = useMemo(() => 
    stocks.filter(s => 
      s.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  [stocks, searchQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedStockId || !targetPrice || !shares) {
      toast.error('Please fill all fields');
      return;
    }

    const shareCount = parseInt(shares);

    if (type === 'SELL') {
      if (!userHolding) {
        toast.error(`You don't own any shares of ${selectedStockId}`);
        return;
      }
      if (shareCount > availableToSell) {
        if (pendingSellShares > 0) {
          toast.error(`You only have ${availableToSell} shares available (${pendingSellShares} already in pending sell orders)`);
        } else {
          toast.error(`You only own ${userHolding.shares} shares of ${selectedStockId}`);
        }
        return;
      }
    }

    addLimitOrder({
      stockId: selectedStockId,
      type,
      targetPrice: parseFloat(targetPrice),
      shares: shareCount
    });

    toast.success(`Auto-${type.toLowerCase()} order set for ${selectedStockId}`);
    setTargetPrice('');
    setShares('');
  };

  const pendingOrders = limitOrders.filter(o => o.status === 'PENDING');
  const executedOrders = limitOrders.filter(o => o.status === 'EXECUTED');

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center space-x-3">
            <Target className="text-primary" size={32} />
            <span>Auto Trading Engine</span>
          </h1>
          <p className="text-text-secondary text-sm font-medium mt-1">
            Set precise entry and exit points. Our engine executes trades automatically when targets are hit.
          </p>
        </div>
        <div className="flex items-center space-x-4 bg-surface p-2 rounded-2xl border border-border">
          <div className="px-4 py-2 text-center border-r border-border">
            <p className="text-xs font-black text-text-secondary uppercase tracking-widest">Active Orders</p>
            <p className="text-2xl font-black text-primary">{pendingOrders.length}</p>
          </div>
          <div className="px-4 py-2 text-center">
            <p className="text-xs font-black text-text-secondary uppercase tracking-widest">Total Executed</p>
            <p className="text-2xl font-black text-success">{executedOrders.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Order Creation */}
        <div className="lg:col-span-7 space-y-6">
          <div className="card p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Zap size={120} />
            </div>
            
            <h2 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center space-x-2">
              <Plus size={20} className="text-primary" />
              <span>Create New Auto-Trade</span>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Stock Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Select Asset</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" size={18} />
                  <input 
                    type="text"
                    placeholder="Search by name or symbol..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-background border border-border rounded-2xl pl-12 pr-4 py-3 text-base focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-3 max-h-40 overflow-y-auto custom-scrollbar p-1">
                  {filteredStocks.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStockId(s.id)}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-all group",
                        selectedStockId === s.id 
                          ? "bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5" 
                          : "bg-background border-border text-text-secondary hover:border-text-secondary"
                      )}
                    >
                      <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{s.logo}</div>
                      <div className="text-xs font-black uppercase tracking-tighter">{s.id}</div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedStock && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/5 rounded-2xl p-4 border border-primary/20 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">{selectedStock.logo}</div>
                    <div>
                      <h3 className="text-lg font-black uppercase tracking-tighter">{selectedStock.name}</h3>
                      <div className="flex items-center space-x-2 text-xs font-bold text-text-secondary">
                        <span>{selectedStock.sector}</span>
                        <span>•</span>
                        <span className={selectedStock.change >= 0 ? "text-success" : "text-danger"}>
                          {formatCurrency(selectedStock.currentPrice)} ({formatPercent(selectedStock.changePercent)})
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-text-secondary uppercase tracking-widest">Day Range</p>
                    <p className="text-xs font-bold tabular-nums">
                      {formatCurrency(selectedStock.low)} - {formatCurrency(selectedStock.high)}
                    </p>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Order Type */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Execution Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('BUY')}
                      className={cn(
                        "py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2",
                        type === 'BUY' ? "bg-success text-white shadow-lg shadow-success/20" : "bg-background border border-border text-text-secondary"
                      )}
                    >
                      <ArrowDownCircle size={16} />
                      <span>Auto Buy</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('SELL')}
                      disabled={!userHolding || availableToSell <= 0}
                      className={cn(
                        "py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2",
                        type === 'SELL' ? "bg-danger text-white shadow-lg shadow-danger/20" : "bg-background border border-border text-text-secondary",
                        (!userHolding || availableToSell <= 0) && "opacity-50 grayscale cursor-not-allowed"
                      )}
                    >
                      <ArrowUpCircle size={16} />
                      <span>Auto Sell</span>
                    </button>
                  </div>
                  {type === 'SELL' && userHolding && (
                    <p className="text-xs font-bold text-danger mt-1 ml-1">
                      Available: {availableToSell} shares
                    </p>
                  )}
                </div>

                {/* Target Price */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Target Price</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-bold">$</span>
                    <input 
                      type="number"
                      step="0.01"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-background border border-border rounded-xl pl-8 pr-4 py-3 text-base font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shares */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Quantity (Shares)</label>
                  <input 
                    type="number"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                    placeholder="Enter amount..."
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-base font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                  />
                </div>

                {/* Estimated Total */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-text-secondary uppercase tracking-widest ml-1">Estimated Total</label>
                  <div className="w-full bg-surface border border-border border-dashed rounded-xl px-4 py-3 text-base font-black text-primary flex items-center justify-between">
                    <span>Total:</span>
                    <span>{formatCurrency((parseFloat(targetPrice) || 0) * (parseInt(shares) || 0))}</span>
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={!selectedStockId}
                className="w-full btn-primary py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Activate Auto-{type} Protocol
              </button>
            </form>
          </div>

          {/* Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface p-4 rounded-2xl border border-border flex flex-col items-center text-center space-y-2">
              <ShieldCheck className="text-success" size={24} />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Secure Execution</h4>
              <p className="text-[10px] text-text-secondary leading-tight">Orders are processed locally with zero latency.</p>
            </div>
            <div className="bg-surface p-4 rounded-2xl border border-border flex flex-col items-center text-center space-y-2">
              <Activity className="text-primary" size={24} />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Real-time Monitoring</h4>
              <p className="text-[10px] text-text-secondary leading-tight">Prices are checked every tick against your targets.</p>
            </div>
            <div className="bg-surface p-4 rounded-2xl border border-border flex flex-col items-center text-center space-y-2">
              <Info className="text-warning" size={24} />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Smart Fallback</h4>
              <p className="text-[10px] text-text-secondary leading-tight">Automatic retry logic for volatile market conditions.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Order Management */}
        <div className="lg:col-span-5 space-y-6">
          {/* Pending Orders */}
          <div className="card p-6">
            <h2 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock size={20} className="text-warning" />
                <span>Active Protocols</span>
              </div>
              <span className="text-xs bg-warning/10 text-warning px-2 py-1 rounded-lg">{pendingOrders.length}</span>
            </h2>

            <div className="space-y-4">
              {pendingOrders.length === 0 ? (
                <div className="text-center py-12 opacity-30">
                  <Target size={48} className="mx-auto mb-4" />
                  <p className="text-sm font-black uppercase tracking-widest">No Active Targets</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {pendingOrders.map(order => {
                    const stock = stocks.find(s => s.id === order.stockId);
                    return (
                      <motion.div 
                        key={order.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-background border border-border rounded-2xl p-4 flex items-center justify-between group hover:border-primary/50 transition-all"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner",
                            order.type === 'BUY' ? "bg-success/5 text-success" : "bg-danger/5 text-danger"
                          )}>
                            {stock?.logo || order.stockId[0]}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-black text-base">{order.stockId}</span>
                              <span className={cn(
                                "text-xs font-black px-2 py-0.5 rounded uppercase tracking-widest",
                                order.type === 'BUY' ? "bg-success text-white" : "bg-danger text-white"
                              )}>
                                {order.type}
                              </span>
                            </div>
                            <div className="text-sm font-bold text-text-secondary mt-1">
                              Target: <span className="text-text-primary">{formatCurrency(order.targetPrice)}</span>
                            </div>
                            <div className="text-xs text-text-secondary">
                              Quantity: {order.shares} shares
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => cancelLimitOrder(order.id)}
                          className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X size={20} />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* History */}
          <div className="card p-6">
            <h2 className="text-lg font-black uppercase tracking-widest mb-6 flex items-center space-x-2">
              <CheckCircle2 size={20} className="text-success" />
              <span>Execution Log</span>
            </h2>

            <div className="space-y-3">
              {executedOrders.length === 0 ? (
                <div className="text-center py-8 opacity-20">
                  <p className="text-[10px] font-black uppercase tracking-widest">No recent executions</p>
                </div>
              ) : (
                executedOrders.slice(0, 8).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-surface/50 rounded-xl border border-border/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center text-success">
                        <CheckCircle2 size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-black">{order.stockId} <span className="text-text-secondary font-bold">@{formatCurrency(order.targetPrice)}</span></p>
                        <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">
                          {new Date(order.executedAt).toLocaleDateString()} • {new Date(order.executedAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-xs font-black uppercase tracking-widest",
                        order.type === 'BUY' ? "text-success" : "text-danger"
                      )}>
                        {order.type}
                      </p>
                      <p className="text-xs font-bold text-text-secondary">{order.shares} Shares</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutoTrade;
