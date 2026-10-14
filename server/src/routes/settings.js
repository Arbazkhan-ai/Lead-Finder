import express from 'express';
import db from '../db.js';
import { verifySmtpConnection } from '../services/emailService.js';

const router = express.Router();

// GET /api/settings
router.get('/', (req, res) => {
  try {
    const settings = db.getSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/settings
router.put('/', (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings/test-smtp - Test real SMTP credentials and send verification email
router.post('/test-smtp', async (req, res) => {
  try {
    const customSmtp = req.body?.smtp || req.body || null;
    const result = await verifySmtpConnection(customSmtp);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

