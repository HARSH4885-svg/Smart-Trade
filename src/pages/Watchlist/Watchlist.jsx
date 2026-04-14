import React, { useMemo } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useMarket } from '../../context/MarketContext';
import { Star, TrendingUp, TrendingDown, Trash2, ShoppingCart, Info, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Link } from 'react-router-dom';
import { useFormatters } from '../../hooks/useFormatters';

const Watchlist = () => {
  const { watchlist, removeFromWatchlist } = usePortfolio();
  const { stocks } = useMarket();
  const { formatCurrency, formatPercent } = useFormatters();

  const watchlistStocks = useMemo(() => {
    return watchlist.map(id => stocks.find(s => s.id === id)).filter(Boolean);
  }, [watchlist, stocks]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Watchlist</h1>
          <p className="text-text-secondary">Keep an eye on stocks you're interested in.</p>
        </div>
        <Link to="/market" className="btn-primary flex items-center space-x-2">
          <Search size={18} />
          <span>Discover More</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {watchlistStocks.map((stock) => (
          <div key={stock.id} className="card group relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="text-4xl">{stock.logo}</div>
              <button 
                onClick={() => removeFromWatchlist(stock.id)}
                className="p-2 rounded-full hover:bg-danger/10 text-text-secondary hover:text-danger transition-colors"
                title="Remove from watchlist"
              >
                <Trash2 size={18} />
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
                  className="btn-primary py-2 px-4 text-sm flex items-center space-x-2"
                  onClick={(e) => {
                    e.preventDefault();
                    // Open trade modal logic would go here
                  }}
                >
                  <ShoppingCart size={14} />
                  <span>Trade</span>
                </button>
              </div>
            </Link>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs font-bold text-text-secondary uppercase tracking-widest">
              <span>7D High: {formatCurrency(stock.high52w * 0.9)}</span>
              <span>7D Low: {formatCurrency(stock.low52w * 1.1)}</span>
            </div>
          </div>
        ))}

        {watchlistStocks.length === 0 && (
          <div className="col-span-full py-20 text-center card bg-background/50 border-dashed border-2">
            <Star size={48} className="mx-auto mb-4 text-text-secondary opacity-20" />
            <h3 className="text-xl font-bold">Your watchlist is empty</h3>
            <p className="text-text-secondary mt-2">Add stocks from the market to track them here.</p>
            <Link to="/market" className="btn-primary mt-6 inline-block">Explore Market</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlist;
