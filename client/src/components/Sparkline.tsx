import { useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import type { CandleData } from '../types';

export default function Sparkline({ history }: { history: CandleData[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || history.length === 0) return;

    const closes = history.map((c) => c.close);
    const isUp = closes.length >= 2 ? closes[closes.length - 1] >= closes[0] : true;
    const color = isUp ? '#26a69a' : '#ef5350';
    const fill = isUp ? 'rgba(38,166,154,0.12)' : 'rgba(239,83,80,0.12)';

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: history.map((c) => c.date),
        datasets: [{
          data: closes,
          borderColor: color,
          backgroundColor: fill,
          borderWidth: 1.5,
          fill: true,
          tension: 0.3,
          pointRadius: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [history]);

  return (
    <div className="card-sparkline-wrapper">
      <canvas ref={canvasRef} />
    </div>
  );
}
