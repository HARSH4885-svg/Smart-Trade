import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { useMarket } from '../../context/MarketContext';
import { TrendingUp, TrendingDown, DollarSign, PieChart as PieChartIcon, Activity, Wallet, Briefcase, PlusCircle, MinusCircle, Star } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import WalletModal from '../../components/WalletModal';
import TradingChart from '../../components/charts/TradingChart';
import Sparkline from '../../components/charts/Sparkline';
import { useFormatters } from '../../hooks/useFormatters';
import { mockPriceHistory } from '../../data/mockPriceHistory';
import Ticker from '../../components/common/Ticker';
import Skeleton from '../../components/common/Skeleton';
import { getMarketOutlook, analyzeNewsSentiment } from '../../services/geminiService';
import { Info, Zap, ShieldAlert, Target } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StatCard = ({ title, value, subValue, icon: Icon, trend, trendValue, isLive }) => (
  <div className="card relative overflow-hidden py-3 px-4">
    {isLive && (
      <div className="absolute top-0 right-0 px-2 py-0.5 bg-success/10 text-success text-[9px] font-black uppercase tracking-tighter border-b border-l border-success/20 rounded-bl-lg">
        Live
      </div>
    )}
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-3">
        <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
          <Icon size={16} />
        </div>
        <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest">{title}</p>
      </div>
      {trend && (
        <div className={cn(
          "flex items-center space-x-1 text-xs font-bold",
          trend === 'up' ? "text-success" : "text-danger"
        )}>
          {trend === 'up' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
    <div className="flex items-baseline justify-between">
      <h3 className="text-xl font-black tabular-nums tracking-tight">{value}</h3>
      <p className="text-[10px] text-text-secondary font-bold uppercase tracking-tighter">{subValue}</p>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { holdings, transactions, watchlist, addToWatchlist, removeFromWatchlist, loading: isPortfolioLoading } = usePortfolio();
  const { stocks, dataSource } = useMarket();
  const { formatCurrency, formatPercent } = useFormatters();

  const [timeRange, setTimeRange] = useState('1M');
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [realHistory, setRealHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [apiStatus, setApiStatus] = useState({ apiKeyConfigured: true });
  const [marketOutlook, setMarketOutlook] = useState(null);
  const [isOutlookLoading, setIsOutlookLoading] = useState(false);
  const [assetNews, setAssetNews] = useState([]);
  const [isAssetNewsLoading, setIsAssetNewsLoading] = useState(false);

  const isLive = dataSource === 'live';

  const stats = useMemo(() => {
    if (isPortfolioLoading) return null;
    const portfolioValue = holdings.reduce((acc, h) => {
      const stock = stocks.find(s => s.id === h.stockId);
      return acc + (stock ? stock.currentPrice * h.shares : 0);
    }, 0);

    const totalInvested = (holdings || []).reduce((acc, h) => acc + (h.totalInvested || 0), 0);
    const totalPnL = portfolioValue - totalInvested;
    const pnlPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    return {
      portfolioValue,
      cashBalance: user?.balance || 0,
      totalPnL,
      pnlPercent,
      totalAssets: portfolioValue + (user?.balance || 0)
    };
  }, [holdings, stocks, user?.balance, isPortfolioLoading]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        setApiStatus(data);
      } catch (e) {
        console.error("Error checking API status:", e);
      }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    const fetchBenchmarkHistory = async () => {
      setIsLoadingHistory(true);
      try {
        // Use AAPL as a benchmark for the dashboard chart
        const response = await fetch(`/api/stocks/AAPL/history?resolution=D`);
        if (!response.ok) {
          console.warn(`Failed to fetch benchmark data: ${response.status}`);
          setRealHistory([]);
          return;
        }
        
        const data = await response.json();
        if (data.error === 'limited') {
          console.warn("Benchmark data is limited on this API plan");
          setRealHistory([]);
        } else if (data.error) {
          console.warn(`API returned error for benchmark: ${data.error}`);
          setRealHistory([]);
        } else if (Array.isArray(data)) {
          setRealHistory(data);
        } else {
          setRealHistory([]);
        }
      } catch (error) {
        console.error("Error fetching benchmark history:", error);
        setRealHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchBenchmarkHistory();
  }, []);

  const topHoldings = useMemo(() => {
    return holdings
      .map(h => {
        const stock = stocks.find(s => s.id === h.stockId);
        const currentValue = stock ? stock.currentPrice * h.shares : 0;
        return { ...h, stock, currentValue };
      })
      .sort((a, b) => b.currentValue - a.currentValue);
  }, [holdings, stocks]);

  useEffect(() => {
    const fetchOutlook = async () => {
      if (stocks.length === 0) return;
      setIsOutlookLoading(true);
      try {
        const outlook = await getMarketOutlook(stocks);
        setMarketOutlook(outlook);
      } catch (error) {
        console.error("Error fetching market outlook:", error);
      } finally {
        setIsOutlookLoading(false);
      }
    };
    fetchOutlook();
  }, [stocks]);

  useEffect(() => {
    const fetchAssetNews = async () => {
      if (topHoldings.length === 0) return;
      setIsAssetNewsLoading(true);
      try {
        // Fetch news for the top 3 holdings
        const topAssets = topHoldings.slice(0, 3);
        const newsPromises = topAssets.map(h => fetch(`/api/stocks/${h.stockId}/news`).then(r => r.json()));
        const newsResults = await Promise.all(newsPromises);
        
        // Flatten and take top 5 headlines
        const allHeadlines = newsResults.flat().slice(0, 5);
        if (allHeadlines.length > 0) {
          const analysis = await analyzeNewsSentiment(allHeadlines.map(h => h.headline));
          const analyzedNews = allHeadlines.map((h, i) => ({
            ...h,
            analysis: analysis.results[i]
          }));
          setAssetNews(analyzedNews);
        }
      } catch (error) {
        console.error("Error fetching asset news:", error);
      } finally {
        setIsAssetNewsLoading(false);
      }
    };
    fetchAssetNews();
  }, [topHoldings.length]);

  // Filter history based on timeRange
  const chartData = useMemo(() => {
    // Use real history if available, otherwise fallback to mock
    let data = realHistory.length > 0 ? realHistory : (mockPriceHistory['AAPL'] || []);
    
    let days = 30;
    if (timeRange === '1W') days = 7;
    else if (timeRange === '3M') days = 90;
    else if (timeRange === 'ALL') days = 180;

    data = data.slice(-days);
    
    const firstValue = data[0]?.close || 0;
    const lastValue = data[data.length - 1]?.close || 0;
    const isPositive = lastValue >= firstValue;
    
    return { data, isPositive };
  }, [realHistory, timeRange]);

  const sectorData = useMemo(() => {
    const sectors = {};
    holdings.forEach(h => {
      const stock = stocks.find(s => s.id === h.stockId);
      const sector = stock?.sector || 'Other';
      const value = stock ? stock.currentPrice * h.shares : 0;
      sectors[sector] = (sectors[sector] || 0) + value;
    });
    return Object.entries(sectors).map(([name, value]) => ({ name, value }));
  }, [holdings, stocks]);

  const recentTransactions = useMemo(() => transactions.slice(0, 10), [transactions]);
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const toggleWatchlist = (e, stockId) => {
    e.preventDefault();
    e.stopPropagation();
    if (watchlist.includes(stockId)) {
      removeFromWatchlist(stockId);
    } else {
      addToWatchlist(stockId);
    }
  };

  if (isPortfolioLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[400px] rounded-2xl" />
          <Skeleton className="h-[400px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8 pb-12">
      <Ticker />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-5xl font-black tracking-tighter uppercase italic">Terminal</h1>
          <p className="text-text-secondary text-base font-medium">Welcome back, {user?.name}. Market is currently <span className="text-success font-bold">Open</span>.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsWalletOpen(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Wallet size={18} />
            <span>Manage Funds</span>
          </button>
          <Link to="/market" className="btn-primary flex items-center space-x-2">
            <TrendingUp size={18} />
            <span>Trade Now</span>
          </Link>
        </div>
      </div>

      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />

      <div className="bento-grid">
        {/* Left Column: Stats Stacked */}
        <div className="lg:col-span-3 col-span-12 flex flex-col gap-4">
          <StatCard 
            title="Portfolio" 
            value={formatCurrency(stats.portfolioValue)} 
            subValue="Market Value"
            icon={PieChartIcon}
            trend="up"
            trendValue="2.4%"
            isLive={isLive}
          />
          <StatCard 
            title="Cash" 
            value={formatCurrency(stats.cashBalance)} 
            subValue="Available"
            icon={Wallet}
          />
          <StatCard 
            title="P&L" 
            value={formatCurrency(stats.totalPnL)} 
            subValue={formatPercent(stats.pnlPercent)}
            icon={Activity}
            trend={stats.totalPnL >= 0 ? 'up' : 'down'}
            trendValue={formatPercent(Math.abs(stats.pnlPercent))}
            isLive={isLive}
          />
          <StatCard 
            title="Assets" 
            value={formatCurrency(stats.totalAssets)} 
            subValue="Total Net"
            icon={DollarSign}
            isLive={isLive}
          />
        </div>

        {/* Right Column: AI Market Intelligence Section */}
        <div className="lg:col-span-9 col-span-12">
          <div className="card h-full relative overflow-hidden group border-primary/20 bg-gradient-to-br from-surface to-primary/5">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity size={120} className="text-primary" />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <Activity size={18} />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-widest">Market Insights</h3>
                </div>
                {(isOutlookLoading || isAssetNewsLoading) && (
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black text-primary animate-pulse uppercase">Processing Data</span>
                    <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {marketOutlook ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-3 bg-background/40 rounded-xl border border-border/50">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Sentiment</p>
                      <span className={cn(
                        "text-lg font-black italic uppercase italic tracking-tighter",
                        marketOutlook.sentiment === 'Bullish' ? "text-success" : 
                        marketOutlook.sentiment === 'Bearish' ? "text-danger" : "text-warning"
                      )}>
                        {marketOutlook.sentiment}
                      </span>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Insight Score</p>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 h-1.5 bg-border rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-1000" 
                            style={{ width: `${marketOutlook.aiScore}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-black tabular-nums">{marketOutlook.aiScore}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute -left-3 top-0 bottom-0 w-1 bg-primary/20 rounded-full"></div>
                    <p className="text-sm font-medium leading-relaxed text-text-primary italic pl-2">
                      "{marketOutlook.summary}"
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-success/5 rounded-xl border border-success/10 hover:bg-success/10 transition-colors">
                      <div className="flex items-center space-x-2 mb-2">
                        <Target size={14} className="text-success" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-success">Alpha Ops</span>
                      </div>
                      <p className="text-[11px] text-text-secondary font-medium leading-tight">{marketOutlook.opportunities[0]}</p>
                    </div>
                    <div className="p-3 bg-danger/5 rounded-xl border border-danger/10 hover:bg-danger/10 transition-colors">
                      <div className="flex items-center space-x-2 mb-2">
                        <ShieldAlert size={14} className="text-danger" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-danger">Risk Vectors</span>
                      </div>
                      <p className="text-[11px] text-text-secondary font-medium leading-tight">{marketOutlook.risks[0]}</p>
                    </div>
                  </div>

                  {/* Asset Related News Section */}
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-text-secondary flex items-center space-x-2">
                        <Zap size={12} className="text-warning" />
                        <span>Portfolio Asset Insights</span>
                      </h4>
                      <span className="text-[9px] font-black text-text-secondary/50 uppercase">Live Impact</span>
                    </div>
                    <div className="space-y-4">
                      {assetNews.length > 0 ? (
                        assetNews.map((news, idx) => (
                          <div key={idx} className="group/news relative pl-4">
                            <div className={cn(
                              "absolute left-0 top-1 bottom-1 w-0.5 rounded-full transition-all group-hover/news:w-1",
                              news.analysis?.sentiment === 'positive' ? "bg-success" : 
                              news.analysis?.sentiment === 'negative' ? "bg-danger" : "bg-text-secondary/30"
                            )}></div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-[12px] font-bold leading-tight group-hover/news:text-primary transition-colors line-clamp-2">
                                  {news.headline}
                                </p>
                                <div className="flex items-center space-x-2">
                                  <span className="text-[9px] font-black text-text-secondary/60 uppercase tracking-tighter">{news.source}</span>
                                  {news.analysis?.explanation && (
                                    <span className="text-[9px] font-medium text-text-secondary/40 italic line-clamp-1">— {news.analysis?.explanation}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end shrink-0">
                                <span className={cn(
                                  "badge scale-75 origin-right",
                                  news.analysis?.sentiment === 'positive' ? "badge-success" : 
                                  news.analysis?.sentiment === 'negative' ? "badge-danger" : "bg-border/20 text-text-secondary"
                                )}>
                                  {news.analysis?.sentiment || 'neutral'}
                                </span>
                                {news.analysis?.score !== undefined && (
                                  <span className="text-[9px] font-black tabular-nums text-text-secondary/50 mt-1">
                                    {news.analysis?.score > 0 ? '+' : ''}{news.analysis?.score?.toFixed(1)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-8 text-center flex flex-col items-center justify-center space-y-2 opacity-30">
                          <Info size={20} />
                          <p className="text-[10px] font-black uppercase tracking-widest">No asset news available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="relative">
                    <Activity size={48} className="text-primary/20 animate-pulse" />
                    <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-text-secondary animate-pulse">Analyzing Market Data...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Chart Section */}
        <div className="bento-item bento-item-8">
          <div className="card p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-bold uppercase tracking-widest">Performance</h3>
                <span className={cn(
                  "badge",
                  realHistory.length > 0 ? "badge-success" : 
                  !apiStatus.apiKeyConfigured ? "badge-danger" :
                  "bg-warning/10 text-warning border-warning/20"
                )}>
                  {realHistory.length > 0 ? 'Live' : !apiStatus.apiKeyConfigured ? 'Offline' : 'Simulated'}
                </span>
              </div>
              <div className="flex bg-background rounded-lg p-1 border border-border">
                {['1W', '1M', '3M', 'ALL'].map(t => (
                  <button 
                    key={t} 
                    onClick={() => setTimeRange(t)}
                    className={cn(
                      "px-3 py-1 text-xs font-black rounded-md transition-all uppercase",
                      t === timeRange ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-secondary hover:text-text-primary"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[400px] w-full relative">
              {isLoadingHistory && (
                <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-xl">
                  <Skeleton className="w-full h-full" />
                </div>
              )}
              <TradingChart 
                data={chartData.data} 
                type="candlestick" 
              />
            </div>
          </div>
        </div>

        {/* Watchlist / Active Positions */}
        <div className="bento-item bento-item-4">
          <div className="card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold uppercase tracking-widest">Positions</h3>
              <Link to="/portfolio" className="text-xs font-black text-primary hover:underline uppercase tracking-widest">View All</Link>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {topHoldings.length > 0 ? (
                topHoldings.map((h) => (
                  <Link 
                    to={`/market/${h.stockId}`}
                    key={h.stockId} 
                    className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl group-hover:scale-110 transition-transform duration-300">{h.stock?.logo}</div>
                      <div>
                        <p className="font-bold leading-none text-base">{h.stockId}</p>
                        <p className="text-xs text-text-secondary mt-1 font-bold uppercase tracking-tighter">{h.shares} Shares</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <Sparkline 
                        data={mockPriceHistory[h.stockId]?.slice(-10).map(p => p.close)} 
                        isPositive={h.currentValue >= h.totalInvested}
                      />
                      <div className="text-right">
                        <p className="font-bold tabular-nums text-base">{formatCurrency(h.currentValue)}</p>
                        <div className={cn(
                          "flex items-center justify-end space-x-1 text-xs font-black",
                          h.currentValue >= h.totalInvested ? "text-success" : "text-danger"
                        )}>
                          {h.currentValue >= h.totalInvested ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          <span>{formatPercent(((h.currentValue - h.totalInvested) / h.totalInvested) * 100)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions on Hover */}
                    <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-2 translate-x-full group-hover:translate-x-0 transition-transform bg-gradient-to-l from-surface via-surface to-transparent pl-8">
                      <button className="p-1.5 bg-success/10 text-success rounded-lg hover:bg-success hover:text-white transition-colors">
                        <PlusCircle size={14} />
                      </button>
                      <button className="p-1.5 bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-colors">
                        <MinusCircle size={14} />
                      </button>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-12 text-center flex-1 flex flex-col items-center justify-center">
                  <Briefcase className="text-text-secondary opacity-20 mb-3" size={48} />
                  <p className="text-text-secondary text-sm font-bold uppercase tracking-widest">No positions</p>
                  <Link to="/market" className="text-primary text-xs font-black mt-4 uppercase tracking-widest border border-primary/20 px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors">Start Trading</Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sector Allocation */}
        <div className="bento-item bento-item-4">
          <div className="card p-6 h-full">
            <h3 className="text-xl font-bold uppercase tracking-widest mb-6">Allocation</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sectorData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {sectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0D1117', border: '1px solid #1F2937', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: '#F9FAFB', fontSize: '10px', fontWeight: 'bold' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {sectorData.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-xs font-bold uppercase tracking-tighter">
                  <div className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                    <span className="text-text-secondary">{s.name}</span>
                  </div>
                  <span className="tabular-nums">{formatPercent((s.value / stats.portfolioValue) * 100)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trading History */}
        <div className="bento-item bento-item-5">
          <div className="card p-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold uppercase tracking-widest">Recent Activity</h3>
              <Link to="/history" className="text-xs font-black text-primary hover:underline uppercase tracking-widest">Full History</Link>
            </div>
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      tx.type === 'BUY' ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                    )}>
                      {tx.type === 'BUY' ? <PlusCircle size={14} /> : <MinusCircle size={14} />}
                    </div>
                    <div>
                      <p className="font-bold text-base leading-none">{tx.stockId}</p>
                      <p className="text-xs text-text-secondary mt-1 font-bold uppercase tracking-tighter">{tx.shares} @ {formatCurrency(tx.price)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums text-base">{formatCurrency(tx.total)}</p>
                    <p className="text-[11px] text-text-secondary font-bold uppercase tracking-widest">{new Date(tx.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                <div className="py-12 text-center text-text-secondary text-xs font-bold uppercase tracking-widest opacity-50">No activity yet</div>
              )}
            </div>
          </div>
        </div>

        {/* Sentiment */}
        <div className="bento-item bento-item-3">
          <div className="card p-6 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold uppercase tracking-widest mb-6">Sentiment</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-text-secondary uppercase tracking-widest">Overall Mood</span>
                  <span className={cn(
                    "badge",
                    marketOutlook?.sentiment === 'Bullish' ? "badge-success" : 
                    marketOutlook?.sentiment === 'Bearish' ? "badge-danger" : "bg-warning/10 text-warning border-warning/20"
                  )}>
                    {marketOutlook?.sentiment || 'Neutral'}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest">
                    <span className="text-danger">Fear</span>
                    <span className="text-success">Greed</span>
                  </div>
                  <div className="h-4 bg-background border border-border rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-danger via-warning to-success rounded-full transition-all duration-1000" 
                      style={{ width: `${marketOutlook?.aiScore || 50}%` }}
                    ></div>
                  </div>
                  <p className="text-center text-xs font-black text-text-secondary uppercase tracking-widest mt-2">
                    Index Score: {marketOutlook?.aiScore || 50}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="flex items-center space-x-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Star size={16} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-primary">Pro Tip</p>
                  <p className="text-[12px] text-text-secondary font-medium leading-tight mt-0.5">
                    {marketOutlook?.proTip || "Diversify your tech holdings with some energy stocks to reduce volatility."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
