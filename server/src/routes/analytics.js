import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET /api/analytics
router.get('/', (req, res) => {
  try {
    const stats = db.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
