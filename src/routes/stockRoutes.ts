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
    const period = ((req.query.period as string) ?? 'D').toUpperCase() as Period;
    const count = Number(req.query.count ?? 60);

    if (!['D', 'W', 'M'].includes(period)) {
      res.status(400).json({ error: 'period는 D | W | M 이어야 합니다.' });
      return;
    }

    try {
      const history = await adapter.getStockHistory(req.params.symbol, period, count);
      res.json(history);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
