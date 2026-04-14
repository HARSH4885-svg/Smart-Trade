import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, CheckCircle2, Wallet, TrendingUp, TrendingDown, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { cn } from '../../lib/utils';
import { useFormatters } from '../../hooks/useFormatters';
import { calculateMaxLoan, MARGIN_CONFIG } from '../../utils/loanEngine';
import LoanInfoPanel from './LoanInfoPanel';

const TradeModal = ({ stock, isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [type, setType] = useState('BUY');
  const [shares, setShares] = useState('');
  const [useLoan, setUseLoan] = useState(false);
  const { user } = useAuth();
  const { holdings, executeTrade } = usePortfolio();
  const { formatCurrency } = useFormatters();

  const currentHolding = holdings.find(h => h.stockId === stock.id);
  const price = stock.currentPrice;
  const totalCost = (parseFloat(shares) || 0) * price;
  
  const maxLoan = calculateMaxLoan(user.balance);
  const loanNeeded = Math.max(0, totalCost - user.balance);
  const canAffordWithLoan = totalCost <= (user.balance + maxLoan);

  const isValid = () => {
    const qty = parseInt(shares);
    if (!qty || qty <= 0) return false;
    if (type === 'BUY') {
      if (useLoan) return canAffordWithLoan;
      return totalCost <= user.balance;
    }
    if (type === 'SELL' && (!currentHolding || qty > currentHolding.shares)) return false;
    return true;
  };

  const handleConfirm = () => {
    executeTrade({
      type,
      stockId: stock.id,
      shares: parseInt(shares),
      price,
      loanAmount: useLoan ? loanNeeded : 0
    });
    setStep(3);
  };

  if (!isOpen) return null;

  return (
    <div className="glass-overlay p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-card w-full max-w-lg overflow-hidden relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-border/50 rounded-full transition-colors z-10"
        >
          <X size={20} />
        </button>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="flex items-center space-x-4">
                <div className="text-4xl">{stock.logo}</div>
                <div>
                  <h3 className="text-2xl font-bold">{stock.name}</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-text-secondary font-mono">{stock.id}</span>
                    <span className="text-sm text-text-secondary">•</span>
                    <span className="text-lg font-bold tabular-nums">{formatCurrency(price)}</span>
                    <span className={cn(
                      "text-sm font-bold",
                      stock.change >= 0 ? "text-success" : "text-danger"
                    )}>
                      {stock.changePercent}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex p-1 bg-background border border-border rounded-xl">
                <button
                  onClick={() => setType('BUY')}
                  className={cn(
                    "flex-1 py-2 rounded-lg font-bold transition-all",
                    type === 'BUY' ? "bg-success text-white shadow-lg shadow-success/20" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  BUY
                </button>
                <button
                  onClick={() => setType('SELL')}
                  className={cn(
                    "flex-1 py-2 rounded-lg font-bold transition-all",
                    type === 'SELL' ? "bg-danger text-white shadow-lg shadow-danger/20" : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  SELL
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-text-secondary uppercase tracking-widest">Quantity (Shares)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="0"
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    value={shares}
                    onChange={(e) => setShares(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 border border-border rounded-xl p-3">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Estimated Cost</p>
                    <p className="text-xl font-bold tabular-nums">{formatCurrency(totalCost)}</p>
                  </div>
                  <div className="bg-background/50 border border-border rounded-xl p-3">
                    <p className="text-xs font-bold text-text-secondary uppercase tracking-widest mb-1">Available Balance</p>
                    <p className="text-xl font-bold tabular-nums">{formatCurrency(user.balance)}</p>
                  </div>
                </div>

                {type === 'SELL' && currentHolding && (
                  <p className="text-xs text-text-secondary text-center">
                    You currently hold <span className="text-text-primary font-bold">{currentHolding.shares}</span> shares
                  </p>
                )}

                {!isValid() && shares !== '' && (
                  <div className="space-y-4">
                    <p className="text-xs text-danger text-center font-medium">
                      {type === 'BUY' ? 'Insufficient balance for this trade' : 'You do not have enough shares to sell'}
                    </p>
                    
                    {type === 'BUY' && canAffordWithLoan && (
                      <button
                        onClick={() => setUseLoan(true)}
                        className="w-full flex items-center justify-between p-4 bg-warning/10 border border-warning/20 rounded-xl hover:bg-warning/20 transition-all group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-warning/20 rounded-lg text-warning">
                            <ShieldCheck size={20} />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-bold text-warning">Use Smart Credit</p>
                            <p className="text-[10px] text-warning/70">Borrow {formatCurrency(loanNeeded)} to complete trade</p>
                          </div>
                        </div>
                        <ArrowRight size={16} className="text-warning group-hover:translate-x-1 transition-transform" />
                      </button>
                    )}
                  </div>
                )}

                {useLoan && type === 'BUY' && (
                  <LoanInfoPanel 
                    borrowedAmount={loanNeeded} 
                    totalValue={totalCost}
                    interest={loanNeeded * MARGIN_CONFIG.INTEREST_RATE}
                  />
                )}
              </div>

              <button
                disabled={!isValid()}
                onClick={() => setStep(2)}
                className="btn-primary w-full py-4 text-lg font-bold flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Review Order</span>
                <ArrowRight size={20} />
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-6 space-y-6"
            >
              <div className="text-center">
                <h3 className="text-xl font-bold">Review Your Order</h3>
                <p className="text-text-secondary">Please confirm the details below</p>
              </div>

              <div className="bg-background border border-border rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-base text-text-secondary">Transaction Type</span>
                  <span className={cn("text-base font-bold", type === 'BUY' ? "text-success" : "text-danger")}>{type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base text-text-secondary">Asset</span>
                  <span className="text-base font-bold">{stock.name} ({stock.id})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base text-text-secondary">Quantity</span>
                  <span className="text-base font-bold">{shares} Shares</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-base text-text-secondary">Price per Share</span>
                  <span className="text-base font-bold tabular-nums">{formatCurrency(price)}</span>
                </div>
                
                {useLoan && (
                  <>
                    <div className="h-px bg-border"></div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-secondary">Your Funds</span>
                      <span className="text-sm font-bold">{formatCurrency(user.balance)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-warning">Borrowed Funds</span>
                      <span className="text-sm font-bold text-warning">+{formatCurrency(loanNeeded)}</span>
                    </div>
                  </>
                )}

                <div className="h-px bg-border"></div>
                <div className="flex justify-between items-center">
                  <span className="text-text-primary font-bold">Total {type === 'BUY' ? 'Cost' : 'Credit'}</span>
                  <span className="text-2xl font-bold text-primary tabular-nums">{formatCurrency(totalCost)}</span>
                </div>
              </div>

              {useLoan && (
                <div className="flex items-start space-x-2 p-3 bg-danger/5 border border-danger/10 rounded-xl">
                  <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
                  <p className="text-[10px] text-danger/80 leading-tight">
                    Warning: You are trading with borrowed funds. High risk of liquidation if market moves against you.
                  </p>
                </div>
              )}

              <div className="flex space-x-4">
                <button
                  onClick={() => setStep(1)}
                  className="btn-secondary flex-1 py-4 font-bold"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  className={cn(
                    "flex-1 py-4 font-bold rounded-lg text-white shadow-lg transition-all",
                    type === 'BUY' ? "bg-success shadow-success/20" : "bg-danger shadow-danger/20"
                  )}
                >
                  Confirm {type}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center space-y-6"
            >
              <div className="flex justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", damping: 12, stiffness: 200 }}
                  className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center"
                >
                  <CheckCircle2 size={64} />
                </motion.div>
              </div>
              <div>
                <h3 className="text-3xl font-bold">Trade Successful!</h3>
                <p className="text-text-secondary mt-2">
                  You have successfully {type === 'BUY' ? 'purchased' : 'sold'} {shares} shares of {stock.id}.
                </p>
              </div>
              <button
                onClick={onClose}
                className="btn-primary w-full py-4 text-lg font-bold"
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default TradeModal;
