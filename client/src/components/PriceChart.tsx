import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import type { CandleData, Period, StockPrice } from '../types';
import { INTRADAY_PERIODS, fmt, fmtCap } from '../utils';

const CHART_PX_PER_BAR = { intraday: 6, default: 8 };
const CHART_EDGE_LOAD_THRESHOLD_PX = 60;

export interface PriceChartHandle {
  replace(history: CandleData[], period: Period): void;
  prependOlder(older: CandleData[]): void;
  updateLive(price: StockPrice): void;
  getOldest(): CandleData | undefined;
  isPinnedToLatest(): boolean;
}

interface Props {
  loadingOlder: boolean;
  onNeedOlder: () => void;
}

const PriceChart = forwardRef<PriceChartHandle, Props>(function PriceChart({ loadingOlder, onNeedOlder }, ref) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const historyDataRef = useRef<CandleData[]>([]);
  const periodRef = useRef<Period>('D');
  const suppressScrollRef = useRef(false);
  const onNeedOlderRef = useRef(onNeedOlder);
  onNeedOlderRef.current = onNeedOlder;

  function drawMainChart() {
    const historyData = historyDataRef.current;
    const labels = historyData.map((c) => c.date);
    const closes = historyData.map((c) => c.close);
    const volumes = historyData.map((c) => c.volume);
    const isUp = closes.length >= 2 ? closes[closes.length - 1] >= closes[0] : true;
    const lineColor = isUp ? '#26a69a' : '#ef5350';
    const fillColor = isUp ? 'rgba(38,166,154,0.1)' : 'rgba(239,83,80,0.1)';

    const wrapper = wrapperRef.current!;
    const inner = innerRef.current!;
    const pxPerBar = INTRADAY_PERIODS.includes(periodRef.current) ? CHART_PX_PER_BAR.intraday : CHART_PX_PER_BAR.default;
    inner.style.width = `${Math.max(wrapper.clientWidth, historyData.length * pxPerBar)}px`;

    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    chartInstanceRef.current = new Chart(canvasRef.current!, {
      data: {
        labels,
        datasets: [
          {
            type: 'line',
            label: '종가',
            data: closes,
            borderColor: lineColor,
            backgroundColor: fillColor,
            borderWidth: 2,
            pointRadius: 0,
            fill: true,
            tension: 0.2,
            yAxisID: 'y',
          },
          {
            type: 'bar',
            label: '거래량',
            data: volumes,
            backgroundColor: 'rgba(92,107,192,0.3)',
            yAxisID: 'yVolume',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1a1d2e',
            borderColor: '#2e3250',
            borderWidth: 1,
            titleColor: '#8892b0',
            bodyColor: '#e8eaf6',
            callbacks: {
              label(ctx) {
                if (ctx.datasetIndex === 0) return `종가: ${fmt(ctx.parsed.y)}`;
                return `거래량: ${fmt(ctx.parsed.y)}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: '#8892b0', maxTicksLimit: 8 },
            grid: { color: '#2e3250' },
          },
          y: {
            position: 'right',
            ticks: { color: '#8892b0', callback: (v) => fmt(v as number) },
            grid: { color: '#2e3250' },
          },
          yVolume: {
            position: 'left',
            ticks: { color: '#8892b0', maxTicksLimit: 4, callback: (v) => fmtCap((v as number) * 1000) },
            grid: { display: false },
          },
        },
      },
    });
  }

  useImperativeHandle(ref, () => ({
    replace(history, period) {
      historyDataRef.current = history;
      periodRef.current = period;
      drawMainChart();

      const wrapper = wrapperRef.current!;
      suppressScrollRef.current = true;
      wrapper.scrollLeft = wrapper.scrollWidth;
      requestAnimationFrame(() => { suppressScrollRef.current = false; });
    },
    prependOlder(older) {
      const wrapper = wrapperRef.current!;
      const oldScrollWidth = wrapper.scrollWidth;
      const oldScrollLeft = wrapper.scrollLeft;

      historyDataRef.current = [...older, ...historyDataRef.current];
      drawMainChart();

      wrapper.scrollLeft = oldScrollLeft + (wrapper.scrollWidth - oldScrollWidth);
    },
    updateLive(price) {
      const chart = chartInstanceRef.current;
      if (!chart || periodRef.current !== 'D') return;
      const [closeDataset, volumeDataset] = chart.data.datasets;
      const lastIdx = (closeDataset.data as number[]).length - 1;
      if (lastIdx < 0) return;

      (closeDataset.data as number[])[lastIdx] = price.currentPrice;
      (volumeDataset.data as number[])[lastIdx] = price.volume;
      chart.update('none');

      const lastCandle = historyDataRef.current[historyDataRef.current.length - 1];
      if (lastCandle) { lastCandle.close = price.currentPrice; lastCandle.volume = price.volume; }
    },
    getOldest() {
      return historyDataRef.current[0];
    },
    isPinnedToLatest() {
      const wrapper = wrapperRef.current!;
      return wrapper.scrollLeft + wrapper.clientWidth >= wrapper.scrollWidth - CHART_EDGE_LOAD_THRESHOLD_PX;
    },
  }), []);

  useEffect(() => {
    const wrapper = wrapperRef.current!;
    function handleScroll(e: Event) {
      if (suppressScrollRef.current) return;
      if ((e.target as HTMLElement).scrollLeft < CHART_EDGE_LOAD_THRESHOLD_PX) onNeedOlderRef.current();
    }
    wrapper.addEventListener('scroll', handleScroll);
    return () => wrapper.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => () => { chartInstanceRef.current?.destroy(); }, []);

  return (
    <div className="chart-wrapper" ref={wrapperRef}>
      <div className={`chart-loading-older${loadingOlder ? '' : ' hidden'}`}>과거 데이터 불러오는 중…</div>
      <div className="chart-inner" ref={innerRef}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
});

export default PriceChart;
