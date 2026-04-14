/**
 * Scalping Strategy Engine
 * Provides technical indicators and trade signals for high-frequency trading.
 */

/**
 * Calculate Simple Moving Average (SMA)
 * @param {Array} data - Array of price objects or numbers
 * @param {number} period - The window size
 * @returns {number|null}
 */
export const calculateSMA = (data, period) => {
  if (!data || data.length < period) return null;
  const prices = data.slice(-period).map(d => typeof d === 'object' ? d.close : d);
  const sum = prices.reduce((a, b) => a + b, 0);
  return sum / period;
};

/**
 * Calculate Relative Strength Index (RSI)
 * @param {Array} data - Array of price objects or numbers
 * @param {number} period - The window size (default 14)
 * @returns {number|null}
 */
export const calculateRSI = (data, period = 14) => {
  if (!data || data.length <= period) return null;
  
  const prices = data.map(d => typeof d === 'object' ? d.close : d);
  let gains = 0;
  let losses = 0;

  for (let i = data.length - period; i < data.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  if (losses === 0) return 100;
  
  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
};

/**
 * Detect Momentum
 * @param {Array} data - Array of price objects or numbers
 * @param {number} period - The window size
 * @returns {number|null} - Positive for upward momentum, negative for downward
 */
export const calculateMomentum = (data, period = 5) => {
  if (!data || data.length < period) return null;
  const prices = data.map(d => typeof d === 'object' ? d.close : d);
  const current = prices[prices.length - 1];
  const previous = prices[prices.length - period];
  return ((current - previous) / previous) * 100;
};

/**
 * Generate Scalping Signal
 * @param {Object} params - Technical indicators
 * @returns {string} - "BUY", "SELL", or "HOLD"
 */
export const generateSignal = ({ rsi, smaShort, smaLong, momentum }) => {
  if (rsi === null || smaShort === null || smaLong === null) return "HOLD";

  // Bullish conditions
  const isBullishCross = smaShort > smaLong;
  const isOversold = rsi < 30;
  const hasUpwardMomentum = momentum > 0.05;

  // Bearish conditions
  const isBearishCross = smaShort < smaLong;
  const isOverbought = rsi > 70;
  const hasDownwardMomentum = momentum < -0.05;

  if ((isBullishCross && momentum > 0) || isOversold) {
    return "BUY";
  }

  if ((isBearishCross && momentum < 0) || isOverbought) {
    return "SELL";
  }

  return "HOLD";
};

/**
 * Simulate Tick Movement
 * @param {number} currentPrice 
 * @param {number} volatility - 0.0001 to 0.001
 * @param {number} bias - Trend bias (-1 to 1)
 */
export const simulateTick = (currentPrice, volatility = 0.0005, bias = 0) => {
  const random = (Math.random() * 2 - 1) + (bias * 0.2);
  const change = currentPrice * random * volatility;
  return Math.max(0.01, currentPrice + change);
};
