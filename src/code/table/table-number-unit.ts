export const normalizeNumberUnitLabel = (rawUnit: string): string => {
  const unit = String(rawUnit || '').trim();
  if (!unit) return '';
  const upper = unit.toUpperCase();
  if (unit === 'HK$' || upper === 'HKD') return '港币';
  if (unit === 'US$' || upper === 'USD') return '美元';
  if (unit === '¥' || unit === '￥') return '元';
  if (upper === 'CNY' || upper === 'RMB' || upper === 'CNH') return '元';
  if (unit === '$') return '美元';
  if (unit === '€' || upper === 'EUR') return '欧元';
  if (unit === '£' || upper === 'GBP') return '英镑';
  if (['B', 'KB', 'MB', 'GB', 'TB', 'PB'].includes(upper)) return upper;
  return unit;
};
