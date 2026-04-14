import React, { useState } from 'react';
import { X, Plus, Minus, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useFormatters } from '../hooks/useFormatters';

import { useTheme } from '../context/ThemeContext';
import { SUPPORTED_CURRENCIES, EXCHANGE_RATES } from '../constants';

const WalletModal = ({ isOpen, onClose }) => {
  const { user, updateBalance } = useAuth();
  const { currency } = useTheme();
  const { formatCurrency } = useFormatters();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('deposit'); // 'deposit' or 'withdraw'
  const [activeTab, setActiveTab] = useState('manage'); // 'manage' or 'history'

  const currencySymbol = SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '$';

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    const rate = EXCHANGE_RATES[currency] || 1;
    const amountInUSD = numAmount / rate;

    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (type === 'withdraw' && amountInUSD > user.balance) {
      toast.error('Insufficient balance');
      return;
    }

    const finalAmount = type === 'deposit' ? amountInUSD : -amountInUSD;
    updateBalance(finalAmount, type);
    
    toast.success(`${type === 'deposit' ? 'Added' : 'Withdrawn'} ${formatCurrency(amountInUSD)} successfully`);
    setAmount('');
    setActiveTab('history');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md relative animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col max-h-[90vh]">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-border/50 rounded-full transition-colors cursor-pointer z-10"
        >
          <X size={20} />
        </button>

        <div className="p-6 border-b border-border">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">Wallet Management</h2>
            <p className="text-text-secondary text-sm">Manage your funds for trading</p>
          </div>

          <div className="flex p-1 bg-background border border-border rounded-xl">
            <button
              onClick={() => setActiveTab('manage')}
              className={cn(
                "flex-1 py-2 rounded-lg text-base font-bold transition-all cursor-pointer",
                activeTab === 'manage' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-secondary hover:text-text-primary"
              )}
            >
              Manage
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "flex-1 py-2 rounded-lg text-base font-bold transition-all cursor-pointer",
                activeTab === 'history' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-secondary hover:text-text-primary"
              )}
            >
              History
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'manage' ? (
            <div className="space-y-6">
              <div className="bg-background/50 border border-border rounded-2xl p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Current Balance</p>
                  <p className="text-3xl font-bold tabular-nums text-primary">{formatCurrency(user?.balance || 0)}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <span className="text-2xl font-bold">{currencySymbol}</span>
                </div>
              </div>

              <div className="flex p-1 bg-background border border-border rounded-xl">
                <button
                  onClick={() => setType('deposit')}
                  className={cn(
                    "flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-base font-bold transition-all cursor-pointer",
                    type === 'deposit' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <ArrowUpRight size={16} />
                  <span>Deposit</span>
                </button>
                <button
                  onClick={() => setType('withdraw')}
                  className={cn(
                    "flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-base font-bold transition-all cursor-pointer",
                    type === 'withdraw' ? "bg-danger text-white shadow-lg shadow-danger/20" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  <ArrowDownLeft size={16} />
                  <span>Withdraw</span>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Amount</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary font-bold">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      autoFocus
                      className="w-full bg-background border border-border rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-lg font-bold tabular-nums"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[100, 500, 1000, 5000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val.toString())}
                      className="py-2 bg-background border border-border rounded-lg text-sm font-bold hover:border-primary/50 transition-colors cursor-pointer"
                    >
                      +{currencySymbol}{val}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className={cn(
                    "w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-[0.98] cursor-pointer",
                    type === 'deposit' ? "btn-primary" : "bg-danger hover:bg-danger/90 text-white shadow-danger/20"
                  )}
                >
                  {type === 'deposit' ? 'Add Funds' : 'Withdraw Funds'}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              {user?.fundTransactions?.length > 0 ? (
                user.fundTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 bg-background/50 border border-border rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        tx.type === 'deposit' ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                      )}>
                        {tx.type === 'deposit' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                      </div>
                      <div>
                        <p className="text-base font-bold capitalize">{tx.category === 'trade' ? 'Trading Activity' : tx.type}</p>
                        <p className="text-xs text-text-secondary">{new Date(tx.date).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-bold tabular-nums",
                        tx.type === 'deposit' ? "text-success" : "text-danger"
                      )}>
                        {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                      <p className="text-xs text-text-secondary">Balance: {formatCurrency(tx.balanceAfter)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-text-secondary">
                  <span className="text-4xl mx-auto mb-4 opacity-20 block font-bold">{currencySymbol}</span>
                  <p>No fund history available yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletModal;
