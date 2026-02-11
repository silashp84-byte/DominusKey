
import React, { useEffect, useState } from 'react';
import { Alert } from '../types';

interface MarketAlertsProps {
  alerts: Alert[];
}

const MarketAlerts: React.FC<MarketAlertsProps> = ({ alerts }) => {
  const [visibleAlerts, setVisibleAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    setVisibleAlerts(alerts.slice(-2).reverse()); // Reduzido para 2 alertas em mobile para economizar espaço
  }, [alerts]);

  return (
    <div className="absolute top-2 left-2 z-40 flex flex-col gap-1.5 pointer-events-none max-w-[85%] sm:max-w-xs">
      {visibleAlerts.map((alert) => (
        <div 
          key={alert.id}
          className={`
            px-3 py-1.5 rounded border shadow-lg backdrop-blur-md transition-all duration-500
            ${alert.severity === 'critical' ? 'bg-red-900/50 border-red-500 text-red-50' : 
              alert.severity === 'warning' ? 'bg-amber-900/50 border-amber-500 text-amber-50' : 
              'bg-slate-900/70 border-slate-700 text-slate-100'}
          `}
        >
          <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-tighter mb-0.5 opacity-80">
            <i className={`fas ${alert.type === 'volume' ? 'fa-signal' : alert.type === 'crossover' ? 'fa-bolt' : 'fa-info-circle'}`}></i>
            {alert.type}
          </div>
          <p className="text-[10px] sm:text-xs font-bold leading-tight line-clamp-2">{alert.message}</p>
        </div>
      ))}
    </div>
  );
};

export default MarketAlerts;
