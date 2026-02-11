
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Candle, Alert, Projection, MarketSession, MarketCycle, CurrencyPair } from './types';
import { generateInitialData, generateNextTick } from './services/forexSimulator';
import { calculateEMA, getDailyRange, detectMarketCycle, getCurrentSession } from './services/technicalIndicators';
import ForexChart from './components/ForexChart';
import MarketAlerts from './components/MarketAlerts';

const App: React.FC = () => {
  const [selectedPair, setSelectedPair] = useState<CurrencyPair>(CurrencyPair.EURUSD);
  const [data, setData] = useState<Candle[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [projections, setProjections] = useState<Projection[]>([]);
  const [currentSession, setCurrentSession] = useState<MarketSession>(getCurrentSession());
  const [marketCycle, setMarketCycle] = useState<MarketCycle>(MarketCycle.ACCUMULATION);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const lastAlertTime = useRef<number>(0);

  const processData = useCallback((raw: Candle[]) => {
    if (raw.length === 0) return [];
    const ema10 = calculateEMA(raw, 10);
    const ema20 = calculateEMA(raw, 20);
    const ema50 = calculateEMA(raw, 50);
    const ema5 = calculateEMA(raw, 5);

    return raw.map((c, i) => ({
      ...c,
      ema10: ema10[i],
      ema20: ema20[i],
      ema50: ema50[i],
      ema5: ema5[i]
    }));
  }, []);

  // Initialize data when pair changes
  useEffect(() => {
    const initial = generateInitialData(selectedPair, 100);
    setData(processData(initial));
    setProjections([]); // Reset projections on pair change
    addAlert('cycle', `Monitorando ${selectedPair}`, 'info');
  }, [selectedPair, processData]);

  const addAlert = useCallback((type: Alert['type'], message: string, severity: Alert['severity'] = 'info') => {
    const newAlert: Alert = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message,
      timestamp: Date.now(),
      severity
    };
    setAlerts(prev => [...prev, newAlert]);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const next = generateNextTick(last, selectedPair);
        const newData = [...prev.slice(1), next];
        return processData(newData);
      });

      setCurrentSession(getCurrentSession());
      
      const now = Date.now();
      if (now - lastAlertTime.current > 30000) {
        lastAlertTime.current = now;
        const lastCandle = data[data.length - 1];
        if (lastCandle) {
          const strength = lastCandle.volume > 2000 ? 'ALTA' : lastCandle.volume > 1200 ? 'MÉDIA' : 'BAIXA';
          addAlert('volume', `Força Volume: ${strength} (${lastCandle.volume})`, strength === 'ALTA' ? 'warning' : 'info');
          const cycle = detectMarketCycle(data);
          setMarketCycle(cycle);
          addAlert('cycle', `Ciclo ${selectedPair}: ${cycle}`, 'info');
        }

        if (data.length > 2) {
          const prev = data[data.length - 2];
          const curr = data[data.length - 1];
          if (curr.volume > 1500 && prev.ema5 && prev.ema10 && curr.ema5 && curr.ema10) {
            if (prev.ema5 < prev.ema10 && curr.ema5 > curr.ema10) {
              addAlert('crossover', `Cruzamento Altista 5/10 EMA em ${selectedPair}!`, 'critical');
            } else if (prev.ema5 > prev.ema10 && curr.ema5 < curr.ema10) {
              addAlert('crossover', `Cruzamento Baixista 5/10 EMA em ${selectedPair}!`, 'critical');
            }
          }
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [data, addAlert, selectedPair, processData]);

  const { high: dailyHigh, low: dailyLow } = getDailyRange(data);

  const handleManualProjection = (dir: 'UP' | 'DOWN', minutes: number) => {
    const last = data[data.length - 1];
    if (!last) return;
    const chartWidth = 1200;
    const chartHeight = 600;
    const margin = { top: 40, right: 80, bottom: 80, left: 20 };
    const innerWidth = chartWidth - margin.left - margin.right;
    const innerHeight = chartHeight - margin.top - margin.bottom;

    const prices = data.flatMap(d => [d.high, d.low]);
    const minP = Math.min(...prices) * 0.9998;
    const maxP = Math.max(...prices) * 1.0002;
    const pRange = maxP - minP;

    const getY = (price: number) => innerHeight - ((price - minP) / pRange) * innerHeight + margin.top;
    const getX = (index: number) => (index / (data.length - 1)) * innerWidth + margin.left;

    const startX = getX(data.length - 1);
    const startY = getY(last.close);
    const endX = startX + (minutes / 5) * (innerWidth / data.length);
    const endY = dir === 'UP' ? startY - 40 : startY + 40;

    const newProjection: Projection = {
      type: 'manual',
      points: [{ x: startX, y: startY }, { x: endX, y: endY }],
      color: dir === 'UP' ? '#4ade80' : '#f87171',
      duration: minutes
    };

    setProjections(prev => [...prev, newProjection]);
    addAlert('projection', `Projeção ${minutes}m ${dir} mapeada`, 'info');
    setTimeout(() => setProjections(prev => prev.filter(p => p !== newProjection)), 10000);
  };

  const applyWhipMethod = () => {
    const last = data[data.length - 1];
    if (!last) return;
    const chartWidth = 1200;
    const margin = { left: 20, right: 80 };
    const innerWidth = chartWidth - margin.left - margin.right;
    const prices = data.flatMap(d => [d.high, d.low]);
    const minP = Math.min(...prices) * 0.9998;
    const maxP = Math.max(...prices) * 1.0002;
    const pRange = maxP - minP;
    const getY = (price: number) => 600 - 120 - ((price - minP) / pRange) * (600 - 120) + 40;
    const getX = (index: number) => (index / (data.length - 1)) * innerWidth + margin.left;

    const startX = getX(data.length - 1);
    const startY = getY(last.close);
    
    const whipProj: Projection = {
      type: 'whip',
      points: [
        { x: startX, y: startY },
        { x: startX + 20, y: startY + 15 },
        { x: startX + 60, y: startY - 60 }
      ],
      color: '#ffffff',
      duration: 15
    };
    
    setProjections(prev => [...prev, whipProj]);
    addAlert('projection', 'Projeção Método Whip Ativada', 'warning');
    setTimeout(() => setProjections(prev => prev.filter(p => p !== whipProj)), 15000);
  };

  const getPricePrecision = (pair: CurrencyPair) => {
    if (pair.includes('JPY')) return 3;
    if (pair.includes('BTC')) return 2;
    return 5;
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header Mobile Friendly */}
      <header className="h-14 sm:h-16 flex items-center justify-between px-4 sm:px-6 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded flex items-center justify-center">
            <i className="fas fa-chart-line text-white text-xs sm:text-base"></i>
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm sm:text-xl font-bold tracking-tight leading-none">NEXUS<span className="text-blue-500">FX</span></h1>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium uppercase">{selectedPair}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-right">
            <div className={`text-sm sm:text-lg font-bold mono ${data[data.length-1]?.close > data[data.length-1]?.open ? 'text-green-400' : 'text-red-400'}`}>
              {data[data.length - 1]?.close.toFixed(getPricePrecision(selectedPair))}
            </div>
            <div className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ao Vivo</div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="sm:hidden w-8 h-8 flex items-center justify-center bg-slate-800 rounded border border-slate-700"
          >
            <i className={`fas ${isSidebarOpen ? 'fa-times' : 'fa-bars'} text-slate-300`}></i>
          </button>
        </div>
      </header>

      {/* Pair Selector Strip */}
      <div className="h-10 sm:h-12 bg-slate-900/50 border-b border-slate-800 overflow-x-auto flex items-center gap-2 px-2 no-scrollbar scroll-smooth">
        {Object.values(CurrencyPair).map((pair) => (
          <button
            key={pair}
            onClick={() => setSelectedPair(pair)}
            className={`
              whitespace-nowrap px-4 py-1 rounded-full text-[10px] sm:text-xs font-bold transition-all
              ${selectedPair === pair ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.4)]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
            `}
          >
            {pair}
          </button>
        ))}
      </div>

      {/* Main Container */}
      <main className="flex-1 flex flex-col sm:flex-row overflow-hidden p-2 sm:p-4 gap-2 sm:gap-4">
        {/* Chart Area */}
        <div className="flex-1 relative flex flex-col gap-2 sm:gap-4 min-w-0">
          <MarketAlerts alerts={alerts} />
          
          <div className="flex-1 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
            <ForexChart 
              data={data} 
              projections={projections} 
              dailyHigh={dailyHigh} 
              dailyLow={dailyLow} 
              session={currentSession}
              precision={getPricePrecision(selectedPair)}
            />
          </div>

          {/* Mobile Controls Panel */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 flex flex-col gap-3 shrink-0">
            <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 sm:gap-3">
              <button 
                onClick={() => handleManualProjection('UP', 5)}
                className="flex-1 py-2 sm:px-4 bg-green-600/20 text-green-400 border border-green-500/30 rounded-lg font-bold text-[10px] sm:text-sm active:scale-95 transition-transform"
              >
                <i className="fas fa-arrow-trend-up mr-1 sm:mr-2"></i> 5m ALTA
              </button>
              <button 
                onClick={() => handleManualProjection('UP', 15)}
                className="flex-1 py-2 sm:px-4 bg-green-600/20 text-green-400 border border-green-500/30 rounded-lg font-bold text-[10px] sm:text-sm active:scale-95 transition-transform"
              >
                <i className="fas fa-bolt mr-1 sm:mr-2"></i> 15m ALTA
              </button>
              <button 
                onClick={() => handleManualProjection('DOWN', 5)}
                className="flex-1 py-2 sm:px-4 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg font-bold text-[10px] sm:text-sm active:scale-95 transition-transform"
              >
                <i className="fas fa-arrow-trend-down mr-1 sm:mr-2"></i> 5m QUEDA
              </button>
              <button 
                onClick={() => handleManualProjection('DOWN', 15)}
                className="flex-1 py-2 sm:px-4 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg font-bold text-[10px] sm:text-sm active:scale-95 transition-transform"
              >
                <i className="fas fa-bolt mr-1 sm:mr-2"></i> 15m QUEDA
              </button>
            </div>

            <button 
              onClick={applyWhipMethod}
              className="w-full py-2.5 bg-white text-slate-950 font-black rounded-lg text-[11px] sm:text-sm shadow-[0_0_15px_rgba(255,255,255,0.2)] active:bg-slate-200"
            >
              <i className="fas fa-magic mr-2"></i> PROJETAR MÉTODO WHIP (ALTA)
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <aside className={`
          ${isSidebarOpen ? 'fixed inset-0 z-[100] flex flex-col bg-slate-950/90 backdrop-blur-sm p-4' : 'hidden'}
          sm:relative sm:flex sm:flex-col sm:inset-auto sm:w-72 sm:bg-transparent sm:p-0 sm:z-auto shrink-0 transition-all
        `}>
          <div className="bg-slate-900 rounded-xl border border-slate-800 flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <i className="fas fa-list"></i> ESTATÍSTICAS DO MERCADO
              </h2>
              <button onClick={() => setIsSidebarOpen(false)} className="sm:hidden text-slate-500">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 block mb-1">Máxima do Dia</span>
                  <span className="text-green-400 font-bold mono text-sm">{dailyHigh.toFixed(getPricePrecision(selectedPair))}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 block mb-1">Mínima do Dia</span>
                  <span className="text-red-400 font-bold mono text-sm">{dailyLow.toFixed(getPricePrecision(selectedPair))}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3">Ciclo Atual: {marketCycle}</h3>
                <div className="space-y-2">
                  {alerts.slice(-8).reverse().map(alert => (
                    <div key={alert.id} className="text-[10px] p-2 bg-slate-950 rounded border border-slate-800">
                      <div className="flex justify-between items-center mb-1">
                         <span className={`px-1 rounded text-[8px] font-bold ${alert.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                           {alert.type}
                         </span>
                         <span className="text-slate-600">{new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="font-medium text-slate-300 line-clamp-1">{alert.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-800/50 border-t border-slate-800 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Par:</span>
                <span className="text-slate-100 font-bold">{selectedPair}</span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default App;
