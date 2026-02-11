
import React, { useMemo, useRef } from 'react';
import { Candle, Projection, MarketSession } from '../types';

interface ForexChartProps {
  data: Candle[];
  projections: Projection[];
  dailyHigh: number;
  dailyLow: number;
  session: MarketSession;
  precision?: number;
}

const ForexChart: React.FC<ForexChartProps> = ({ data, projections, dailyHigh, dailyLow, session, precision = 5 }) => {
  const width = 1200;
  const height = 600;
  const margin = { top: 30, right: 85, bottom: 60, left: 10 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const { minPrice, maxPrice, priceRange } = useMemo(() => {
    if (data.length === 0) return { minPrice: 0, maxPrice: 1, priceRange: 1 };
    const prices = data.flatMap(d => [d.high, d.low]);
    const min = Math.min(...prices) * 0.9998;
    const max = Math.max(...prices) * 1.0002;
    return { minPrice: min, maxPrice: max, priceRange: max - min };
  }, [data]);

  const getY = (price: number) => innerHeight - ((price - minPrice) / priceRange) * innerHeight + margin.top;
  const getX = (index: number) => (index / (data.length - 1)) * innerWidth + margin.left;

  const candleWidth = (innerWidth / data.length) * 0.75;

  const generatePath = (key: 'ema10' | 'ema20' | 'ema50') => {
    return data
      .map((d, i) => {
        const val = d[key];
        if (val === undefined) return null;
        return `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(val)}`;
      })
      .filter(p => p !== null)
      .join(' ');
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden">
      <div className="absolute top-3 right-3 px-2 py-1 bg-slate-800/90 rounded border border-slate-700 text-[9px] sm:text-xs font-bold text-slate-300 z-10 pointer-events-none">
        {session.toUpperCase()}
      </div>

      <svg 
        width="100%" 
        height="100%" 
        viewBox={`0 0 ${width} ${height}`} 
        preserveAspectRatio="xMidYMid slice"
        className="block"
      >
        {/* Grid Horizontal */}
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((p, i) => {
          const price = minPrice + (maxPrice - minPrice) * p;
          const y = getY(price);
          return (
            <g key={i}>
              <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="#1e293b" strokeWidth="1" />
              <text x={width - margin.right + 5} y={y + 4} fill="#475569" fontSize="14" className="mono font-medium">
                {price.toFixed(precision)}
              </text>
            </g>
          );
        })}

        {/* Linhas de Máxima/Mínima */}
        <line x1={margin.left} y1={getY(dailyHigh)} x2={width - margin.right} y2={getY(dailyHigh)} stroke="#22c55e" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.5" />
        <line x1={margin.left} y1={getY(dailyLow)} x2={width - margin.right} y2={getY(dailyLow)} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 5" opacity="0.5" />

        {/* Volume */}
        {data.map((d, i) => {
          const vMax = Math.max(...data.map(cd => cd.volume));
          const vHeight = (d.volume / vMax) * 80;
          return (
            <rect
              key={`vol-${i}`}
              x={getX(i) - candleWidth / 2}
              y={height - margin.bottom - vHeight}
              width={candleWidth}
              height={vHeight}
              fill={d.close >= d.open ? '#22c55e' : '#ef4444'}
              opacity="0.15"
            />
          );
        })}

        {/* Candlesticks */}
        {data.map((d, i) => {
          const x = getX(i);
          const color = d.close >= d.open ? '#22c55e' : '#ef4444';
          return (
            <g key={i}>
              <line x1={x} y1={getY(d.high)} x2={x} y2={getY(d.low)} stroke={color} strokeWidth="1.2" />
              <rect
                x={x - candleWidth / 2}
                y={getY(Math.max(d.open, d.close))}
                width={candleWidth}
                height={Math.max(1.5, Math.abs(getY(d.open) - getY(d.close)))}
                fill={color}
                rx="1"
              />
            </g>
          );
        })}

        {/* Médias Móveis */}
        <path d={generatePath('ema10')} fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.9" />
        <path d={generatePath('ema20')} fill="none" stroke="#f59e0b" strokeWidth="2" opacity="0.9" />
        <path d={generatePath('ema50')} fill="none" stroke="#8b5cf6" strokeWidth="2" opacity="0.9" />

        {/* Projeções */}
        {projections.map((proj, idx) => (
          <g key={idx}>
             <polyline
                points={proj.points.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={proj.color}
                strokeWidth="3"
                strokeDasharray={proj.type === 'whip' ? 'none' : '6 4'}
                className={proj.type === 'whip' ? 'animate-pulse' : ''}
              />
              {proj.type === 'whip' && (
                <text x={proj.points[proj.points.length-1].x} y={proj.points[proj.points.length-1].y - 12} fill="white" fontSize="14" fontWeight="black" textAnchor="end">ALTA WHIP</text>
              )}
          </g>
        ))}
      </svg>

      {/* Legenda Otimizada */}
      <div className="absolute bottom-2 left-2 flex gap-3 text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase pointer-events-none">
        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 10</div>
        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> 20</div>
        <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> 50</div>
      </div>
    </div>
  );
};

export default ForexChart;
