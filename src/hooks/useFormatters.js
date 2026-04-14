import { useTheme } from '../context/ThemeContext';
import { useCallback } from 'react';
import { EXCHANGE_RATES, SUPPORTED_CURRENCIES } from '../constants';

export const useFormatters = () => {
  const { currency } = useTheme();

  const formatCurrency = useCallback((value) => {
    const rate = EXCHANGE_RATES[currency] || 1;
    const convertedValue = value * rate;

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(convertedValue);
  }, [currency]);

  const formatNumber = useCallback((value) => {
    if (value >= 1e12) return (value / 1e12).toFixed(2) + 'T';
    if (value >= 1e9) return (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return (value / 1e6).toFixed(2) + 'M';
    if (value >= 1e3) return (value / 1e3).toFixed(2) + 'K';
    return value.toString();
  }, []);

  const formatCompactCurrency = useCallback((value) => {
    const rate = EXCHANGE_RATES[currency] || 1;
    const convertedValue = value * rate;
    
    let formatted = '';
    if (convertedValue >= 1e12) formatted = (convertedValue / 1e12).toFixed(2) + 'T';
    else if (convertedValue >= 1e9) formatted = (convertedValue / 1e9).toFixed(2) + 'B';
    else if (convertedValue >= 1e6) formatted = (convertedValue / 1e6).toFixed(2) + 'M';
    else if (convertedValue >= 1e3) formatted = (convertedValue / 1e3).toFixed(2) + 'K';
    else formatted = convertedValue.toFixed(2);

    const symbol = SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol || '$';
    return `${symbol}${formatted}`;
  }, [currency]);

  const formatPercent = useCallback((value) => {
    return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
  }, []);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  return {
    formatCurrency,
    formatCompactCurrency,
    formatNumber,
    formatPercent,
    formatDate
  };
};
