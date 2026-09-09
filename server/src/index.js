import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import leadsRouter from './routes/leads.js';
import outreachRouter from './routes/outreach.js';
import settingsRouter from './routes/settings.js';
import analyticsRouter from './routes/analytics.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/leads', leadsRouter);
app.use('/api/outreach', outreachRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/analytics', analyticsRouter);

// Serve built frontend statically if available
app.use(express.static(CLIENT_DIST));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'AI Lead Finder & Outreach Deal Closer',
    timestamp: new Date().toISOString()
  });
});

// Single Page Application route fallback
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(CLIENT_DIST, 'index.html'), (err) => {
    if (err) res.status(404).send('Client build not found. Run Vite dev server or npm run build.');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 AI Lead Finder Server running on http://localhost:${PORT}`);
});
