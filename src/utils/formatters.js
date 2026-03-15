export const formatCurrency = (amount, currency = '$') => {
  if (amount === null || amount === undefined || isNaN(amount)) return `${currency}0.00`;
  return `${currency}${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (date) => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric' });
  } catch { return '—'; }
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleString('en-GB', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  } catch { return '—'; }
};

export const formatNumber = (n) =>
  n == null ? '0' : Number(n).toLocaleString('en-US');

export const formatPercent = (n, showSign = true) =>
  n == null ? '0%' : `${showSign && n > 0 ? '+' : ''}${Number(n).toFixed(1)}%`;

export const truncate = (text, max = 30) =>
  !text ? '' : text.length > max ? `${text.slice(0, max)}…` : text;

export const today = () => new Date().toISOString().split('T')[0];
