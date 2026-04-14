import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { stocks as initialStocks } from '../data/stocks';
import { useTheme } from './ThemeContext';
import { usePortfolio } from './PortfolioContext';

const MarketContext = createContext();

export const MarketProvider = ({ children }) => {
  const [stocks, setStocks] = useState(initialStocks);
  const [dataSource, setDataSource] = useState(null); // Wait for status check
  const [marketError, setMarketError] = useState(null);
  const { forceMarketOpen } = useTheme();
  const { checkLimitOrders, checkLiquidationPositions } = usePortfolio();
  const stocksRef = useRef(stocks);

  const simulatePrices = () => {
    setStocks(prevStocks => {
      const updated = prevStocks.map(stock => {
        const volatility = 0.002; // 0.2% max change per tick
        const change = stock.currentPrice * (Math.random() * volatility * 2 - volatility);
        const newPrice = Math.max(0.01, stock.currentPrice + change);
        const totalChange = newPrice - stock.previousClose;
        const totalChangePercent = (totalChange / stock.previousClose) * 100;

        return {
          ...stock,
          currentPrice: newPrice,
          change: totalChange,
          changePercent: totalChangePercent,
          high: Math.max(stock.high, newPrice),
          low: Math.min(stock.low, newPrice)
        };
      });
      checkLimitOrders(updated);
      checkLiquidationPositions(updated);
      return updated;
    });
  };

  useEffect(() => {
    stocksRef.current = stocks;
  }, [stocks]);

  const isMarketOpen = () => {
    if (forceMarketOpen) return true;
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    // 9:30 AM to 4:00 PM EST (approximate for local time here)
    const openTime = 9 * 60 + 30;
    const closeTime = 16 * 60;
    
    return day >= 1 && day <= 5 && currentTime >= openTime && currentTime <= closeTime;
  };

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        if (!data.apiKeyConfigured) {
          setDataSource('simulated');
          setMarketError("API Key not configured - Using Simulated Data");
        } else {
          setDataSource('live');
        }
      } catch (error) {
        console.error("Error checking API status:", error);
      }
    };
    checkApiStatus();
  }, []);

  useEffect(() => {
    const fetchPrices = async () => {
      if (dataSource === null) return;
      
      if (dataSource === 'simulated') {
        simulatePrices();
        return;
      }

      const currentStocks = stocksRef.current;
      let hasRateLimit = false;
      let hasAuthError = false;
      let successCount = 0;

      try {
        const fetchPromises = currentStocks.map(async (stock) => {
          try {
            const response = await fetch(`/api/stocks/${stock.id}`);
            
            if (response.status === 429) {
              hasRateLimit = true;
              return stock;
            }

            if (response.status === 401) {
              hasAuthError = true;
              return stock;
            }

            if (!response.ok) {
              return stock;
            }
            
            const data = await response.json();
            if (data.error) {
              return stock;
            }

            if (data.isSimulated) {
              hasAuthError = true;
            }

            successCount++;
            return {
              ...stock,
              currentPrice: data.currentPrice || stock.currentPrice,
              change: data.change || stock.change,
              changePercent: data.changePercent || stock.changePercent,
              high: data.high || stock.high,
              low: data.low || stock.low,
              open: data.open || stock.open,
              previousClose: data.previousClose || stock.previousClose
            };
          } catch (error) {
            // Silently handle common network errors to avoid cluttering logs
            const isNetworkError = 
              !error || 
              (error instanceof Error && error.message?.includes('Failed to fetch')) ||
              (error.name === 'TypeError') ||
              (typeof error === 'string' && error.includes('Failed to fetch'));

            if (!isNetworkError) {
              console.error(`Error fetching ${stock.id}:`, error);
            }
            return stock;
          }
        });

        const results = await Promise.all(fetchPromises);

        if (hasAuthError) {
          setMarketError("Invalid API Key - Using Simulated Data");
          setDataSource('simulated');
          simulatePrices();
          return;
        }

        if (hasRateLimit) {
          setMarketError("Rate Limited (Free Tier)");
        } else if (successCount > 0) {
          setMarketError(null);
          setDataSource('live');
        }
        
        setStocks(results);
        checkLimitOrders(results);
        checkLiquidationPositions(results);
      } catch (error) {
        console.error("Error in fetchPrices:", error);
      }
    };

    // Initial fetch
    fetchPrices();

    const interval = setInterval(() => {
      fetchPrices();
    }, dataSource === 'live' ? 60000 : 5000);

    return () => clearInterval(interval);
  }, [forceMarketOpen, dataSource]);

  return (
    <MarketContext.Provider value={{ stocks, dataSource, marketError, isMarketOpen: isMarketOpen() }}>
      {children}
    </MarketContext.Provider>
  );
};

export const useMarket = () => useContext(MarketContext);
