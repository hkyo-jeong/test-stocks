import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { SearchResult } from '../types';

export default function SearchBox({ onSelect }: { onSelect: (symbol: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [open, setOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (!sectionRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  async function doSearch() {
    const q = query.trim();
    if (!q) return;
    try {
      const found = await api.search(q);
      setResults(found);
      setOpen(true);
    } catch (e) {
      alert('검색 오류: ' + (e as Error).message);
    }
  }

  function pick(r: SearchResult) {
    setOpen(false);
    setQuery('');
    onSelect(r.symbol);
  }

  return (
    <section className="search-section" ref={sectionRef}>
      <div className="search-box">
        <input
          type="text"
          placeholder="종목명 또는 코드 검색 (예: 삼성전자, 005930)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
        />
        <button onClick={doSearch}>검색</button>
      </div>
      <ul className={`search-results${open ? '' : ' hidden'}`}>
        {results && results.length === 0 && (
          <li><span className="result-name" style={{ color: 'var(--text-muted)' }}>검색 결과가 없습니다.</span></li>
        )}
        {results && results.map((r) => (
          <li key={r.symbol} onClick={() => pick(r)}>
            <span className="result-name">{r.name}</span>
            <span className="result-meta">{r.symbol} · {r.market}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
