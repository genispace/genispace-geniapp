import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function formatNumber(num: number) {
  if (!num) return '0';
  return num.toLocaleString('zh-CN');
}

export function formatLargeNumber(num: number, precision: number = 1): string {
  if (!num || num === 0) return '0';

  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (absNum < 1000) {
    return sign + absNum.toLocaleString('zh-CN');
  }

  const units = [
    { value: 1e12, symbol: 'T' },  
    { value: 1e9, symbol: 'B' },   
    { value: 1e6, symbol: 'M' },   
    { value: 1e3, symbol: 'K' }    
  ];

  for (const unit of units) {
    if (absNum >= unit.value) {
      const formatted = (absNum / unit.value).toFixed(precision);

      const cleaned = formatted.replace(/\.?0+$/, '');
      return sign + cleaned + unit.symbol;
    }
  }

  return sign + absNum.toLocaleString('zh-CN');
}

export function formatTokens(tokens: number, showUnit: boolean = true): string {
  const formatted = formatLargeNumber(tokens);
  return showUnit ? formatted : formatted.replace(/[KMBT]$/, '');
}
