import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  handleAnalyze,
  handleCoach,
  handleReport,
  handleResearch,
} from './server/geminiService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '2mb' }));

app.post('/api/ai/coach', (req, res) => handleCoach(req, res));
app.post('/api/ai/analyze', (req, res) => handleAnalyze(req, res));
app.post('/api/ai/research', (req, res) => handleResearch(req, res));
app.post('/api/ai/report', (req, res) => handleReport(req, res));

async function startServer() {
  const port = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`VitalDrift server running on http://0.0.0.0:${port}`);
  });
}

startServer();
