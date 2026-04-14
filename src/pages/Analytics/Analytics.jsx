import React, { useMemo, useState } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useMarket } from '../../context/MarketContext';
import { 
  TrendingUp, TrendingDown, Target, Zap, 
  BarChart3, PieChart as PieChartIcon, Activity,
  Search, Calendar, ArrowRight, DollarSign
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ComposedChart, AreaChart, Area, PieChart, Pie
} from 'recharts';
import { cn } from '../../lib/utils';
import { stocks as allStocks } from '../../data/stocks';
import { getMarketOutlook } from '../../services/geminiService';
import { toast } from 'react-hot-toast';
import { useFormatters } from '../../hooks/useFormatters';

const Analytics = () => {
  const { holdings, transactions } = usePortfolio();
  const { stocks } = useMarket();
  const { formatCurrency, formatPercent, formatDate } = useFormatters();
  
  const [marketOutlook, setMarketOutlook] = useState(null);
  const [isOutlookLoading, setIsOutlookLoading] = useState(false);

  // What-If Simulator State
  const [whatIf, setWhatIf] = useState({
    stockId: 'NVDA',
    amount: 10000,
    startDate: '2024-01-01'
  });

  const performanceMetrics = useMemo(() => {
    const totalTrades = transactions.length;
    const profitableTrades = transactions.filter(tx => tx.pnl > 0).length;
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;
    
    const totalPnL = transactions.reduce((acc, tx) => acc + (tx.pnl || 0), 0);
    const avgGain = totalPnL / totalTrades || 0;

    return {
      winRate,
      totalTrades,
      avgGain,
      bestTrade: Math.max(...transactions.map(tx => tx.pnl || 0), 0),
      worstTrade: Math.min(...transactions.map(tx => tx.pnl || 0), 0)
    };
  }, [transactions]);

  const handleGenerateOutlook = async () => {
    setIsOutlookLoading(true);
    try {
      const outlook = await getMarketOutlook(stocks);
      setMarketOutlook(outlook);
      toast.success('Market Analysis Complete');
    } catch (error) {
      toast.error('Failed to generate market outlook');
      console.error(error);
    } finally {
      setIsOutlookLoading(false);
    }
  };

  const sectorPerformance = useMemo(() => {
    const sectors = {};
    stocks.forEach(s => {
      sectors[s.sector] = (sectors[s.sector] || 0) + s.changePercent;
    });
    return Object.entries(sectors).map(([name, value]) => ({ 
      name, 
      value: parseFloat((value / stocks.filter(s => s.sector === name).length).toFixed(2))
    })).sort((a, b) => b.value - a.value);
  }, [stocks]);

  const whatIfResult = useMemo(() => {
    if (!whatIf.startDate || isNaN(new Date(whatIf.startDate).getTime())) return null;
    const amount = parseFloat(whatIf.amount) || 0;
    if (amount <= 0) return null;

    const stock = allStocks.find(s => s.id === whatIf.stockId);
    if (!stock) return null;
    
    // Calculate days since start date to simulate growth
    const start = new Date(whatIf.startDate);
    const now = new Date();
    
    // If start date is in the future, return 0 growth
    if (start > now) {
      return { finalValue: amount, profit: 0, returnPercent: 0 };
    }

    const diffTime = Math.abs(now - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Mock daily growth rates
    // NVDA: ~0.3% daily (high growth), others ~0.08% daily
    const dailyRate = whatIf.stockId === 'NVDA' ? 0.0032 : 0.0009;
    
    // Compound growth simulation
    const growth = Math.pow(1 + dailyRate, diffDays);
    const finalValue = amount * growth;
    const profit = finalValue - amount;
    const returnPercent = ((finalValue - amount) / amount) * 100;

    return { finalValue, profit, returnPercent };
  }, [whatIf]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-text-secondary">Deep dive into your trading performance and market trends.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="card p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
              <Activity className="text-primary" size={20} />
              <span>Trading Performance</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              <div className="text-center">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Win Rate</p>
                <p className="text-4xl font-bold text-success">{performanceMetrics.winRate.toFixed(1)}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Total Trades</p>
                <p className="text-4xl font-bold">{performanceMetrics.totalTrades}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Best Trade</p>
                <p className="text-4xl font-bold text-success">{formatCurrency(performanceMetrics.bestTrade)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Worst Trade</p>
                <p className="text-4xl font-bold text-danger">{formatCurrency(Math.abs(performanceMetrics.worstTrade))}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
              <BarChart3 className="text-primary" size={20} />
              <span>Sector Performance (Market)</span>
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectorPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                  <XAxis type="number" stroke="#9CA3AF" fontSize={10} tickFormatter={(val) => `${val}%`} />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} width={100} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px' }}
                    itemStyle={{ color: '#F9FAFB' }}
                    formatter={(value) => [`${value}%`, 'Avg Change']}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                    {sectorPerformance.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.value >= 0 ? '#10B981' : '#EF4444'} 
                        fillOpacity={0.8}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-6 bg-primary/5 border-primary/20">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center space-x-2">
                <Zap className="text-primary" size={24} />
                <span>"What If" Simulator</span>
              </h3>
              <span className="badge bg-primary text-white">Innovation Feature</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Investment Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                  <input 
                    type="number" 
                    className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={whatIf.amount}
                    onChange={(e) => setWhatIf({ ...whatIf, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Stock Ticker</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={16} />
                  <select 
                    className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                    value={whatIf.stockId}
                    onChange={(e) => setWhatIf({ ...whatIf, stockId: e.target.value })}
                  >
                    {allStocks.map(s => <option key={s.id} value={s.id}>{s.id} - {s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" size={16} />
                  <input 
                    type="date" 
                    className="w-full bg-background border border-border rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer [color-scheme:dark]"
                    value={whatIf.startDate}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setWhatIf({ ...whatIf, startDate: e.target.value })}
                    onClick={(e) => e.currentTarget.showPicker?.()}
                  />
                </div>
              </div>
            </div>

            {whatIfResult && (
              <div className="space-y-6">
                <div className="bg-background border border-border rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="space-y-2 text-center md:text-left flex-1">
                    <p className="text-text-secondary">If you had invested <span className="text-text-primary font-bold">{formatCurrency(whatIf.amount)}</span> in <span className="text-primary font-bold">{whatIf.stockId}</span> on <span className="text-text-primary font-bold">{formatDate(whatIf.startDate)}</span>...</p>
                    <p className="text-lg">You would have <span className="text-success font-bold text-2xl">{formatCurrency(whatIfResult.finalValue)}</span> today!</p>
                    <p className="text-sm text-text-secondary">That's a total return of <span className="text-success font-bold">{formatPercent(whatIfResult.returnPercent)}</span></p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="w-24 h-24 rounded-full border-4 border-success flex items-center justify-center">
                      <span className="text-success font-bold">+{Math.round(whatIfResult.returnPercent)}%</span>
                    </div>
                    <ArrowRight className="text-text-secondary" size={32} />
                    <div className="w-24 h-24 rounded-full bg-success text-white flex items-center justify-center shadow-lg shadow-success/20">
                      <Zap size={40} fill="currentColor" />
                    </div>
                  </div>
                </div>

                <div className="h-48 w-full card bg-background/50 border-dashed">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={Array.from({ length: 20 }, (_, i) => ({
                      val: parseFloat(whatIf.amount) * Math.pow(1 + (whatIf.stockId === 'NVDA' ? 0.0032 : 0.0009), (i / 19) * (Math.ceil(Math.abs(new Date() - new Date(whatIf.startDate)) / (1000 * 60 * 60 * 24))))
                    }))}>
                      <defs>
                        <linearGradient id="colorWhatIf" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="val" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorWhatIf)" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px' }}
                        itemStyle={{ color: '#F9FAFB' }}
                        formatter={(val) => formatCurrency(val)}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="card p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="text-primary" size={20} />
                <span>Market Outlook</span>
              </div>
              <button 
                onClick={handleGenerateOutlook}
                disabled={isOutlookLoading}
                className="text-xs text-primary font-bold hover:underline disabled:opacity-50"
              >
                {isOutlookLoading ? 'Analyzing...' : marketOutlook ? 'Refresh Analysis' : 'Generate Analysis'}
              </button>
            </h3>
            
            {marketOutlook ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-background rounded-xl border border-border">
                  <div>
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Market Sentiment</p>
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        "text-2xl font-bold",
                        marketOutlook.sentiment === 'Bullish' ? "text-success" : marketOutlook.sentiment === 'Bearish' ? "text-danger" : "text-warning"
                      )}>
                        {marketOutlook.sentiment}
                      </span>
                      <span className="text-sm text-text-secondary">({marketOutlook.aiScore}/100)</span>
                    </div>
                  </div>
                  <div className="h-14 w-14 rounded-full border-2 border-primary/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{marketOutlook.aiScore}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-bold text-text-secondary uppercase tracking-widest">Market Summary</p>
                  <p className="text-base text-text-secondary leading-relaxed">{marketOutlook.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-success uppercase tracking-widest">Opportunities</p>
                    <ul className="space-y-1">
                      {marketOutlook.opportunities.map((opt, i) => (
                        <li key={i} className="text-xs text-text-secondary flex items-start space-x-1">
                          <span className="text-success">•</span>
                          <span>{opt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-danger uppercase tracking-widest">Risks</p>
                    <ul className="space-y-1">
                      {marketOutlook.risks.map((risk, i) => (
                        <li key={i} className="text-xs text-text-secondary flex items-start space-x-1">
                          <span className="text-danger">•</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity size={48} className="text-border mx-auto mb-4" />
                <p className="text-text-secondary text-sm mb-4">Get a deep analysis of the current market conditions.</p>
                <button 
                  onClick={handleGenerateOutlook}
                  disabled={isOutlookLoading}
                  className="btn-primary py-2 px-6 text-xs"
                >
                  {isOutlookLoading ? 'Analyzing Market...' : 'Analyze Market Now'}
                </button>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
              <Zap className="text-primary" size={20} />
              <span>Performance Insights</span>
            </h3>
            <div className="space-y-6">
              <div className="p-4 bg-background border border-border rounded-xl">
                <h4 className="font-bold text-base mb-2">Sharpe Ratio</h4>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-bold">1.84</span>
                  <span className="badge badge-success">Excellent</span>
                </div>
                <p className="text-xs text-text-secondary mt-2">Your risk-adjusted return is significantly higher than the market average.</p>
              </div>
              <div className="p-4 bg-background border border-border rounded-xl">
                <h4 className="font-bold text-sm mb-2">Max Drawdown</h4>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-danger">-8.4%</span>
                  <span className="text-xs text-text-secondary">Last 30 Days</span>
                </div>
              </div>
              <div className="p-4 bg-background border border-border rounded-xl">
                <h4 className="font-bold text-sm mb-2">Profit Factor</h4>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">2.15</span>
                  <span className="text-xs text-text-secondary">Gross Profit / Gross Loss</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
              <Target className="text-primary" size={20} />
              <span>Efficiency Metrics</span>
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Avg Holding Period</span>
                <span className="font-bold">12.4 Days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Portfolio Turnover</span>
                <span className="font-bold">15%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Alpha (vs S&P 500)</span>
                <span className="font-bold text-success">+4.2%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
