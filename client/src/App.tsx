import { useEffect, useState } from 'react';
import { api } from './api';
import { useWatchlist } from './hooks/useWatchlist';
import type { StockPrice } from './types';
import SearchBox from './components/SearchBox';
import WatchlistGrid from './components/WatchlistGrid';
import StockDetail from './components/StockDetail';

export default function App() {
  const [brokerage, setBrokerage] = useState('');
  const [currentSymbol, setCurrentSymbol] = useState<string | null>(null);
  const { watchlist, add, remove, has } = useWatchlist();

  useEffect(() => {
    api.getBrokerageInfo().then(({ brokerage }) => setBrokerage(brokerage)).catch(() => {});
  }, []);

  function selectStock(symbol: string) {
    setCurrentSymbol(symbol);
  }

  function removeFromWatchlist(symbol: string) {
    remove(symbol);
    if (currentSymbol === symbol) setCurrentSymbol(null);
  }

  function toggleWatchlist(currentPrice: StockPrice | null) {
    if (!currentSymbol) return;
    if (has(currentSymbol)) {
      removeFromWatchlist(currentSymbol);
    } else if (currentPrice) {
      add({ symbol: currentPrice.symbol, name: currentPrice.name, market: currentPrice.market });
    }
  }

  return (
    <div className="layout">
      <header className="header">
        <h1 className="logo">📈 주식 정보</h1>
        <div className="badge">{brokerage}</div>
      </header>

      <main className="main">
        <SearchBox onSelect={selectStock} />

        <section className="grid-section">
          <div className="grid-section-header">
            <h2 className="section-title">관심종목</h2>
            {watchlist.length > 0 && <span className="count-badge">{watchlist.length}</span>}
          </div>
          <WatchlistGrid
            watchlist={watchlist}
            currentSymbol={currentSymbol}
            onSelect={selectStock}
            onRemove={removeFromWatchlist}
          />
        </section>

        {currentSymbol && (
          <StockDetail
            key={currentSymbol}
            symbol={currentSymbol}
            isWatchlisted={has(currentSymbol)}
            onToggleWatchlist={toggleWatchlist}
            onClose={() => setCurrentSymbol(null)}
          />
        )}
      </main>
    </div>
  );
}
