import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { useMarket } from '../../context/MarketContext';
import { 
  TrendingUp, TrendingDown, PieChart as PieChartIcon, 
  Activity, Wallet, Briefcase, ShieldCheck, AlertTriangle,
  RefreshCw, Star
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import WalletModal from '../../components/WalletModal';
import { useFormatters } from '../../hooks/useFormatters';

const Portfolio = () => {
  const { user } = useAuth();
  const { holdings, watchlist, addToWatchlist, removeFromWatchlist, loading: isPortfolioLoading } = usePortfolio();
  const { stocks } = useMarket();
  const { formatCurrency, formatPercent } = useFormatters();
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  const handleRebalance = () => {
    if (holdings.length === 0) {
      toast.error('No holdings to rebalance');
      return;
    }
    
    setIsRebalancing(true);
    toast.loading('Analyzing portfolio weights...', { id: 'rebalance' });
    
    setTimeout(() => {
      toast.success('Portfolio successfully rebalanced to target weights!', { id: 'rebalance' });
      setIsRebalancing(false);
    }, 2000);
  };

  const toggleWatchlist = (e, stockId) => {
    e.preventDefault();
    e.stopPropagation();
    if (watchlist.includes(stockId)) {
      removeFromWatchlist(stockId);
    } else {
      addToWatchlist(stockId);
    }
  };

  const portfolioStats = useMemo(() => {
    if (isPortfolioLoading) return null;
    const enrichedHoldings = holdings.map(h => {
      const stock = stocks.find(s => s.id === h.stockId);
      const currentValue = stock ? stock.currentPrice * h.shares : 0;
      const pnl = currentValue - h.totalInvested;
      const pnlPercent = h.totalInvested > 0 ? (pnl / h.totalInvested) * 100 : 0;
      const dayChange = stock ? stock.change * h.shares : 0;
      return { ...h, stock, currentValue, pnl, pnlPercent, dayChange };
    });

    const totalValue = enrichedHoldings.reduce((acc, h) => acc + h.currentValue, 0);
    const totalInvested = enrichedHoldings.reduce((acc, h) => acc + h.totalInvested, 0);
    const totalLiability = enrichedHoldings.reduce((acc, h) => acc + (h.loan?.amount || 0), 0);
    const totalPnL = totalValue - totalInvested;
    const totalPnLPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
    const totalDayChange = enrichedHoldings.reduce((acc, h) => acc + h.dayChange, 0);

    return {
      enrichedHoldings,
      totalValue,
      totalInvested,
      totalLiability,
      totalPnL,
      totalPnLPercent,
      totalDayChange,
      totalAssets: totalValue + (user?.balance || 0) - totalLiability
    };
  }, [holdings, stocks, user?.balance, isPortfolioLoading]);

  const allocationData = useMemo(() => {
    if (!portfolioStats) return [];
    return portfolioStats.enrichedHoldings.map(h => ({
      name: h.stockId,
      value: h.currentValue
    })).sort((a, b) => b.value - a.value);
  }, [portfolioStats]);

  const sectorData = useMemo(() => {
    if (!portfolioStats) return [];
    const sectors = {};
    portfolioStats.enrichedHoldings.forEach(h => {
      const sector = h.stock?.sector || 'Unknown';
      sectors[sector] = (sectors[sector] || 0) + h.currentValue;
    });
    return Object.entries(sectors).map(([name, value]) => ({ name, value }));
  }, [portfolioStats]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  const dynamicInsights = useMemo(() => {
    if (!portfolioStats || portfolioStats.enrichedHoldings.length === 0) return [];
    
    const insights = [];
    const { enrichedHoldings, totalValue, totalLiability } = portfolioStats;

    // 1. Sector Concentration
    if (sectorData.length > 0) {
      const sortedSectors = [...sectorData].sort((a, b) => b.value - a.value);
      const topSector = sortedSectors[0];
      const concentration = (topSector.value / totalValue) * 100;

      if (concentration > 40) {
        insights.push({
          title: "Concentration Warning",
          text: `Your portfolio is ${concentration.toFixed(1)}% concentrated in the ${topSector.name} sector. Consider diversifying to reduce risk.`,
          type: "warning"
        });
      }
    }

    // 2. Performance Insights
    const sortedByPnL = [...enrichedHoldings].sort((a, b) => b.pnlPercent - a.pnlPercent);
    const topPerformer = sortedByPnL[0];
    const worstPerformer = sortedByPnL[sortedByPnL.length - 1];

    if (topPerformer && topPerformer.pnlPercent > 5) {
      insights.push({
        title: "Top Performer",
        text: `${topPerformer.stockId} is your best performing asset with a ${topPerformer.pnlPercent.toFixed(1)}% gain.`,
        type: "success"
      });
    }

    if (worstPerformer && worstPerformer.pnlPercent < -5) {
      insights.push({
        title: "Underperformer",
        text: `${worstPerformer.stockId} is currently down ${Math.abs(worstPerformer.pnlPercent).toFixed(1)}%. Review its fundamentals.`,
        type: "danger"
      });
    }

    // 3. Margin Risk
    if (totalLiability > 0) {
      const marginRatio = (totalLiability / totalValue) * 100;
      insights.push({
        title: "Margin Exposure",
        text: `You are using ${formatCurrency(totalLiability)} in borrowed funds (${marginRatio.toFixed(1)}% of portfolio). Watch for liquidation risks.`,
        type: "warning"
      });
    }

    // 4. Diversification
    if (enrichedHoldings.length < 3) {
      insights.push({
        title: "Low Diversification",
        text: "You only hold " + enrichedHoldings.length + " assets. Adding more stocks can help spread risk.",
        type: "info"
      });
    }

    // Fallback if no specific insights
    if (insights.length === 0) {
      insights.push({
        title: "Portfolio Health",
        text: "Your portfolio is well-balanced. Keep monitoring your positions for any significant changes.",
        type: "info"
      });
    }

    return insights.slice(0, 2); // Show top 2 insights
  }, [portfolioStats, sectorData, formatCurrency]);

  const riskStats = useMemo(() => {
    if (!portfolioStats || portfolioStats.enrichedHoldings.length === 0) {
      return { score: 0, label: 'N/A', beta: '0.00', color: 'text-text-secondary' };
    }

    const { enrichedHoldings, totalValue, totalLiability } = portfolioStats;
    
    // 1. Beta calculation (weighted average)
    const totalBeta = enrichedHoldings.reduce((acc, h) => {
      const beta = h.stock?.beta || 1.0;
      return acc + (beta * (h.currentValue / totalValue));
    }, 0);

    // 2. Diversification Label
    let divLabel = 'Poor';
    const numHoldings = enrichedHoldings.length;
    const numSectors = sectorData.length;
    
    if (numHoldings >= 8 && numSectors >= 4) divLabel = 'Excellent';
    else if (numHoldings >= 5 && numSectors >= 3) divLabel = 'Good';
    else if (numHoldings >= 3) divLabel = 'Fair';

    // 3. Risk Score (0-100)
    // Factors: Concentration, Leverage, Volatility (Beta)
    let score = 0;
    
    // Concentration factor (0-40 points)
    const sortedSectors = [...sectorData].sort((a, b) => b.value - a.value);
    const topSectorWeight = sortedSectors[0] ? (sortedSectors[0].value / totalValue) : 1;
    score += topSectorWeight * 40;

    // Leverage factor (0-30 points)
    const leverageRatio = totalLiability / totalValue;
    score += Math.min(leverageRatio * 60, 30); // Max 30 points if leverage is 50%

    // Beta factor (0-30 points)
    score += Math.min(Math.max(totalBeta - 0.5, 0) * 20, 30);

    let riskColor = 'text-success';
    if (score > 70) riskColor = 'text-danger';
    else if (score > 40) riskColor = 'text-warning';

    return {
      score: Math.round(score),
      label: divLabel,
      beta: totalBeta.toFixed(2),
      color: riskColor,
      level: score > 70 ? 'High' : score > 40 ? 'Medium' : 'Low'
    };
  }, [portfolioStats, sectorData]);

  if (isPortfolioLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-surface border border-border rounded-2xl animate-pulse" />)}
        </div>
        <div className="h-96 bg-surface border border-border rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!portfolioStats) return null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Portfolio</h1>
          <p className="text-text-secondary">Manage your assets, track performance, and analyze risk.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsWalletOpen(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Wallet size={18} />
            <span>Manage Funds</span>
          </button>
          <button 
            onClick={handleRebalance}
            disabled={isRebalancing}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw size={18} className={cn(isRebalancing && "animate-spin")} />
            <span>{isRebalancing ? 'Rebalancing...' : 'Rebalance'}</span>
          </button>
          <Link to="/market" className="btn-primary">Add Assets</Link>
        </div>
      </div>

      <WalletModal isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="card">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Total Value</p>
          <h3 className="text-3xl font-bold tabular-nums">{formatCurrency(portfolioStats.totalValue)}</h3>
          <div className={cn(
            "flex items-center space-x-1 text-sm font-bold mt-1",
            portfolioStats.totalDayChange >= 0 ? "text-success" : "text-danger"
          )}>
            {portfolioStats.totalDayChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            <span>{formatCurrency(Math.abs(portfolioStats.totalDayChange))} today</span>
          </div>
        </div>
        <div className="card">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Total P&L</p>
          <h3 className="text-3xl font-bold tabular-nums">{formatCurrency(portfolioStats.totalPnL)}</h3>
          <p className={cn(
            "text-sm font-bold mt-1",
            portfolioStats.totalPnL >= 0 ? "text-success" : "text-danger"
          )}>
            {formatPercent(portfolioStats.totalPnLPercent)} all-time
          </p>
        </div>
        <div className="card">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Loan Liability</p>
          <h3 className="text-3xl font-bold tabular-nums text-warning">{formatCurrency(portfolioStats.totalLiability)}</h3>
          <p className="text-sm text-text-secondary mt-1">Automatic repayment</p>
        </div>
        <div className="card">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Cash Balance</p>
          <h3 className="text-3xl font-bold tabular-nums">{formatCurrency(user?.balance || 0)}</h3>
          <p className="text-sm text-text-secondary mt-1">Ready to invest</p>
        </div>
        <div className="card">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Buying Power</p>
          <h3 className="text-3xl font-bold tabular-nums">{formatCurrency((user?.balance || 0) * 3)}</h3>
          <p className="text-sm text-warning font-bold mt-1">3x Leverage Enabled</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-6">Asset Allocation</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px' }}
                  itemStyle={{ color: '#F9FAFB' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend verticalAlign="middle" align="right" layout="vertical" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-bold mb-6">Sector Diversification</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sectorData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {sectorData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', borderRadius: '8px' }}
                  itemStyle={{ color: '#F9FAFB' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend verticalAlign="middle" align="right" layout="vertical" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-bold">Current Holdings</h3>
          <div className="flex items-center space-x-2 text-xs text-text-secondary">
            <Activity size={14} />
            <span>Prices update every 3s</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Stock</th>
                <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Shares</th>
                <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Avg Price</th>
                <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Current Price</th>
                <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Market Value</th>
                <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">P&L</th>
                <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {portfolioStats.enrichedHoldings.map((h) => (
                <tr key={h.stockId} className="hover:bg-border/20 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <button 
                        onClick={(e) => toggleWatchlist(e, h.stockId)}
                        className={cn(
                          "transition-colors",
                          watchlist.includes(h.stockId) ? "text-warning" : "text-text-secondary hover:text-warning"
                        )}
                      >
                        <Star size={16} fill={watchlist.includes(h.stockId) ? "currentColor" : "none"} />
                      </button>
                      <Link to={`/market/${h.stockId}`} className="flex items-center space-x-3 group">
                        <span className="text-2xl">{h.stock?.logo}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-bold group-hover:text-primary transition-colors text-base">{h.stockId}</p>
                            {h.loan && (
                              <span className="bg-warning/10 text-warning text-[10px] font-black px-1.5 py-0.5 rounded border border-warning/20 uppercase tracking-tighter">
                                Margin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-text-secondary">{h.stock?.name}</p>
                        </div>
                      </Link>
                    </div>
                  </td>
                  <td className="p-4 tabular-nums font-medium">
                    {h.shares}
                    {h.loan && (
                      <p className="text-[10px] text-warning font-bold">
                        Borrowed: {formatCurrency(h.loan.amount)}
                      </p>
                    )}
                  </td>
                  <td className="p-4 tabular-nums text-text-secondary">{formatCurrency(h.avgBuyPrice)}</td>
                  <td className="p-4 tabular-nums font-bold">{formatCurrency(h.stock?.currentPrice || 0)}</td>
                  <td className="p-4 tabular-nums font-bold">{formatCurrency(h.currentValue)}</td>
                  <td className="p-4">
                    <div className={cn(
                      "font-bold tabular-nums text-base",
                      h.pnl >= 0 ? "text-success" : "text-danger"
                    )}>
                      <p>{formatCurrency(h.pnl)}</p>
                      <p className="text-xs">{formatPercent(h.pnlPercent)}</p>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button className="btn-secondary py-1 px-3 text-xs uppercase tracking-widest font-bold">Sell</button>
                      <button className="btn-primary py-1 px-3 text-xs uppercase tracking-widest font-bold">Buy More</button>
                    </div>
                  </td>
                </tr>
              ))}
              {portfolioStats.enrichedHoldings.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center">
                    <div className="flex flex-col items-center text-text-secondary">
                      <Briefcase size={48} className="mb-4 opacity-20" />
                      <p className="text-lg font-medium">Your portfolio is empty</p>
                      <p className="text-sm">Start trading to see your holdings here.</p>
                      <Link to="/market" className="btn-primary mt-6">Go to Market</Link>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="card p-6 space-y-6">
          <h3 className="text-lg font-bold flex items-center space-x-2">
            <ShieldCheck className="text-primary" size={20} />
            <span>Risk Analysis</span>
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Portfolio Risk Score</span>
              <span className={cn("font-bold", riskStats.color)}>
                {riskStats.level} ({riskStats.score}/100)
              </span>
            </div>
            <div className="h-2 bg-background rounded-full overflow-hidden">
              <div className={cn(
                "h-full transition-all duration-500",
                riskStats.score > 70 ? "bg-danger" : riskStats.score > 40 ? "bg-warning" : "bg-success"
              )} style={{ width: `${riskStats.score}%` }}></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Diversification</span>
              <span className="font-bold text-primary">{riskStats.label}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-secondary">Beta (Volatility)</span>
              <span className="font-bold">{riskStats.beta}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-bold mb-6 flex items-center space-x-2">
            <AlertTriangle className="text-warning" size={20} />
            <span>Portfolio Insights</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dynamicInsights.map((insight, idx) => (
              <div key={idx} className="p-4 bg-background border border-border rounded-xl">
                <h4 className={cn(
                  "font-bold text-sm mb-2",
                  insight.type === 'warning' ? "text-warning" :
                  insight.type === 'danger' ? "text-danger" :
                  insight.type === 'success' ? "text-success" : "text-primary"
                )}>
                  {insight.title}
                </h4>
                <p className="text-xs text-text-secondary">{insight.text}</p>
              </div>
            ))}
            {dynamicInsights.length === 0 && (
              <div className="col-span-2 py-8 text-center text-text-secondary text-sm italic">
                No specific insights available at this time.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
