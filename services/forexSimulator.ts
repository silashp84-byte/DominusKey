
import { Candle, CurrencyPair } from '../types';

const pairBasePrices: Record<CurrencyPair, number> = {
  [CurrencyPair.EURUSD]: 1.08540,
  [CurrencyPair.GBPUSD]: 1.26450,
  [CurrencyPair.USDJPY]: 150.450,
  [CurrencyPair.AUDUSD]: 0.65320,
  [CurrencyPair.USDCAD]: 1.35210,
  [CurrencyPair.USDCHF]: 0.88120,
  [CurrencyPair.BTCUSD]: 62450.00
};

export const generateInitialData = (pair: CurrencyPair, count: number = 100): Candle[] => {
  const data: Candle[] = [];
  let currentPrice = pairBasePrices[pair];
  let time = Date.now() - count * 5 * 60 * 1000;
  
  // Volatility scaling for different price magnitudes (e.g., BTC vs EURUSD)
  const volScale = currentPrice > 1000 ? 50 : currentPrice > 100 ? 0.1 : 0.00015;

  for (let i = 0; i < count; i++) {
    const volatility = volScale;
    const change = (Math.random() - 0.5) * volatility;
    const open = currentPrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 2000) + 500;
    
    data.push({
      timestamp: time,
      open,
      high,
      low,
      close,
      volume
    });
    
    currentPrice = close;
    time += 5 * 60 * 1000;
  }
  return data;
};

export const generateNextTick = (lastCandle: Candle, pair: CurrencyPair): Candle => {
  const basePrice = pairBasePrices[pair];
  const volScale = basePrice > 1000 ? 25 : basePrice > 100 ? 0.05 : 0.00008;
  
  const volatility = volScale;
  const change = (Math.random() - 0.48) * volatility;
  const open = lastCandle.close;
  const close = open + change;
  const high = Math.max(open, close) + Math.random() * volatility * 0.3;
  const low = Math.min(open, close) - Math.random() * volatility * 0.3;
  const volume = Math.floor(Math.random() * 1500) + 1000;
  
  return {
    timestamp: lastCandle.timestamp + 5 * 60 * 1000,
    open,
    high,
    low,
    close,
    volume
  };
};
