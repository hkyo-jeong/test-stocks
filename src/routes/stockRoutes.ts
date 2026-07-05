import { Router, Request, Response } from 'express';
import { BrokerageAdapter } from '../adapters/BrokerageAdapter';
import { Period } from '../types/stock';

export function createStockRoutes(adapter: BrokerageAdapter): Router {
  const router = Router();

  router.get('/info', (_req: Request, res: Response) => {
    res.json({ brokerage: adapter.name });
  });

  router.get('/search', async (req: Request, res: Response) => {
    const q = (req.query.q as string) ?? '';
    if (!q.trim()) {
      res.status(400).json({ error: '검색어를 입력하세요.' });
      return;
    }
    try {
      const results = await adapter.searchStocks(q);
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:symbol', async (req: Request, res: Response) => {
    try {
      const price = await adapter.getStockPrice(req.params.symbol);
      res.json(price);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:symbol/history', async (req: Request, res: Response) => {
    const raw = (req.query.period as string) ?? 'D';
    // D | W | M 은 대소문자 구분 없이 받고, 분봉(1m/5m/15m)은 그대로 소문자 유지
    const period = (['d', 'w', 'm'].includes(raw.toLowerCase()) ? raw.toUpperCase() : raw) as Period;
    const count = Number(req.query.count ?? 60);
    const before = req.query.before as string | undefined;

    const validPeriods: Period[] = ['D', 'W', 'M', '1m', '5m', '15m'];
    if (!validPeriods.includes(period)) {
      res.status(400).json({ error: 'period는 D | W | M | 1m | 5m | 15m 이어야 합니다.' });
      return;
    }

    try {
      const history = await adapter.getStockHistory(req.params.symbol, period, count, before);
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:symbol/orderbook', async (req: Request, res: Response) => {
    if (!adapter.getOrderbookSummary) {
      res.status(501).json({ error: `${adapter.name}는 호가 조회를 지원하지 않습니다.` });
      return;
    }
    try {
      res.json(await adapter.getOrderbookSummary(req.params.symbol));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/:symbol/buy-sell', async (req: Request, res: Response) => {
    if (!adapter.getBuySellSummary) {
      res.status(501).json({ error: `${adapter.name}는 매수/매도 추정을 지원하지 않습니다.` });
      return;
    }
    try {
      res.json(await adapter.getBuySellSummary(req.params.symbol));
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
