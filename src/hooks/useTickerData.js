import { useState, useEffect, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
import { usePortfolio } from '../context/PortfolioContext';

const USERNAMES = [
  "TraderX", "Rahul", "User123", "StockMaster", "BullishBob", 
  "CryptoQueen", "MarketWizard", "AlphaSeeker", "DayTraderPro", "InvestGuru",
  "ScalpKing", "ProfitHunter", "TrendFollower", "WhaleWatcher", "MoonShot"
];

export const useTickerData = (limit = 20) => {
  const { stocks } = useMarket();
  const { transactions } = usePortfolio();
  const [tickerTrades, setTickerTrades] = useState([]);
  const lastRealTradeId = useRef(null);

  // Initialize with some random trades
  useEffect(() => {
    if (stocks.length === 0) return;

    const initialTrades = Array.from({ length: 10 }, () => generateRandomTrade(stocks));
    setTickerTrades(initialTrades);
  }, [stocks]);

  // Sync with real user trades
  useEffect(() => {
    if (transactions.length > 0) {
      const latestTrade = transactions[0];
      if (latestTrade.id !== lastRealTradeId.current) {
        lastRealTradeId.current = latestTrade.id;
        
        const newTrade = {
          id: latestTrade.id,
          user: "You",
          action: latestTrade.type,
          stock: latestTrade.stockId,
          quantity: latestTrade.shares,
          price: latestTrade.price,
          timestamp: Date.now(),
          isReal: true
        };

        setTickerTrades(prev => [newTrade, ...prev].slice(0, limit));
      }
    }
  }, [transactions, limit]);

  // Generate random trades periodically
  useEffect(() => {
    if (stocks.length === 0) return;

    const interval = setInterval(() => {
      const newTrade = generateRandomTrade(stocks);
      setTickerTrades(prev => [newTrade, ...prev].slice(0, limit));
    }, 2500); // Every 2.5 seconds

    return () => clearInterval(interval);
  }, [stocks, limit]);

  return tickerTrades;
};

function generateRandomTrade(stocks) {
  const stock = stocks[Math.floor(Math.random() * stocks.length)];
  const action = Math.random() > 0.5 ? "BUY" : "SELL";
  const user = USERNAMES[Math.floor(Math.random() * USERNAMES.length)];
  const quantity = Math.floor(Math.random() * 100) + 1;
  
  // Add slight variation to current price for "execution price"
  const variation = (Math.random() * 0.02 - 0.01) * stock.currentPrice;
  const price = stock.currentPrice + variation;

  return {
    id: Math.random().toString(36).substr(2, 9),
    user,
    action,
    stock: stock.id,
    quantity,
    price,
    timestamp: Date.now(),
    isReal: false
  };
}
