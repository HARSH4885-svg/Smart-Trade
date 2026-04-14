import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS } from '../constants';
import { useAuth } from './AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { calculateInterest, checkLiquidation } from '../utils/loanEngine';
import toast from 'react-hot-toast';

const PortfolioContext = createContext();

const INITIAL_PORTFOLIO = {
  holdings: [],
  transactions: [],
  watchlist: ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "TSLA"],
  portfolioHistory: [],
  limitOrders: []
};

export const PortfolioProvider = ({ children }) => {
  const { user, updateBalance } = useAuth();
  const [portfolio, setPortfolio] = useState(INITIAL_PORTFOLIO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPortfolio(INITIAL_PORTFOLIO);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'portfolios', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setPortfolio(docSnap.data());
      } else {
        setDoc(doc(db, 'portfolios', user.uid), INITIAL_PORTFOLIO);
        setPortfolio(INITIAL_PORTFOLIO);
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error in PortfolioContext:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const updatePortfolio = async (newData) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'portfolios', user.uid), newData);
    } catch (error) {
      console.error("Error updating portfolio:", error);
    }
  };

  const executeTrade = async (trade) => {
    if (!user) return;
    const { type, stockId, shares, price, loanAmount = 0 } = trade;
    const totalCost = shares * price;
    const ownFunds = totalCost - loanAmount;

    if (type === 'BUY') {
      if (user.balance < ownFunds) {
        toast.error("Insufficient balance even with credit.");
        return;
      }

      updateBalance(-ownFunds, 'trade');
      
      const existingHolding = portfolio.holdings.find(h => h.stockId === stockId);
      let newHoldings;
      
      const loanInfo = loanAmount > 0 ? {
        amount: loanAmount,
        timestamp: new Date().toISOString(),
        interestAccrued: 0
      } : null;

      if (existingHolding) {
        const totalShares = existingHolding.shares + shares;
        const avgBuyPrice = (existingHolding.shares * existingHolding.avgBuyPrice + totalCost) / totalShares;
        
        // Merge loans if existing
        const mergedLoan = existingHolding.loan || loanInfo ? {
          amount: (existingHolding.loan?.amount || 0) + (loanInfo?.amount || 0),
          timestamp: existingHolding.loan?.timestamp || loanInfo?.timestamp,
          interestAccrued: (existingHolding.loan?.interestAccrued || 0)
        } : null;

        newHoldings = portfolio.holdings.map(h => 
          h.stockId === stockId ? { 
            ...h, 
            shares: totalShares, 
            avgBuyPrice, 
            totalInvested: h.totalInvested + totalCost,
            loan: mergedLoan
          } : h
        );
      } else {
        newHoldings = [...portfolio.holdings, { 
          stockId, 
          shares, 
          avgBuyPrice: price, 
          totalInvested: totalCost,
          loan: loanInfo
        }];
      }

      const transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'BUY',
        stockId,
        shares,
        price,
        total: totalCost,
        loanAmount,
        timestamp: new Date().toISOString(),
        balanceAfter: user.balance - ownFunds
      };

      updatePortfolio({
        holdings: newHoldings,
        transactions: [transaction, ...portfolio.transactions]
      });

      if (loanAmount > 0) {
        toast.success(`Margin Trade Executed! Borrowed ${loanAmount.toFixed(2)}`);
      }
    } else {
      const existingHolding = portfolio.holdings.find(h => h.stockId === stockId);
      if (!existingHolding || existingHolding.shares < shares) return;

      let repaymentAmount = 0;
      let interest = 0;

      if (existingHolding.loan) {
        const shareRatio = shares / existingHolding.shares;
        const baseRepayment = existingHolding.loan.amount * shareRatio;
        interest = calculateInterest(baseRepayment, existingHolding.loan.timestamp);
        repaymentAmount = baseRepayment + interest;
      }

      const netProceeds = totalCost - repaymentAmount;
      updateBalance(netProceeds, 'trade');

      const pnl = (price - existingHolding.avgBuyPrice) * shares - interest;
      let newHoldings;
      
      if (existingHolding.shares === shares) {
        newHoldings = portfolio.holdings.filter(h => h.stockId !== stockId);
      } else {
        newHoldings = portfolio.holdings.map(h => 
          h.stockId === stockId ? { 
            ...h, 
            shares: h.shares - shares,
            loan: h.loan ? { ...h.loan, amount: h.loan.amount * (1 - (shares / h.shares)) } : null
          } : h
        );
      }

      const transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'SELL',
        stockId,
        shares,
        price,
        total: totalCost,
        repayment: repaymentAmount,
        interest,
        pnl,
        timestamp: new Date().toISOString(),
        balanceAfter: user.balance + netProceeds
      };

      updatePortfolio({
        holdings: newHoldings,
        transactions: [transaction, ...portfolio.transactions]
      });

      if (repaymentAmount > 0) {
        toast.success(`Loan Repaid: ${repaymentAmount.toFixed(2)} (Interest: ${interest.toFixed(2)})`);
      }
    }
  };

  const checkLiquidationPositions = useCallback((stocks) => {
    if (!user || loading || !stocks.length) return;
    
    portfolio.holdings.forEach(holding => {
      if (!holding.loan) return;
      
      const stock = stocks.find(s => s.id === holding.stockId);
      if (!stock) return;

      if (checkLiquidation(holding, stock.currentPrice)) {
        toast.error(`LIQUIDATION TRIGGERED: ${holding.stockId} position closed due to high risk.`);
        executeTrade({
          type: 'SELL',
          stockId: holding.stockId,
          shares: holding.shares,
          price: stock.currentPrice
        });
      }
    });
  }, [user, loading, portfolio.holdings]);

  const addLimitOrder = (order) => {
    const newOrder = {
      ...order,
      id: Math.random().toString(36).substr(2, 9),
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    
    const updatedOrders = [...(portfolio.limitOrders || []), newOrder];
    updatePortfolio({ limitOrders: updatedOrders });
  };

  const cancelLimitOrder = (orderId) => {
    const updatedOrders = (portfolio.limitOrders || []).filter(o => o.id !== orderId);
    updatePortfolio({ limitOrders: updatedOrders });
  };

  const checkLimitOrders = useCallback((stocks) => {
    if (!user || loading) return;
    const orders = portfolio.limitOrders || [];
    if (orders.length === 0) return;

    let hasChanges = false;
    let updatedOrders = [...orders];

    orders.forEach(order => {
      if (order.status !== 'PENDING') return;

      const stock = stocks.find(s => s.id === order.stockId);
      if (!stock) return;

      const currentPrice = stock.currentPrice;
      let shouldExecute = false;

      if (order.type === 'BUY' && currentPrice <= order.targetPrice) {
        if (user.balance >= order.shares * currentPrice) {
          shouldExecute = true;
        }
      } else if (order.type === 'SELL' && currentPrice >= order.targetPrice) {
        const holding = portfolio.holdings.find(h => h.stockId === order.stockId);
        if (holding && holding.shares >= order.shares) {
          shouldExecute = true;
        } else {
          updatedOrders = updatedOrders.filter(o => o.id !== order.id);
          hasChanges = true;
          return;
        }
      }

      if (shouldExecute) {
        executeTrade({
          type: order.type,
          stockId: order.stockId,
          shares: order.shares,
          price: currentPrice
        });

        updatedOrders = updatedOrders.map(o => 
          o.id === order.id ? { ...o, status: 'EXECUTED', executedAt: new Date().toISOString() } : o
        );
        hasChanges = true;
      }
    });

    if (hasChanges) {
      updatePortfolio({ limitOrders: updatedOrders });
    }
  }, [user, loading, portfolio.limitOrders, portfolio.holdings, executeTrade]);

  const addToWatchlist = (stockId) => {
    if (!portfolio.watchlist.includes(stockId)) {
      const updatedWatchlist = [...portfolio.watchlist, stockId];
      updatePortfolio({ watchlist: updatedWatchlist });
    }
  };

  const removeFromWatchlist = (stockId) => {
    const updatedWatchlist = portfolio.watchlist.filter(id => id !== stockId);
    updatePortfolio({ watchlist: updatedWatchlist });
  };

  const resetPortfolio = () => {
    updatePortfolio(INITIAL_PORTFOLIO);
  };

  return (
    <PortfolioContext.Provider value={{ 
      holdings: portfolio.holdings,
      transactions: portfolio.transactions,
      watchlist: portfolio.watchlist,
      portfolioHistory: portfolio.portfolioHistory,
      limitOrders: portfolio.limitOrders || [],
      loading,
      addToWatchlist,
      removeFromWatchlist,
      executeTrade,
      resetPortfolio,
      addLimitOrder,
      cancelLimitOrder,
      checkLimitOrders,
      checkLiquidationPositions
    }}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = () => useContext(PortfolioContext);
