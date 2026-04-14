/**
 * Loan Engine for Margin Trading
 * Handles calculations for borrowing, interest, and liquidation.
 */

export const MARGIN_CONFIG = {
  MAX_LEVERAGE: 3, // 3x of wallet balance
  INTEREST_RATE: 0.02, // 2% flat interest for simulation
  LIQUIDATION_THRESHOLD: 0.5, // 50% loss of total trade value
};

/**
 * Calculate maximum borrowable amount
 * @param {number} balance - Current wallet balance
 * @returns {number}
 */
export const calculateMaxLoan = (balance) => {
  return balance * (MARGIN_CONFIG.MAX_LEVERAGE - 1);
};

/**
 * Calculate interest for a loan
 * @param {number} borrowedAmount 
 * @param {string} startTime - ISO string
 * @returns {number}
 */
export const calculateInterest = (borrowedAmount, startTime) => {
  // For simulation, we use a flat rate + small time-based component
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const hoursElapsed = (now - start) / (1000 * 60 * 60);
  
  const baseInterest = borrowedAmount * MARGIN_CONFIG.INTEREST_RATE;
  const timeInterest = borrowedAmount * (0.0001 * hoursElapsed); // 0.01% per hour
  
  return baseInterest + timeInterest;
};

/**
 * Check if a position should be liquidated
 * @param {Object} holding - The holding object with loan info
 * @param {number} currentPrice 
 * @returns {boolean}
 */
export const checkLiquidation = (holding, currentPrice) => {
  if (!holding.loan) return false;
  
  const totalValue = holding.shares * currentPrice;
  const entryValue = holding.shares * holding.avgBuyPrice;
  const loss = entryValue - totalValue;
  
  // Liquidate if loss exceeds 50% of the initial investment (own + borrowed)
  return loss >= (entryValue * MARGIN_CONFIG.LIQUIDATION_THRESHOLD);
};

/**
 * Determine risk level based on loan-to-value
 */
export const getRiskLevel = (borrowed, totalValue) => {
  const ratio = borrowed / totalValue;
  if (ratio > 0.6) return 'HIGH';
  if (ratio > 0.3) return 'MEDIUM';
  return 'LOW';
};
