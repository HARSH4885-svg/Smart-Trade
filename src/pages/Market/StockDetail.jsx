import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarket } from '../../context/MarketContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { mockPriceHistory } from '../../data/mockPriceHistory';
import { newsData } from '../../data/newsData';
import { 
  TrendingUp, TrendingDown, Star, ArrowLeft, Info, Activity, 
  BarChart3, Globe, Clock, ShieldCheck, Zap
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ComposedChart, Line
} from 'recharts';
import { cn } from '../../lib/utils';
import TradeModal from '../../components/trading/TradeModal';
import TradingChart from '../../components/charts/TradingChart';
import Skeleton from '../../components/common/Skeleton';
import { getStockPrediction, analyzeNewsSentiment } from '../../services/geminiService';
import { toast } from 'react-hot-toast';
import { useFormatters } from '../../hooks/useFormatters';
import { ChevronRight, ChevronLeft, Settings, Layers, MousePointer2 } from 'lucide-react';
import { useScalping } from '../../hooks/useScalping';
import ScalpingPanel from '../../components/scalping/ScalpingPanel';

const StockDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { stocks } = useMarket();
  const { watchlist, addToWatchlist, removeFromWatchlist, holdings } = usePortfolio();
  const { formatCurrency, formatPercent, formatDate, formatCompactCurrency } = useFormatters();
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('1M');
  const [showML, setShowML] = useState(false);
  const [showSMA, setShowSMA] = useState(false);
  const [hoverData, setHoverData] = useState(null);
  const [aiPrediction, setAiPrediction] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [realHistory, setRealHistory] = useState([]);
  const [realNews, setRealNews] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [apiStatus, setApiStatus] = useState({ apiKeyConfigured: true });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [crosshairMode, setCrosshairMode] = useState(1);
  const [chartType, setChartType] = useState('candlestick');
  const [isAnalyzingNews, setIsAnalyzingNews] = useState(false);
  const [newsAnalysis, setNewsAnalysis] = useState(null);

  const scalping = useScalping(id);
  const { isEnabled: isScalpingEnabled, microHistory, currentPrice: scalpPrice, markers: scalpMarkers } = scalping;

  const stock = stocks.find(s => s.id === id);
  // Use scalping data if enabled, otherwise real history, then fallback to mock
  const history = isScalpingEnabled 
    ? microHistory 
    : (realHistory.length > 0 ? realHistory : (mockPriceHistory[id] || []));
  
  const news = realNews.length > 0 ? realNews : (newsData[id] || []);
  const currentHolding = holdings.find(h => h.stockId === id);

  const handleCrosshairMove = React.useCallback((data) => {
    setHoverData(data);
  }, []);

  const chartColors = useMemo(() => ({
    showSMA,
    showML,
    mlPredictions: aiPrediction?.predictions,
    onCrosshairMove: handleCrosshairMove,
    markers: isScalpingEnabled ? scalpMarkers : []
  }), [showSMA, showML, aiPrediction?.predictions, handleCrosshairMove, isScalpingEnabled, scalpMarkers]);

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
    const fetchStockData = async () => {
      if (!id) return;
      setIsLoadingData(true);
      try {
        // Determine resolution based on timeRange
        let resolution = 'D';
        if (timeRange === '1D') resolution = '5';
        else if (timeRange === '5D') resolution = '30';
        else if (timeRange === '1W') resolution = '60';

        const [historyRes, newsRes] = await Promise.all([
          fetch(`/api/stocks/${id}/history?resolution=${resolution}`),
          fetch(`/api/stocks/${id}/news`)
        ]);
        
        if (historyRes.status === 401 || newsRes.status === 401) {
          console.warn("API Key invalid for history/news, falling back to mock data");
          setRealHistory([]);
          setRealNews([]);
          setIsLoadingData(false);
          return;
        }

        if (!historyRes.ok || !newsRes.ok) {
          throw new Error('Failed to fetch data from API');
        }

        const historyData = await historyRes.json();
        const newsData = await newsRes.json();
        
        if (historyData.error === 'limited') {
          // Silent fallback for plan restrictions
          setRealHistory([]);
        } else if (historyData.error) {
          console.warn(`API returned error for history: ${historyData.error}`);
          setRealHistory([]);
        } else {
          setRealHistory(historyData);
        }

        if (newsData.error) {
          console.warn(`API returned error for news: ${newsData.error}`);
          setRealNews([]);
        } else {
          setRealNews(newsData);
        }
      } catch (error) {
        console.error("Error fetching stock detail data:", error);
        toast.error("Using simulated data due to API limits or connection issues");
        setRealHistory([]);
        setRealNews([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchStockData();
  }, [id, timeRange]);

  const filteredHistory = useMemo(() => {
    let data = history;
    
    // If we are using real history and resolution is 'D', we might need to filter
    // because the backend returns 1 year by default for 'D'
    if (realHistory.length > 0) {
      if (timeRange === '1M') data = history.slice(-30);
      else if (timeRange === '3M') data = history.slice(-90);
      else if (timeRange === '1W' && history.length > 7) data = history.slice(-7);
    }
    
    if (data.length === 0) return { data: [], isPositive: true };

    const firstPrice = data[0].close;
    const lastPrice = data[data.length - 1].close;
    const isPositive = lastPrice >= firstPrice;

    return { data, isPositive };
  }, [history, realHistory.length, timeRange]);

  // Mock ML Prediction
  const mlPrediction = useMemo(() => {
    const lastPrice = stock?.currentPrice || 0;
    const trend = Math.random() > 0.4 ? 'upward' : 'downward';
    const predictions = Array.from({ length: 7 }, (_, i) => {
      const change = lastPrice * (Math.random() * 0.05) * (trend === 'upward' ? 1 : -1);
      return {
        date: `Day +${i + 1}`,
        price: lastPrice + change
      };
    });
    return { predictions, trend, confidence: 74 };
  }, [stock]);

  const toggleWatchlist = () => {
    if (watchlist.includes(stock?.id)) {
      removeFromWatchlist(stock.id);
    } else if (stock) {
      addToWatchlist(stock.id);
    }
  };

  const handleAiToggle = async () => {
    if (!showML && !aiPrediction && stock) {
      setIsAiLoading(true);
      try {
        const prediction = await getStockPrediction(stock, history);
        setAiPrediction(prediction);
        setShowML(true);
        toast.success('Analysis Complete');
      } catch (error) {
        toast.error('Failed to generate prediction');
        console.error(error);
      } finally {
        setIsAiLoading(false);
      }
    } else {
      setShowML(!showML);
    }
  };

  const handleAnalyzeNews = async () => {
    if (news.length === 0) return;
    setIsAnalyzingNews(true);
    try {
      const headlines = news.slice(0, 5).map(n => n.headline);
      const analysis = await analyzeNewsSentiment(headlines);
      setNewsAnalysis(analysis.results);
      toast.success('Sentiment Analyzed');
    } catch (error) {
      toast.error('Failed to analyze sentiment');
      console.error(error);
    } finally {
      setIsAnalyzingNews(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key.toLowerCase() === 'b') {
        if (isScalpingEnabled) scalping.handleTrade('BUY');
        else setIsTradeModalOpen(true);
      } else if (e.key.toLowerCase() === 's') {
        if (isScalpingEnabled) scalping.handleTrade('SELL');
        else setIsTradeModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isScalpingEnabled, scalping, setIsTradeModalOpen]);

  if (!stock) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold">Stock not found</h2>
        <button onClick={() => navigate('/market')} className="btn-primary mt-4">Back to Market</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] -m-4 overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface/50 backdrop-blur-md z-20">
        <div className="flex items-center space-x-6">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-border/50 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="text-4xl">{stock.logo}</div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-black uppercase tracking-tighter">{stock.name}</h1>
                <span className="text-xs font-black bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-widest">
                  {stock.id}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs font-bold text-text-secondary uppercase tracking-widest mt-0.5">
                <span>{stock.exchange}</span>
                <span>•</span>
                <span>{stock.sector}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-8">
          <div className="text-right">
            <p className="text-3xl font-black tabular-nums leading-none">
              {formatCurrency(isScalpingEnabled ? scalpPrice : stock.currentPrice)}
            </p>
            <div className={cn(
              "flex items-center justify-end space-x-1 text-xs font-black mt-1",
              (isScalpingEnabled ? 0 : stock.change) >= 0 ? "text-success" : "text-danger"
            )}>
              {isScalpingEnabled ? (
                <span className="flex items-center space-x-1 text-primary animate-pulse">
                  <Zap size={12} />
                  <span>SCALPING LIVE</span>
                </span>
              ) : (
                <>
                  {stock.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  <span>{formatCurrency(Math.abs(stock.change))} ({formatPercent(stock.changePercent)})</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={toggleWatchlist}
              className={cn(
                "p-2.5 rounded-xl border transition-all",
                watchlist.includes(stock.id) 
                  ? "bg-warning/10 border-warning text-warning" 
                  : "bg-surface border-border text-text-secondary hover:border-text-secondary"
              )}
            >
              <Star size={20} fill={watchlist.includes(stock.id) ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={() => setIsTradeModalOpen(true)}
              className="btn-primary py-2.5 px-8 text-sm font-black uppercase tracking-widest"
            >
              Trade
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Chart Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-background relative overflow-y-auto custom-scrollbar">
          {/* Chart Controls Overlay */}
          <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
            <div className="flex bg-surface/80 backdrop-blur-md rounded-xl p-1 border border-border shadow-xl">
              {['1D', '5D', '1W', '1M', '3M', 'ALL'].map(t => (
                <button 
                  key={t} 
                  onClick={() => setTimeRange(t)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-black rounded-lg transition-all uppercase tracking-tighter",
                    timeRange === t ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {t}
                </button>
              ))}
              <div className="w-px h-4 bg-border mx-1 self-center"></div>
              <button 
                onClick={() => document.getElementById('news-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-3 py-1.5 text-xs font-black rounded-lg text-text-secondary hover:text-primary transition-all uppercase tracking-tighter flex items-center space-x-1"
              >
                <Clock size={12} />
                <span>News</span>
              </button>
            </div>
            
            <div className="flex bg-surface/80 backdrop-blur-md rounded-xl p-1 border border-border shadow-xl opacity-40 hover:opacity-100 transition-opacity group/toolbar">
              <button 
                onClick={() => setCrosshairMode(prev => prev === 1 ? 0 : 1)}
                className={cn(
                  "p-2 transition-colors rounded-lg relative group/btn",
                  crosshairMode === 0 ? "text-primary bg-primary/10" : "text-text-secondary hover:text-primary"
                )}
                title="Toggle Magnet Mode"
              >
                <MousePointer2 size={16} />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-surface border border-border text-[11px] font-black uppercase px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {crosshairMode === 0 ? 'Magnet: ON' : 'Magnet: OFF'}
                </span>
              </button>
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className={cn(
                  "p-2 transition-colors rounded-lg relative group/btn",
                  isSidebarOpen ? "text-primary bg-primary/10" : "text-text-secondary hover:text-primary"
                )}
                title="Toggle Sidebar"
              >
                <Layers size={16} />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-surface border border-border text-[8px] font-black uppercase px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-50">
                  Sidebar
                </span>
              </button>
              <button 
                onClick={() => setChartType(prev => prev === 'candlestick' ? 'area' : 'candlestick')}
                className={cn(
                  "p-2 transition-colors rounded-lg relative group/btn",
                  chartType === 'area' ? "text-primary bg-primary/10" : "text-text-secondary hover:text-primary"
                )}
                title="Toggle Chart Type"
              >
                <Settings size={16} />
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-surface border border-border text-[8px] font-black uppercase px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {chartType === 'candlestick' ? 'Area View' : 'Candles'}
                </span>
              </button>
            </div>
          </div>

          {/* Hover Data Overlay */}
          {hoverData && (
            <div className="absolute top-4 right-4 z-10 bg-surface/80 backdrop-blur-md rounded-xl p-3 border border-border shadow-xl flex items-center space-x-6">
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Open</span>
                <span className="text-sm font-bold tabular-nums">{formatCurrency(hoverData.open || hoverData.price)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">High</span>
                <span className="text-sm font-bold tabular-nums text-success">{formatCurrency(hoverData.high || hoverData.price)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Low</span>
                <span className="text-sm font-bold tabular-nums text-danger">{formatCurrency(hoverData.low || hoverData.price)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">Close</span>
                <span className="text-sm font-bold tabular-nums">{formatCurrency(hoverData.close || hoverData.price)}</span>
              </div>
            </div>
          )}

          {/* Massive Chart */}
          <div className="min-h-[600px] flex-1 relative">
            {isLoadingData && (
              <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-sm flex items-center justify-center">
                <Skeleton className="w-full h-full" />
              </div>
            )}
            <TradingChart 
              data={filteredHistory.data} 
              colors={chartColors}
              crosshairMode={crosshairMode}
              type={chartType}
            />
          </div>

          {/* Bottom Info Bar */}
          <div className="h-12 border-t border-border bg-surface/30 backdrop-blur-sm flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                <span className="text-xs font-black text-text-secondary uppercase tracking-widest">Live Feed</span>
              </div>
              <div className="h-4 w-px bg-border"></div>
              <div className="flex items-center space-x-4">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Vol: {formatCompactCurrency(stock.volume)}</span>
                <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Mkt Cap: {formatCompactCurrency(stock.marketCap)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs font-black text-text-secondary uppercase tracking-widest">Resolution: {timeRange === '1D' ? '5m' : '1D'}</span>
              <span className="text-xs font-black text-text-secondary uppercase tracking-widest">TZ: UTC-7</span>
            </div>
          </div>

          {/* New Prominent News Section */}
          <div id="news-section" className="p-8 border-t border-border bg-surface/10">
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter">Latest News & Analysis</h2>
                  <p className="text-sm text-text-secondary font-medium">Real-time updates and market sentiment for {stock.id}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-widest">Source:</span>
                  <span className="badge badge-primary">Finnhub Real-time</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {news.length > 0 ? (
                  news.map((item) => (
                    <div key={item.id} className="card group hover:border-primary/30 transition-all cursor-pointer">
                      <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-widest">
                              {item.source}
                            </span>
                            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">
                              {formatDate(item.timestamp)}
                            </span>
                          </div>
                          <span className={cn(
                            "badge text-[10px] font-black uppercase tracking-widest",
                            item.sentiment === 'positive' ? "badge-success" : 
                            item.sentiment === 'negative' ? "badge-danger" : "bg-border/20 text-text-secondary"
                          )}>
                            {item.sentiment}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-2 mb-3 leading-tight">
                          {item.headline}
                        </h3>
                        <p className="text-sm text-text-secondary line-clamp-3 mb-4 flex-1">
                          {item.summary || `Market analysis and real-time updates regarding ${stock.name} (${stock.id}) performance in the current trading session.`}
                        </p>
                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1 text-xs font-bold text-text-secondary">
                              <Activity size={14} />
                              <span>Impact: {item.sentimentScore > 0 ? 'High' : 'Moderate'}</span>
                            </div>
                          </div>
                          <a 
                            href={item.url || "#"} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs font-black text-primary uppercase tracking-widest flex items-center space-x-1 group/link"
                          >
                            <span>Read Full Story</span>
                            <ChevronRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center border border-dashed border-border rounded-3xl">
                    <Globe size={48} className="mx-auto mb-4 text-border" />
                    <h3 className="text-lg font-bold text-text-secondary uppercase tracking-widest">No Recent News Found</h3>
                    <p className="text-sm text-text-secondary mt-2">We couldn't find any recent news for {stock.id}. Check back later.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Collapsible Sidebar */}
        <div className={cn(
          "border-l border-border bg-surface/50 backdrop-blur-md transition-all duration-300 flex flex-col",
          isSidebarOpen ? "w-80" : "w-0 overflow-hidden"
        )}>
          <div className="p-6 flex-1 overflow-y-auto space-y-8">
            {/* Scalping Panel */}
            <ScalpingPanel scalping={scalping} />

            {/* Insights Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center space-x-2">
                  <Activity size={14} className="text-primary" />
                  <span>Market Insights</span>
                </h3>
                <button 
                  onClick={handleAiToggle}
                  disabled={isAiLoading}
                  className="text-xs font-black text-primary hover:underline uppercase tracking-widest"
                >
                  {isAiLoading ? 'Analyzing...' : 'Refresh'}
                </button>
              </div>

              {aiPrediction ? (
                <div className="space-y-4">
                  <div className="p-4 bg-background/50 rounded-2xl border border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-text-secondary uppercase tracking-widest">Forecast</span>
                      <span className={cn(
                        "badge",
                        aiPrediction.trend === 'upward' ? "badge-success" : "badge-danger"
                      )}>
                        {aiPrediction.trend}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-3xl font-black tabular-nums">{aiPrediction.confidence}%</div>
                      <div className="text-xs font-bold text-text-secondary uppercase tracking-widest">Confidence</div>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20">
                    <p className="text-xs font-black text-primary uppercase tracking-widest mb-2">Analysis</p>
                    <p className="text-sm text-text-secondary leading-relaxed italic">"{aiPrediction.analysis}"</p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-border rounded-2xl">
                  <Activity size={32} className="text-border mx-auto mb-3" />
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Insights Offline</p>
                  <button 
                    onClick={handleAiToggle}
                    className="mt-4 btn-primary w-full py-2 text-xs font-black uppercase tracking-widest"
                  >
                    Run Analysis
                  </button>
                </div>
              )}
            </div>

            {/* Indicators Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center space-x-2">
                <Activity size={14} className="text-warning" />
                <span>Indicators</span>
              </h3>
              <div className="grid grid-cols-1 gap-2">
                <button 
                  onClick={() => setShowSMA(!showSMA)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border transition-all",
                    showSMA ? "bg-warning/10 border-warning text-warning" : "bg-background/50 border-border text-text-secondary hover:border-text-secondary"
                  )}
                >
                  <span className="text-xs font-black uppercase tracking-widest">SMA 20</span>
                  <div className={cn("w-2 h-2 rounded-full", showSMA ? "bg-warning" : "bg-border")}></div>
                </button>
                <button 
                  className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/50 text-text-secondary opacity-50 cursor-not-allowed"
                >
                  <span className="text-xs font-black uppercase tracking-widest">RSI (14)</span>
                  <div className="w-2 h-2 rounded-full bg-border"></div>
                </button>
              </div>
            </div>

            {/* News Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center space-x-2">
                  <Clock size={14} className="text-primary" />
                  <span>Market News</span>
                </h3>
                <button 
                  onClick={handleAnalyzeNews}
                  disabled={isAnalyzingNews || news.length === 0}
                  className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center space-x-1"
                >
                  <Activity size={10} />
                  <span>{isAnalyzingNews ? 'Analyzing...' : 'Analyze'}</span>
                </button>
              </div>
              <div className="space-y-4">
                {news.slice(0, 5).map((item) => {
                  const aiResult = newsAnalysis?.find(r => r.headline === item.headline);
                  return (
                    <div key={item.id} className="space-y-2 group cursor-pointer p-3 rounded-xl hover:bg-background/50 transition-all border border-transparent hover:border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-text-secondary uppercase tracking-widest">{item.source}</span>
                        <div className="flex items-center space-x-2">
                          {aiResult && (
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-1.5 py-0.5 rounded">AI</span>
                          )}
                          <span className={cn(
                            "badge scale-75 origin-right",
                            (aiResult?.sentiment || item.sentiment) === 'positive' ? "badge-success" : 
                            (aiResult?.sentiment || item.sentiment) === 'negative' ? "badge-danger" : "bg-border/20 text-text-secondary"
                          )}>
                            {aiResult?.sentiment || item.sentiment}
                          </span>
                        </div>
                      </div>
                      <h4 className="text-sm font-bold group-hover:text-primary transition-colors line-clamp-2 leading-snug">{item.headline}</h4>
                      {aiResult && (
                        <div className="mt-2 p-2 bg-primary/5 rounded-lg border border-primary/10 animate-in fade-in slide-in-from-top-1 duration-300">
                          <p className="text-[10px] text-text-secondary leading-tight italic">
                            {aiResult.explanation}
                          </p>
                          <div className="mt-1 flex items-center justify-between">
                            <div className="h-1 flex-1 bg-border rounded-full overflow-hidden mr-2">
                              <div 
                                className={cn(
                                  "h-full transition-all duration-500",
                                  aiResult.score > 0 ? "bg-success" : aiResult.score < 0 ? "bg-danger" : "bg-text-secondary"
                                )}
                                style={{ 
                                  width: `${Math.abs(aiResult.score) * 100}%`,
                                  marginLeft: aiResult.score < 0 ? '0' : '0' // Simplified for now
                                }}
                              ></div>
                            </div>
                            <span className="text-[9px] font-black tabular-nums text-text-secondary">
                              {aiResult.score.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-border bg-surface/50">
            <button 
              onClick={() => setIsTradeModalOpen(true)}
              className="btn-primary w-full py-3 text-sm font-black uppercase tracking-widest flex items-center justify-center space-x-2"
            >
              <span>Execute Order</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Sidebar Toggle Button */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 right-0 z-30 p-1 bg-surface border border-border rounded-l-lg shadow-xl transition-all",
            isSidebarOpen ? "translate-x-0" : "translate-x-0"
          )}
        >
          {isSidebarOpen ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {isTradeModalOpen && (
        <TradeModal 
          stock={stock} 
          isOpen={isTradeModalOpen} 
          onClose={() => setIsTradeModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default StockDetail;
