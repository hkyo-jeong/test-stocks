import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { CandleData, StockPrice, WatchlistItem } from '../types';
import StockCard from './StockCard';

const GRID_POLL_MS = 10000;

interface CardState {
  price: StockPrice | null;
  error: boolean;
  history: CandleData[] | null;
}

interface Props {
  watchlist: WatchlistItem[];
  currentSymbol: string | null;
  onSelect: (symbol: string) => void;
  onRemove: (symbol: string) => void;
}

export default function WatchlistGrid({ watchlist, currentSymbol, onSelect, onRemove }: Props) {
  const [cards, setCards] = useState<Record<string, CardState>>({});
  const watchlistRef = useRef(watchlist);
  watchlistRef.current = watchlist;

  async function refreshPrice(symbol: string) {
    try {
      const price = await api.getPrice(symbol);
      setCards((prev) => ({ ...prev, [symbol]: { ...prev[symbol], price, error: false, history: prev[symbol]?.history ?? null } }));
      return price;
    } catch {
      setCards((prev) => ({ ...prev, [symbol]: { ...prev[symbol], price: prev[symbol]?.price ?? null, error: !prev[symbol]?.price, history: prev[symbol]?.history ?? null } }));
      return null;
    }
  }

  // 관심종목이 바뀔 때 새로 추가된 종목의 카드 틀 + 가격 + 스파크라인을 로드한다.
  useEffect(() => {
    setCards((prev) => {
      const next: Record<string, CardState> = {};
      for (const w of watchlist) {
        next[w.symbol] = prev[w.symbol] ?? { price: null, error: false, history: null };
      }
      return next;
    });

    watchlist.forEach(async (w) => {
      const price = await refreshPrice(w.symbol);
      if (!price) return;
      try {
        const history = await api.getHistory(w.symbol, 'D', 30);
        setCards((prev) => ({ ...prev, [w.symbol]: { ...prev[w.symbol], history } }));
      } catch {
        // 스파크라인은 부가 정보이므로 실패해도 가격 표시는 유지한다
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.map((w) => w.symbol).join(',')]);

  // 카드 가격/거래량 주기적 갱신
  useEffect(() => {
    if (watchlist.length === 0) return;
    const timer = setInterval(() => {
      if (document.hidden || watchlistRef.current.length === 0) return;
      watchlistRef.current.forEach((w) => refreshPrice(w.symbol));
    }, GRID_POLL_MS);
    return () => clearInterval(timer);
  }, [watchlist.length > 0]);

  if (watchlist.length === 0) {
    return <p className="empty-msg">종목을 검색한 뒤 ☆ 버튼으로 추가하면 여기서 한눈에 볼 수 있습니다.</p>;
  }

  return (
    <div className="stocks-grid">
      {watchlist.map((w) => {
        const card = cards[w.symbol];
        return (
          <StockCard
            key={w.symbol}
            item={w}
            price={card?.price ?? null}
            priceError={card?.error ?? false}
            history={card?.history ?? null}
            active={w.symbol === currentSymbol}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        );
      })}
    </div>
  );
}
