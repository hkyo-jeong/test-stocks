import type { BuySellSummary } from '../types';
import { fmt } from '../utils';

export default function BuySell({ buysell }: { buysell: BuySellSummary | null | undefined }) {
  if (buysell === null) {
    return <p className="depth-unsupported">이 브로커리지는 매수/매도 추정을 지원하지 않습니다.</p>;
  }
  if (!buysell) return null;

  const total = buysell.buyVolume + buysell.sellVolume || 1;
  const buyPct = Math.round((buysell.buyVolume / total) * 100);

  return (
    <div className="buysell-body">
      <div className="buysell-bar">
        <div className="buysell-buy" style={{ width: `${buyPct}%` }} />
        <div className="buysell-sell" style={{ width: `${100 - buyPct}%` }} />
      </div>
      <div className="buysell-legend">
        <span><span className="legend-dot buy" />매수 <b>{fmt(buysell.buyVolume)} ({buyPct}%)</b></span>
        <span><span className="legend-dot sell" />매도 <b>{fmt(buysell.sellVolume)} ({100 - buyPct}%)</b></span>
      </div>
      <p className="depth-note">직전 체결가 대비 상승 체결=매수, 하락 체결=매도로 근사한 값입니다. 실제 매수/매도 체결 주체와 다를 수 있습니다.</p>
    </div>
  );
}
