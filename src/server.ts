import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createAdapter, BrokerageName } from './adapters/registry';
import { createStockRoutes } from './routes/stockRoutes';

const PORT = Number(process.env.PORT ?? 3000);
const brokerageName = (process.env.BROKERAGE ?? 'mock') as BrokerageName;

const adapter = createAdapter(brokerageName);

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/stocks', createStockRoutes(adapter));

const clientDist = path.join(__dirname, '..', 'client');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[${adapter.name}] 서버 실행 중: http://localhost:${PORT}`);
});
