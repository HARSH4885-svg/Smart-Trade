export const COLORS = {
  background: '#0A0E1A',
  surface: '#111827',
  border: '#1F2937',
  primary: '#3B82F6',
  success: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF'
};

export const INITIAL_BALANCE = 100000;

export const STORAGE_KEYS = {
  USER: 'stp_user',
  PORTFOLIO: 'stp_portfolio',
  SETTINGS: 'stp_settings'
};

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'CAD', symbol: '$', name: 'Canadian Dollar' }
];

export const EXCHANGE_RATES = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 151.6,
  INR: 83.3,
  CAD: 1.36
};
