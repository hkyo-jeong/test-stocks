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
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/stocks', createStockRoutes(adapter));

app.listen(PORT, () => {
  console.log(`[${adapter.name}] 서버 실행 중: http://localhost:${PORT}`);
});
