
export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ema10?: number;
  ema20?: number;
  ema50?: number;
  ema5?: number;
}

export enum CurrencyPair {
  EURUSD = 'EUR/USD',
  GBPUSD = 'GBP/USD',
  USDJPY = 'USD/JPY',
  AUDUSD = 'AUD/USD',
  USDCAD = 'USD/CAD',
  USDCHF = 'USD/CHF',
  BTCUSD = 'BTC/USD'
}

export enum MarketSession {
  SYDNEY = 'Sydney',
  TOKYO = 'Tokyo',
  LONDON = 'London',
  NEW_YORK = 'New York',
  OFF_HOURS = 'Off-Hours'
}

export enum MarketCycle {
  ACCUMULATION = 'Accumulation',
  TRENDING_UP = 'Trending Up (Markup)',
  DISTRIBUTION = 'Distribution',
  TRENDING_DOWN = 'Trending Down (Markdown)',
  SIDEWAYS = 'Sideways/Ranging'
}

export interface Alert {
  id: string;
  type: 'volume' | 'crossover' | 'cycle' | 'projection';
  message: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
}

export interface Projection {
  type: 'liquidity' | 'whip' | 'manual';
  points: { x: number; y: number }[];
  color: string;
  duration: number; // minutes
}
