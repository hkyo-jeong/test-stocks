import type { CandleData, StockPrice, WatchlistItem } from '../types';
import { changeClass, changeSign, fmt } from '../utils';
import Sparkline from './Sparkline';

interface Props {
  item: WatchlistItem;
  price: StockPrice | null;
  priceError: boolean;
  history: CandleData[] | null;
  active: boolean;
  onSelect: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

export default function StockCard({ item, price, priceError, history, active, onSelect, onRemove }: Props) {
  return (
    <div
      className={`stock-card${active ? ' active' : ''}`}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('.card-remove')) onSelect(item.symbol);
      }}
    >
      <div className="card-header-row">
        <div>
          <span className="card-name">{item.name}</span>
          <span className="card-sub">{item.symbol}{item.market ? ` · ${item.market}` : ''}</span>
        </div>
        <button
          className="card-remove"
          title="삭제"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.symbol);
          }}
        >
          ✕
        </button>
      </div>

      {priceError ? (
        <div className="card-price" style={{ color: 'var(--down)' }}>오류</div>
      ) : (
        <div className="card-price" style={price ? undefined : { color: 'var(--text-muted)' }}>
          {price ? fmt(price.currentPrice) : '-'}
        </div>
      )}
      <div className={`card-change ${price ? changeClass(price.changePrice) : ''}`} style={price ? undefined : { color: 'var(--text-muted)' }}>
        {price ? `${changeSign(price.changePrice)} (${changeSign(Math.round(price.changeRate * 100) / 100)}%)` : '-'}
      </div>
      <div className="card-volume">
        <span className="live-dot" />거래량 {price ? fmt(price.volume) : '-'}
      </div>

      {history && history.length > 0 && <Sparkline history={history} />}
    </div>
  );
}
