import { stocks } from './stocks';

const generateMockHistory = (stock, days = 90) => {
  const history = [];
  let currentPrice = stock.currentPrice;
  const volatility = stock.beta * 0.02; // Base volatility on beta

  for (let i = days; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    const change = currentPrice * (Math.random() - 0.48) * volatility;
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + (Math.random() * currentPrice * 0.01);
    const low = Math.min(open, close) - (Math.random() * currentPrice * 0.01);
    const volume = Math.floor(Math.random() * 1000000) + 500000;

    history.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume
    });

    currentPrice = close;
  }
  return history;
};

export const mockPriceHistory = stocks.reduce((acc, stock) => {
  acc[stock.id] = generateMockHistory(stock);
  return acc;
}, {});
