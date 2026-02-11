
import { Candle, MarketCycle, MarketSession } from '../types';

export const calculateEMA = (data: Candle[], period: number): number[] => {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prevEMA = data[0].close;
  
  data.forEach((candle, i) => {
    if (i === 0) {
      result.push(candle.close);
    } else {
      const currentEMA = candle.close * k + prevEMA * (1 - k);
      result.push(currentEMA);
      prevEMA = currentEMA;
    }
  });
  return result;
};

export const getDailyRange = (data: Candle[]) => {
  if (data.length === 0) return { high: 0, low: 0 };
  const last24h = data.slice(-288); // Assuming 5m candles, 288 in a day
  return {
    high: Math.max(...last24h.map(c => c.high)),
    low: Math.min(...last24h.map(c => c.low))
  };
};

export const detectMarketCycle = (data: Candle[]): MarketCycle => {
  if (data.length < 50) return MarketCycle.SIDEWAYS;
  
  const last50 = data.slice(-50);
  const ema50 = calculateEMA(data, 50).slice(-1)[0];
  const ema20 = calculateEMA(data, 20).slice(-1)[0];
  const firstPrice = last50[0].close;
  const lastPrice = last50[last50.length - 1].close;
  
  const returns = (lastPrice - firstPrice) / firstPrice;
  
  if (Math.abs(returns) < 0.001) return MarketCycle.ACCUMULATION;
  if (ema20 > ema50 && returns > 0.002) return MarketCycle.TRENDING_UP;
  if (ema20 < ema50 && returns < -0.002) return MarketCycle.TRENDING_DOWN;
  
  return MarketCycle.SIDEWAYS;
};

export const getCurrentSession = (): MarketSession => {
  const hour = new Date().getUTCHours();
  
  if (hour >= 22 || hour < 7) return MarketSession.SYDNEY;
  if (hour >= 0 && hour < 9) return MarketSession.TOKYO;
  if (hour >= 8 && hour < 17) return MarketSession.LONDON;
  if (hour >= 13 && hour < 22) return MarketSession.NEW_YORK;
  
  return MarketSession.OFF_HOURS;
};
