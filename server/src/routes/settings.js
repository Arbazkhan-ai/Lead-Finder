import express from 'express';
import db from '../db.js';
import { verifySmtpConnection } from '../services/emailService.js';

const router = express.Router();

// GET /api/settings - Returns safe settings without exposing sensitive API keys or SMTP passwords
router.get('/', (req, res) => {
  try {
    const rawSettings = db.getSettings();
    const safeSettings = {
      ...rawSettings,
      smtp: {
        ...rawSettings.smtp,
        pass: rawSettings.smtp?.pass ? '••••••••••••••••' : '',
        hasPass: Boolean(rawSettings.smtp?.pass)
      },
      serpApiKey: rawSettings.serpApiKey ? '••••••••••••••••' : '',
      hasSerpKey: Boolean(rawSettings.serpApiKey),
      googlePlacesApiKey: rawSettings.googlePlacesApiKey ? '••••••••••••••••' : '',
      hasGooglePlacesKey: Boolean(rawSettings.googlePlacesApiKey),
      ai: {
        ...rawSettings.ai,
        apiKey: rawSettings.ai?.apiKey ? '••••••••••••••••' : '',
        hasApiKey: Boolean(rawSettings.ai?.apiKey)
      }
    };
    res.json({ success: true, settings: safeSettings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/settings - Safely updates settings while protecting masked keys
router.put('/', (req, res) => {
  try {
    const updates = req.body || {};
    const existing = db.getSettings() || {};

    // Prevent overwriting real secrets with mask string '••••••••••••••••'
    if (updates.smtp) {
      if (updates.smtp.pass === '••••••••••••••••') {
        updates.smtp.pass = existing.smtp?.pass || '';
      }
    }
    if (updates.serpApiKey === '••••••••••••••••') {
      updates.serpApiKey = existing.serpApiKey || '';
    }
    if (updates.googlePlacesApiKey === '••••••••••••••••') {
      updates.googlePlacesApiKey = existing.googlePlacesApiKey || '';
    }
    if (updates.ai?.apiKey === '••••••••••••••••') {
      updates.ai.apiKey = existing.ai?.apiKey || '';
    }

    const updated = db.updateSettings(updates);
    const safeUpdated = {
      ...updated,
      smtp: {
        ...updated.smtp,
        pass: updated.smtp?.pass ? '••••••••••••••••' : '',
        hasPass: Boolean(updated.smtp?.pass)
      },
      serpApiKey: updated.serpApiKey ? '••••••••••••••••' : '',
      hasSerpKey: Boolean(updated.serpApiKey),
      googlePlacesApiKey: updated.googlePlacesApiKey ? '••••••••••••••••' : '',
      hasGooglePlacesKey: Boolean(updated.googlePlacesApiKey),
      ai: {
        ...updated.ai,
        apiKey: updated.ai?.apiKey ? '••••••••••••••••' : '',
        hasApiKey: Boolean(updated.ai?.apiKey)
      }
    };
    res.json({ success: true, settings: safeUpdated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/settings/test-smtp - Test real SMTP credentials and send verification email
router.post('/test-smtp', async (req, res) => {
  try {
    const customSmtp = req.body?.smtp || req.body || null;
    const existing = db.getSettings()?.smtp || {};

    if (customSmtp && customSmtp.pass === '••••••••••••••••') {
      customSmtp.pass = existing.pass || '';
    }

    const result = await verifySmtpConnection(customSmtp);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;

