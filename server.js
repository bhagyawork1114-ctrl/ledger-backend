require('dotenv').config();
const express = require('express');
const cors = require('cors');

const analyzeRoute = require('./routes/analyze');
const chatRoute = require('./routes/chat');
const exportRoute = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',');

app.use(cors({ origin: ALLOWED_ORIGINS.includes('*') ? true : ALLOWED_ORIGINS }));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasKey: Boolean(process.env.ANTHROPIC_API_KEY) });
});

app.use('/api/analyze', analyzeRoute);
app.use('/api/chat', chatRoute);
app.use('/api/export-pdf', exportRoute);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Ledger backend running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠️  ANTHROPIC_API_KEY is not set — copy .env.example to .env and add your key.');
  }
});
