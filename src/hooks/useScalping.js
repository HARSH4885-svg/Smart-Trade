import { useState, useEffect, useCallback, useRef } from 'react';
import { useMarket } from '../context/MarketContext';
import { usePortfolio } from '../context/PortfolioContext';
import { calculateSMA, calculateRSI, calculateMomentum, generateSignal, simulateTick } from '../utils/scalpingEngine';
import toast from 'react-hot-toast';

export const useScalping = (stockId) => {
  const { stocks, dataSource } = useMarket();
  const { executeTrade, holdings } = usePortfolio();
  
  const [isEnabled, setIsEnabled] = useState(false);
  const [isAutoTrade, setIsAutoTrade] = useState(false);
  const [leverage, setLeverage] = useState(1);
  const [quantity, setQuantity] = useState(100);
  const [stopLoss, setStopLoss] = useState(0.5); // %
  const [takeProfit, setTakeProfit] = useState(1.0); // %
  
  const [microHistory, setMicroHistory] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [signal, setSignal] = useState("HOLD");
  const [markers, setMarkers] = useState([]);
  const [stats, setStats] = useState({
    tradesPerMinute: 0,
    winRate: 0,
    totalPnL: 0,
    avgDuration: 0,
    totalTrades: 0,
    wins: 0
  });

  const lastTradeTime = useRef(0);
  const tradeLog = useRef([]);
  const priceInterval = useRef(null);
  const stockRef = useRef(null);

  // Sync with market data
  useEffect(() => {
    const stock = stocks.find(s => s.id === stockId);
    if (stock) {
      stockRef.current = stock;
      if (!isEnabled) setCurrentPrice(stock.currentPrice);
    }
  }, [stocks, stockId, isEnabled]);

  // High-frequency price simulation
  useEffect(() => {
    if (isEnabled) {
      priceInterval.current = setInterval(() => {
        setCurrentPrice(prev => {
          const nextPrice = simulateTick(prev, 0.0003, signal === "BUY" ? 0.1 : signal === "SELL" ? -0.1 : 0);
          
          // Update micro history (1s candles)
          setMicroHistory(history => {
            const newHistory = [...history, { time: Date.now(), close: nextPrice }];
            return newHistory.slice(-100); // Keep last 100 ticks
          });
          
          return nextPrice;
        });
      }, 500);
    } else {
      clearInterval(priceInterval.current);
    }

    return () => clearInterval(priceInterval.current);
  }, [isEnabled, signal]);

  // Strategy Engine
  useEffect(() => {
    if (microHistory.length < 20) return;

    const sma5 = calculateSMA(microHistory, 5);
    const sma10 = calculateSMA(microHistory, 10);
    const rsi = calculateRSI(microHistory, 14);
    const momentum = calculateMomentum(microHistory, 5);

    const nextSignal = generateSignal({ rsi, smaShort: sma5, smaLong: sma10, momentum });
    setSignal(nextSignal);
  }, [microHistory]);

  // Auto-trading logic
  useEffect(() => {
    if (isAutoTrade && isEnabled && signal !== "HOLD") {
      const now = Date.now();
      if (now - lastTradeTime.current > 2000) { // 2s cooldown
        handleTrade(signal);
        lastTradeTime.current = now;
      }
    }
  }, [isAutoTrade, isEnabled, signal]);

  const handleTrade = useCallback((type) => {
    if (!stockRef.current) return;

    const trade = {
      type,
      stockId,
      shares: quantity,
      price: currentPrice,
      leverage
    };

    executeTrade(trade);
    
    // Add marker to chart
    const marker = {
      time: Math.floor(Date.now() / 1000),
      position: type === "BUY" ? "belowBar" : "aboveBar",
      color: type === "BUY" ? "#00ff9d" : "#ff3e3e",
      shape: type === "BUY" ? "arrowUp" : "arrowDown",
      text: `${type} @ ${currentPrice.toFixed(2)}`
    };
    setMarkers(prev => [...prev, marker].slice(-50));

    // Log trade for stats
    const logEntry = {
      ...trade,
      timestamp: Date.now()
    };
    tradeLog.current.push(logEntry);
    
    setStats(prev => {
      const totalTrades = prev.totalTrades + 1;
      const oneMinAgo = Date.now() - 60000;
      tradeLog.current = tradeLog.current.filter(t => t.timestamp > oneMinAgo);
      const tradesInLastMin = tradeLog.current.length;
      
      // Simple win rate simulation for demo
      const isWin = Math.random() > 0.4;
      const wins = isWin ? prev.wins + 1 : prev.wins;
      
      return {
        ...prev,
        totalTrades,
        tradesPerMinute: tradesInLastMin,
        wins,
        winRate: Math.round((wins / totalTrades) * 100),
        avgDuration: Math.floor(Math.random() * 10) + 5 // Simulated avg duration
      };
    });

    toast.success(`${type} ${quantity} ${stockId} @ ${currentPrice.toFixed(2)}`, {
      icon: type === "BUY" ? "🚀" : "📉",
      duration: 1000
    });
  }, [stockId, quantity, currentPrice, leverage, executeTrade]);

  // Risk Management: Auto-close positions
  useEffect(() => {
    if (!isEnabled) return;

    const holding = holdings.find(h => h.stockId === stockId);
    if (!holding) return;

    const pnlPercent = ((currentPrice - holding.avgBuyPrice) / holding.avgBuyPrice) * 100;

    if (pnlPercent <= -stopLoss) {
      handleTrade("SELL");
      toast.error("Stop Loss Hit!", { id: "risk-alert" });
    } else if (pnlPercent >= takeProfit) {
      handleTrade("SELL");
      toast.success("Take Profit Hit!", { id: "risk-alert" });
    }
  }, [currentPrice, holdings, stockId, stopLoss, takeProfit, isEnabled, handleTrade]);

  return {
    isEnabled,
    setIsEnabled,
    isAutoTrade,
    setIsAutoTrade,
    leverage,
    setLeverage,
    quantity,
    setQuantity,
    stopLoss,
    setStopLoss,
    takeProfit,
    setTakeProfit,
    currentPrice,
    signal,
    markers,
    microHistory,
    stats,
    handleTrade
  };
};
