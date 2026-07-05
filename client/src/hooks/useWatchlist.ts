import { useCallback, useState } from 'react';
import type { WatchlistItem } from '../types';

const STORAGE_KEY = 'watchlist';

function loadWatchlist(): WatchlistItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(loadWatchlist);

  const add = useCallback((item: WatchlistItem) => {
    setWatchlist((prev) => {
      if (prev.some((w) => w.symbol === item.symbol)) return prev;
      const next = [...prev, item];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const remove = useCallback((symbol: string) => {
    setWatchlist((prev) => {
      const next = prev.filter((w) => w.symbol !== symbol);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const has = useCallback((symbol: string) => watchlist.some((w) => w.symbol === symbol), [watchlist]);

  return { watchlist, add, remove, has };
}
