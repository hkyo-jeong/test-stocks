import type { Orderbook as OrderbookType, OrderbookLevel } from '../types';
import { fmt } from '../utils';

function DepthRow({ level, maxVolume, side }: { level: OrderbookLevel; maxVolume: number; side: 'ask' | 'bid' }) {
  const pct = Math.max(2, Math.round((level.volume / maxVolume) * 100));
  return (
    <div className={`depth-row ${side}`}>
      <span className="depth-bar" style={{ width: `${pct}%` }} />
      <span className="depth-price">{fmt(level.price)}</span>
      <span className="depth-volume">{fmt(level.volume)}</span>
    </div>
  );
}

export default function Orderbook({ orderbook }: { orderbook: OrderbookType | null | undefined }) {
  if (orderbook === null) {
    return <p className="depth-unsupported">이 브로커리지는 호가 조회를 지원하지 않습니다.</p>;
  }
  if (!orderbook) return null;

  const maxVolume = Math.max(1, ...orderbook.asks.map((l) => l.volume), ...orderbook.bids.map((l) => l.volume));

  return (
    <div className="orderbook-body">
      {[...orderbook.asks].reverse().map((l, i) => <DepthRow key={`ask-${i}`} level={l} maxVolume={maxVolume} side="ask" />)}
      <div className="orderbook-divider" />
      {orderbook.bids.map((l, i) => <DepthRow key={`bid-${i}`} level={l} maxVolume={maxVolume} side="bid" />)}
    </div>
  );
}
