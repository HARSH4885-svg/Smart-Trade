import React, { useState, useMemo } from 'react';
import { usePortfolio } from '../../context/PortfolioContext';
import { Search, Filter, Download, ArrowUpDown, Calendar, Tag, DollarSign, TrendingUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useFormatters } from '../../hooks/useFormatters';

const TransactionHistory = () => {
  const { transactions } = usePortfolio();
  const { formatCurrency, formatDate } = useFormatters();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = tx.stockId.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === 'All' || tx.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, search, typeFilter]);

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Stock', 'Shares', 'Price', 'Total', 'P&L'];
    const rows = filteredTransactions.map(tx => [
      formatDate(tx.timestamp),
      tx.type,
      tx.stockId,
      tx.shares,
      tx.price,
      tx.total,
      tx.pnl || '-'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-text-secondary">View and export your complete trading history.</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="btn-secondary flex items-center space-x-2"
          disabled={filteredTransactions.length === 0}
        >
          <Download size={18} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-4 flex items-center space-x-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Tag size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Total Trades</p>
            <p className="text-3xl font-bold">{transactions.length}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center space-x-4">
          <div className="p-3 bg-success/10 text-success rounded-xl">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Total Volume</p>
            <p className="text-3xl font-bold tabular-nums">
              {formatCurrency(transactions.reduce((acc, tx) => acc + tx.total, 0))}
            </p>
          </div>
        </div>
        <div className="card p-4 flex items-center space-x-4">
          <div className="p-3 bg-warning/10 text-warning rounded-xl">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Realized P&L</p>
            <p className="text-3xl font-bold tabular-nums">
              {formatCurrency(transactions.reduce((acc, tx) => acc + (tx.pnl || 0), 0))}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" size={20} />
          <input
            type="text"
            placeholder="Filter by ticker symbol..."
            className="w-full bg-surface border border-border rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="text-text-secondary" size={20} />
          <select 
            className="bg-surface border border-border rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="BUY">Buy</option>
            <option value="SELL">Sell</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-border">
                <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Date & Time</th>
                <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Type</th>
                <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Stock</th>
                <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Shares</th>
                <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Price</th>
                <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest">Total</th>
                <th className="p-4 text-sm font-bold text-text-secondary uppercase tracking-widest text-right">P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-border/20 transition-colors">
                  <td className="p-4 text-base text-text-secondary">
                    {new Date(tx.timestamp).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "badge",
                      tx.type === 'BUY' ? "badge-success" : "badge-danger"
                    )}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-base">{tx.stockId}</td>
                  <td className="p-4 tabular-nums text-base">{tx.shares}</td>
                  <td className="p-4 tabular-nums text-base">{formatCurrency(tx.price)}</td>
                  <td className="p-4 tabular-nums font-bold text-base">{formatCurrency(tx.total)}</td>
                  <td className="p-4 tabular-nums text-right font-bold text-base">
                    {tx.pnl !== undefined ? (
                      <span className={tx.pnl >= 0 ? "text-success" : "text-danger"}>
                        {formatCurrency(tx.pnl)}
                      </span>
                    ) : (
                      <span className="text-text-secondary">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-text-secondary">
                    No transactions found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransactionHistory;
