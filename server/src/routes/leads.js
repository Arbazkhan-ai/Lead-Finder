import express from 'express';
import db from '../db.js';
import { searchLeads, scrapeWebsite, findRealEmailForLead, auditWebsite } from '../services/leadFinder.js';

const router = express.Router();

// GET /api/leads - List all leads with optional filter & search
router.get('/', (req, res) => {
  try {
    const { status, search } = req.query;
    const leads = db.getLeads({ status, search });
    res.json({ success: true, leads });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/leads/:id - Single lead with full email thread
router.get('/:id', (req, res) => {
  try {
    const lead = db.getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    const thread = db.getEmailsForLead(lead.id);
    res.json({ success: true, lead, thread });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads - Add lead manually
router.post('/', (req, res) => {
  try {
    const newLead = db.createLead(req.body);
    res.json({ success: true, lead: newLead });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/leads/:id - Update lead details / status
router.put('/:id', (req, res) => {
  try {
    const updated = db.updateLead(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }
    res.json({ success: true, lead: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/leads/:id - Delete lead
router.delete('/:id', (req, res) => {
  try {
    const success = db.deleteLead(req.params.id);
    res.json({ success });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/search - Search prospective businesses by keyword & location
router.post('/search', async (req, res) => {
  try {
    const { query, location, limit = 15 } = req.body;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query is required (e.g. "Dentists", "Marketing Agency")' });
    }
    const results = await searchLeads({ query, location, limit });
    res.json({ success: true, count: results.length, leads: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/scrape-domain - Deep scrape a single website URL
router.post('/scrape-domain', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    const scraped = await scrapeWebsite(url);
    res.json({ success: true, data: scraped });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/audit-website - Run technical & conversion weak points audit on any URL
router.post('/audit-website', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL is required' });
    }
    const audit = await auditWebsite(url);
    res.json({ success: true, audit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/:id/audit-website - Run website audit for a specific lead and save results
router.post('/:id/audit-website', async (req, res) => {
  try {
    const lead = db.getLeadById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const websiteUrl = lead.website || req.body.url;
    if (!websiteUrl) {
      return res.status(400).json({ success: false, error: `No website URL recorded for ${lead.company}` });
    }

    const audit = await auditWebsite(websiteUrl);
    const updatedLead = db.updateLead(lead.id, {
      websiteAudit: audit,
      website: lead.website || audit.url
    });

    db.logActivity('website_audited', `Audited website for ${lead.company} (Health Score: ${audit.score}/100, ${audit.weakPoints.length} weak points identified)`, {
      leadId: lead.id,
      score: audit.score,
      weakPointsCount: audit.weakPoints.length
    });

    res.json({ success: true, lead: updatedLead, audit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/find-email - Live hunter to discover real verified email for a lead
router.post('/find-email', async (req, res) => {
  try {
    const { leadId, company, website } = req.body;
    let targetCompany = company;
    let targetWebsite = website;

    let lead = null;
    if (leadId) {
      lead = db.getLeadById(leadId);
      if (lead) {
        targetCompany = targetCompany || lead.company;
        targetWebsite = targetWebsite || lead.website;
      }
    }

    const result = await findRealEmailForLead({ company: targetCompany, website: targetWebsite });

    if (result.email && leadId && lead) {
      db.updateLead(leadId, { email: result.email });
      db.logActivity('email_discovered', `Discovered real email for ${lead.company}: ${result.email} (${result.source})`, { leadId });
    }

    res.json({
      success: true,
      email: result.email,
      source: result.source,
      found: Boolean(result.email)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/leads/bulk-add - Save selected search results into the leads pipeline
router.post('/bulk-add', (req, res) => {
  try {
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of leads is required' });
    }
    const added = db.bulkAddLeads(leads);
    res.json({ success: true, count: added.length, leads: added });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
