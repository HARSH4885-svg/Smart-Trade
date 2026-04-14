import React, { useState, useMemo } from 'react';
import { useMarket } from '../../context/MarketContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { Search, Filter, ArrowUpDown, Star, TrendingUp, TrendingDown, LayoutGrid, List } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import TradeModal from '../../components/trading/TradeModal';
import { useFormatters } from '../../hooks/useFormatters';
import LiveTicker from '../../components/LiveTicker';

const Market = () => {
  const { stocks } = useMarket();
  const { watchlist, addToWatchlist, removeFromWatchlist } = usePortfolio();
  const { formatCurrency, formatPercent, formatCompactCurrency } = useFormatters();
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('All');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [selectedStock, setSelectedStock] = useState(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  const sectors = useMemo(() => ['All', ...new Set(stocks.map(s => s.sector))], [stocks]);

  const filteredStocks = useMemo(() => {
    return stocks.filter(stock => {
      const matchesSearch = stock.name.toLowerCase().includes(search.toLowerCase()) || 
                            stock.id.toLowerCase().includes(search.toLowerCase());
      const matchesSector = sectorFilter === 'All' || stock.sector === sectorFilter;
      return matchesSearch && matchesSector;
    });
  }, [stocks, search, sectorFilter]);

  const handleTrade = (stock) => {
    setSelectedStock(stock);
    setIsTradeModalOpen(true);
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

  return (
    <div className="space-y-8">
      <div className="-mx-4 -mt-4 mb-8">
        <LiveTicker />
      </div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Market Explorer</h1>
          <p className="text-text-secondary">Track real-time prices and discover new investment opportunities.</p>
        </div>
        <div className="flex items-center space-x-2 bg-surface p-1 rounded-xl border border-border">
          <button 
            onClick={() => setViewMode('list')}
            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary")}
          >
            <List size={20} />
          </button>
          <button 
            onClick={() => setViewMode('grid')}
            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-primary text-white" : "text-text-secondary hover:text-text-primary")}
          >
            <LayoutGrid size={20} />
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
          <input
            type="text"
            placeholder="Search by name or ticker symbol..."
            className="w-full bg-surface border border-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="text-text-secondary" size={20} />
          <select 
            className="bg-surface border border-border rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
          >
            {sectors.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Ticker</th>
                  <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Name</th>
                  <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Sector</th>
                  <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Price</th>
                  <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Change</th>
                  <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Market Cap</th>
                  <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStocks.map((stock) => (
                  <tr key={stock.id} className="hover:bg-border/20 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <button 
                          onClick={(e) => toggleWatchlist(e, stock.id)}
                          className={cn(
                            "transition-colors",
                            watchlist.includes(stock.id) ? "text-warning" : "text-text-secondary hover:text-warning"
                          )}
                        >
                          <Star size={18} fill={watchlist.includes(stock.id) ? "currentColor" : "none"} />
                        </button>
                        <Link to={`/market/${stock.id}`} className="font-mono font-bold text-primary hover:underline text-base">
                          {stock.id}
                        </Link>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-base">{stock.name}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-background border border-border rounded text-xs font-bold uppercase tracking-wider">
                        {stock.sector}
                      </span>
                    </td>
                    <td className="p-4 tabular-nums font-bold text-base">{formatCurrency(stock.currentPrice)}</td>
                    <td className="p-4">
                      <div className={cn(
                        "flex items-center space-x-1 font-bold tabular-nums text-base",
                        stock.change >= 0 ? "text-success" : "text-danger"
                      )}>
                        {stock.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span>{formatPercent(stock.changePercent)}</span>
                      </div>
                    </td>
                    <td className="p-4 text-text-secondary tabular-nums text-sm">{formatCompactCurrency(stock.marketCap)}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleTrade(stock)}
                        className="btn-primary py-1.5 px-4 text-sm"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStocks.map((stock) => (
            <div key={stock.id} className="card group relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="text-4xl">{stock.logo}</div>
                <button 
                  onClick={(e) => toggleWatchlist(e, stock.id)}
                  className={cn(
                    "p-2 rounded-full hover:bg-border/50 transition-colors",
                    watchlist.includes(stock.id) ? "text-warning" : "text-text-secondary"
                  )}
                >
                  <Star size={20} fill={watchlist.includes(stock.id) ? "currentColor" : "none"} />
                </button>
              </div>
              <Link to={`/market/${stock.id}`}>
                <h3 className="text-xl font-bold group-hover:text-primary transition-colors">{stock.name}</h3>
                <p className="text-sm text-text-secondary font-mono mb-4">{stock.id} • {stock.sector}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold tabular-nums">{formatCurrency(stock.currentPrice)}</p>
                    <div className={cn(
                      "flex items-center space-x-1 text-sm font-bold tabular-nums",
                      stock.change >= 0 ? "text-success" : "text-danger"
                    )}>
                      {stock.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      <span>{formatPercent(stock.changePercent)}</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.preventDefault(); handleTrade(stock); }}
                    className="btn-primary py-2 px-4 text-sm"
                  >
                    Trade
                  </button>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {selectedStock && (
        <TradeModal 
          stock={selectedStock} 
          isOpen={isTradeModalOpen} 
          onClose={() => setIsTradeModalOpen(false)} 
        />
      )}
    </div>
  );
};

export default Market;
