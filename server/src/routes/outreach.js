import express from 'express';
import db from '../db.js';
import { 
  sendEmail, 
  receiveInboundEmail, 
  autoSendOutreach, 
  autoSendReply, 
  bulkAutoSendOutreach 
} from '../services/emailService.js';
import { generateInitialOutreach, generateAiReply } from '../services/aiNegotiator.js';

const router = express.Router();

// GET /api/outreach/thread/:leadId - Get full conversation thread for a lead
router.get('/thread/:leadId', (req, res) => {
  try {
    const lead = db.getLeadById(req.params.leadId);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    const thread = db.getEmailsForLead(lead.id);
    res.json({ success: true, lead, thread });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/outreach/send - Send outbound email to lead
router.post('/send', async (req, res) => {
  try {
    const { leadId, subject, body, aiGenerated = false, toEmail = null } = req.body;
    if (!leadId || !body) {
      return res.status(400).json({ success: false, error: 'leadId and body are required' });
    }

    const email = await sendEmail({ leadId, subject, body, aiGenerated, toEmail });
    const updatedLead = db.getLeadById(leadId);
    res.json({ success: true, email, lead: updatedLead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/outreach/generate-pitch - AI drafts initial cold outreach
router.post('/generate-pitch', (req, res) => {
  try {
    const { leadId } = req.body;
    const lead = db.getLeadById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    const pitch = generateInitialOutreach({ lead });
    res.json({ success: true, pitch });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/outreach/generate-reply - AI drafts next response in current thread
router.post('/generate-reply', async (req, res) => {
  try {
    const { leadId, clientReplyText } = req.body;
    const lead = db.getLeadById(leadId);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    const thread = db.getEmailsForLead(lead.id);
    const reply = await generateAiReply({ lead, thread, clientReplyText });
    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/outreach/simulate-reply - Simulate a prospect reply and trigger autonomous closing loop
router.post('/simulate-reply', async (req, res) => {
  try {
    const { leadId, replyText, subject } = req.body;
    if (!leadId || !replyText) {
      return res.status(400).json({ success: false, error: 'leadId and replyText are required' });
    }

    const result = await receiveInboundEmail({ leadId, replyText, subject });
    const fullThread = db.getEmailsForLead(leadId);

    res.json({
      success: true,
      inboundEmail: result.inboundEmail,
      aiFollowupEmail: result.aiFollowupEmail,
      analysis: result.analysis,
      lead: result.updatedLead,
      thread: fullThread
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/outreach/auto-send - 1-Click autonomous pitch generation & send without asking
router.post('/auto-send', async (req, res) => {
  try {
    const { leadId, toEmail } = req.body;
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId is required' });
    }

    const result = await autoSendOutreach({ leadId, toEmail });
    res.json({
      success: true,
      email: result.email,
      lead: result.lead
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/outreach/auto-reply - 1-Click autonomous AI counter-reply send without asking
router.post('/auto-reply', async (req, res) => {
  try {
    const { leadId, clientReplyText } = req.body;
    if (!leadId) {
      return res.status(400).json({ success: false, error: 'leadId is required' });
    }

    const result = await autoSendReply({ leadId, clientReplyText });
    res.json({
      success: true,
      email: result.email,
      lead: result.lead
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/outreach/bulk-auto-send - Bulk autonomous send to all selected leads
router.post('/bulk-auto-send', async (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of leads is required' });
    }

    const result = await bulkAutoSendOutreach({ leads });
    res.json({
      success: true,
      count: result.count,
      sent: result.sent
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
