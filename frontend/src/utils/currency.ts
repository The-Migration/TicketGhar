/**
 * Currency formatting utilities
 */

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  if (isNaN(amount)) {
    return '$0.00';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported currencies
    return `${currency} ${amount.toFixed(2)}`;
  }
};

export const parseCurrency = (value: string): number => {
  // Remove currency symbols and parse as float
  const cleaned = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    INR: '₹',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'CHF',
    CNY: '¥',
    KRW: '₩',
  };

  return symbols[currency] || currency;
};

export const formatPrice = (amount: number, currency: string = 'USD'): string => {
  return formatCurrency(amount, currency);
};
